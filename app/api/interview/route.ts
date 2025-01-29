import { NextResponse } from "next/server"
import { google } from "googleapis"
import OpenAI from "openai"
import axios from "axios"

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

async function textToSpeech(text: string): Promise<Buffer> {
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

  return response.data
}

export async function POST(req: Request) {
  const { action } = await req.json()

  if (action === "greeting") {
    const greetingText =
      "Hello! I'm your AI interviewer from Activate Talent. It's great to meet you today. I hope you're doing well. Are you ready to take the exam? Please respond with yes when you're ready."
    const audioBuffer = await textToSpeech(greetingText)
    const audioBase64 = Buffer.from(audioBuffer).toString("base64")
    return NextResponse.json({ audioBase64 })
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
        Provide a brief response stating whether the candidate passed or not.
        Do not explain the answers or provide details about correct or incorrect responses.
      `

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      })

      const aiResponse = completion.choices[0].message?.content

      if (!aiResponse) {
        throw new Error("No response from OpenAI")
      }

      // Convert the AI response to speech
      const audioBuffer = await textToSpeech(
        aiResponse +
          " Thank you for taking the time to complete this exam. The interview is now over. Have a great day!",
      )
      const audioBase64 = Buffer.from(audioBuffer).toString("base64")

      return NextResponse.json({ audioBase64 })
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

