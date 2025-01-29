import { NextResponse } from "next/server"
import { google } from "googleapis"
import OpenAI from "openai"
import axios from "axios"
import { TextToSpeechClient } from "@google-cloud/text-to-speech"

const GOOGLE_SERVICE_ACCOUNT_KEY = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}")
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ""
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ""

if (!OPENAI_API_KEY) {
  console.error("OpenAI API key is not set. Please check your .env.local file.")
}

if (!ELEVENLABS_API_KEY) {
  console.error("ElevenLabs API key is not set. Please check your .env.local file.")
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

// Initialize Google Cloud Text-to-Speech client
const googleTTSClient = new TextToSpeechClient({ credentials: GOOGLE_SERVICE_ACCOUNT_KEY })

async function textToSpeech(text: string): Promise<{ audioBase64: string | null; source: string }> {
  // Try ElevenLabs first
  try {
    const response = await axios({
      method: "POST",
      url: "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
      headers: {
        Accept: "audio/mpeg",
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      data: {
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      },
      responseType: "arraybuffer",
    })

    return { audioBase64: Buffer.from(response.data).toString("base64"), source: "elevenlabs" }
  } catch (error) {
    console.error("Error in ElevenLabs textToSpeech:", error)
  }

  // If ElevenLabs fails, try Google Cloud Text-to-Speech
  try {
    const [googleResponse] = await googleTTSClient.synthesizeSpeech({
      input: { text },
      voice: { languageCode: "en-US", ssmlGender: "FEMALE" },
      audioConfig: { audioEncoding: "MP3" },
    })

    if (googleResponse.audioContent) {
      return { audioBase64: googleResponse.audioContent.toString("base64"), source: "google" }
    }
  } catch (error) {
    console.error("Error in Google Cloud textToSpeech:", error)
  }

  // If both fail, return null
  return { audioBase64: null, source: "none" }
}

export async function POST(req: Request) {
  const { action, text } = await req.json()

  if (action === "greeting" || action === "speak") {
    const speechText =
      text ||
      "Hello! I'm your AI interviewer from Activate Talent. It's great to meet you today. I hope you're doing well. Are you ready to take the exam? Please respond with yes when you're ready."
    const { audioBase64, source } = await textToSpeech(speechText)
    return NextResponse.json({ audioBase64, text: speechText, source })
  }

  if (action === "checkAnswers") {
    const sheetId = "1UQkuSlYqaBqobS5-TTFrqxTKx_efMjAeFH1mSzcpi0c"

    try {
      // Authenticate with Google Sheets API
      const auth = new google.auth.GoogleAuth({
        credentials: GOOGLE_SERVICE_ACCOUNT_KEY,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      })
      const sheets = google.sheets({ version: "v4", auth })

      // Fetch the sheet content
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "A1:Z1000",
      })

      const sheetContent = response.data.values

      if (!sheetContent) {
        return NextResponse.json({ error: "Failed to fetch sheet content" }, { status: 400 })
      }

      // Convert sheet content to a string representation
      const sheetString = sheetContent.map((row) => row.join("\t")).join("\n")

      // Use OpenAI to analyze the answers
      const prompt = `
        You are an AI interviewer evaluating a candidate's exam.
        Below is the content of the exam sheet, where each row is separated by a new line and each cell by a tab:

        ${sheetString}

        Analyze the answers and determine if the candidate passed the exam.
        Provide a clear result (PASS or FAIL) followed by a friendly and encouraging response to the candidate.
        If they failed, include a brief 2-sentence explanation of why they didn't pass and what the correct approach or answer should have been.
        Keep the response concise and maintain a positive tone throughout.
        Do not mention specific scores or individual answers.
        
        Format your response as follows:
        RESULT: [PASS/FAIL]
        MESSAGE: [Your encouraging message here]
        FEEDBACK: [Only if FAIL: Brief 2-sentence explanation of why they didn't pass and what the correct approach or answer should have been]
      `

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      })

      const aiResponse = completion.choices[0].message?.content

      if (!aiResponse) {
        throw new Error("No response from OpenAI")
      }

      const [resultLine, messageLine, feedbackLine] = aiResponse.split("\n")
      const result = resultLine.split(": ")[1]
      const message = messageLine.split(": ")[1]
      const feedback = feedbackLine?.split(": ")[1] || ""

      const finalResponse = `${message} ${feedback} Thank you for participating in this interview process. We appreciate your time and effort. Have a great day!`

      // Convert the AI response to speech
      const { audioBase64, source } = await textToSpeech(finalResponse)

      return NextResponse.json({ audioBase64, text: finalResponse, source, result, feedback })
    } catch (error: any) {
      console.error("Error:", error)
      return NextResponse.json(
        { error: "An error occurred while checking the answers", details: error.message },
        { status: 500 },
      )
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}

