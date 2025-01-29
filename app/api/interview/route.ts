import { NextResponse } from "next/server"
import OpenAI from "openai"
import axios from "axios"
import { google } from "googleapis"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ""
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ""
const GOOGLE_SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || ""

if (!OPENAI_API_KEY) {
  console.error("OpenAI API key is not set. Please check your .env.local file.")
}

if (!ELEVENLABS_API_KEY) {
  console.error("ElevenLabs API key is not set. Please check your .env.local file.")
}

if (!GOOGLE_SERVICE_ACCOUNT_KEY) {
  console.error("Google Service Account key is not set. Please check your .env.local file.")
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

async function textToSpeech(text: string): Promise<{ audioContent: ArrayBuffer | null; error?: string }> {
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

    return { audioContent: response.data }
  } catch (error) {
    console.error("Error in ElevenLabs textToSpeech:", error)
    return { audioContent: null, error: "Failed to generate speech" }
  }
}

export async function POST(req: Request) {
  const { action, text } = await req.json()

  if (action === "greeting" || action === "speak") {
    const speechText =
      text ||
      "Hello! I'm your AI interviewer from Activate Talent. It's great to meet you today. I hope you're doing well. Are you ready to take the exam? Please respond with yes when you're ready."
    const { audioContent, error } = await textToSpeech(speechText)

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return new NextResponse(audioContent, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    })
  }

  if (action === "checkAnswers") {
    const sheetId = "1UQkuSlYqaBqobS5-TTFrqxTKx_efMjAeFH1mSzcpi0c"

    try {
      // Authenticate with Google Sheets API
      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY),
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      })
      const sheets = google.sheets({ version: "v4", auth })

      // Fetch the sheet content
      const response = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
        ranges: [],
        includeGridData: true,
      })

      const sheetData = response.data.sheets?.[0].data?.[0].rowData

      if (!sheetData) {
        return NextResponse.json({ error: "Failed to fetch sheet content" }, { status: 400 })
      }

      // Extract formulas and values
      const formulasAndValues = sheetData.map((row: any) =>
        row.values?.map((cell: any) => ({
          formula: cell.userEnteredValue?.formulaValue,
          value: cell.formattedValue,
        })),
      )

      // Use OpenAI to analyze the formulas
      const prompt = `
        You are an AI evaluator checking the correctness of formulas in a spreadsheet exam.
        Below is the content of the exam sheet, where each cell contains its formula (if any) and its computed value:

        ${JSON.stringify(formulasAndValues, null, 2)}

        Analyze the formulas and determine if they are correct for their intended purpose.
        Provide a clear result (PASS or FAIL) followed by a brief explanation.
        If there are errors, mention which cells have issues without giving away the correct formula.
        
        Format your response as follows:
        RESULT: [PASS/FAIL]
        EXPLANATION: [Your brief explanation here]
      `

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      })

      const aiResponse = completion.choices[0].message?.content

      if (!aiResponse) {
        throw new Error("No response from OpenAI")
      }

      const [resultLine, explanationLine] = aiResponse.split("\n")
      const result = resultLine.split(": ")[1]
      const explanation = explanationLine.split(": ")[1]

      const finalResponse = `${explanation} Thank you for completing this spreadsheet exam. We appreciate your effort.`

      // Convert the AI response to speech
      const { audioContent, error } = await textToSpeech(finalResponse)

      if (error) {
        return NextResponse.json({ error }, { status: 500 })
      }

      // Add result to response headers
      const headers = new Headers({
        "Content-Type": "audio/mpeg",
        "X-Exam-Result": result,
      })

      return new NextResponse(audioContent, { headers })
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

