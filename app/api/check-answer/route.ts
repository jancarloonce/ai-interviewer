import { NextResponse } from "next/server"
import { google } from "googleapis"
import OpenAI from "openai"

const GOOGLE_SERVICE_ACCOUNT_KEY = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}")
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ""

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

export async function POST(req: Request) {
  const { sheetUrl, cellToCheck } = await req.json()

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

    // Fetch the problem statement (assuming it's in cell A1)
    const problemResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "A1",
    })

    const problemStatement = problemResponse.data.values?.[0]?.[0]

    // Fetch the user's answer
    const answerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: cellToCheck,
    })

    const userAnswer = answerResponse.data.values?.[0]?.[0]

    if (!userAnswer) {
      return NextResponse.json({ error: "Answer cell is empty" }, { status: 400 })
    }

    // Use OpenAI to check the answer
    const prompt = `
      Problem: ${problemStatement}
      User's answer in cell ${cellToCheck}: ${userAnswer}
      
      Is this answer correct for solving the problem? If not, what's wrong with it?
      Provide a brief explanation of your reasoning.
      
      Response format:
      {
        "isCorrect": boolean,
        "explanation": "Your explanation here"
      }
    `

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    })

    const aiResponse = completion.choices[0].message?.content

    if (!aiResponse) {
      throw new Error("No response from OpenAI")
    }

    return NextResponse.json(JSON.parse(aiResponse))
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "An error occurred while checking the answer" }, { status: 500 })
  }
}

