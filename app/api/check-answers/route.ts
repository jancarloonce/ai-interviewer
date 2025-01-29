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
  const { sheetUrl } = await req.json()

  try {
    // Extract sheet ID from URL
    const match = sheetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (!match || !match[1]) {
      return NextResponse.json({ error: "Invalid Google Sheet URL" }, { status: 400 })
    }
    const sheetId = match[1]

    // Authenticate with Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: GOOGLE_SERVICE_ACCOUNT_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })
    const sheets = google.sheets({ version: "v4", auth })

    // Fetch the entire sheet content
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "A1:Z1000", // Adjust this range as needed
      })

      const sheetContent = response.data.values

      if (!sheetContent) {
        return NextResponse.json({ error: "Failed to fetch sheet content" }, { status: 400 })
      }

      // Convert sheet content to a string representation
      const sheetString = sheetContent.map((row) => row.join("\t")).join("\n")

      // Use OpenAI to analyze the sheet content and check the answers
      const prompt = `
        You are an AI assistant tasked with evaluating a student's work in a Google Sheet.
        Below is the content of the sheet, where each row is separated by a new line and each cell by a tab:

        ${sheetString}

        Please analyze the content, identify the problem or task presented, and evaluate the student's work.
        Provide feedback on whether the answers are correct and offer explanations or suggestions for improvement.
      `

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
        })

        const aiResponse = completion.choices[0].message?.content

        if (!aiResponse) {
          throw new Error("No response from OpenAI")
        }

        // Convert the entire AI response to speech
        const audioBuffer = await textToSpeech(aiResponse)

        // Convert the audio buffer to base64
        const audioBase64 = Buffer.from(audioBuffer).toString("base64")

        return NextResponse.json({
          response: aiResponse,
          audioBase64,
        })
      } catch (error: any) {
        console.error("OpenAI API Error:", error.message)
        if (error.response) {
          console.error("OpenAI API response:", error.response.data)
        }
        return NextResponse.json({ error: "Failed to process with OpenAI", details: error.message }, { status: 500 })
      }
    } catch (error: any) {
      console.error("Google Sheets API Error:", error.message)
      if (error.errors) {
        console.error("Detailed errors:", JSON.stringify(error.errors, null, 2))
      }
      return NextResponse.json({ error: "Failed to fetch sheet content", details: error.message }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Error:", error)
    return NextResponse.json(
      { error: "An error occurred while checking the answers", details: error.message },
      { status: 500 },
    )
  }
}

