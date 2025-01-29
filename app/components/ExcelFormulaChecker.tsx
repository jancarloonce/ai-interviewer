"use client"

import React, { useState, useCallback } from "react"
import Spreadsheet from "react-spreadsheet"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle } from "lucide-react"

type Cell = {
  value: string
}

type Question = {
  cell: string
  expectedFormula: string
  description: string
}

const questions: Question[] = [
  { cell: "B1", expectedFormula: "=A1*2", description: "Double the value in A1" },
  { cell: "B2", expectedFormula: "=SUM(A1:A2)", description: "Sum the values in A1 and A2" },
]

export default function ExcelFormulaChecker() {
  const [data, setData] = useState<Cell[][]>([
    [{ value: "10" }, { value: "" }],
    [{ value: "20" }, { value: "" }],
  ])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null)

  const handleChange = useCallback((newData: Cell[][]) => {
    setData(newData)
  }, [])

  const checkFormula = () => {
    const question = questions[currentQuestion]
    const [col, row] = question.cell.split("")
    const colIndex = col.charCodeAt(0) - 65
    const rowIndex = Number.parseInt(row) - 1
    const cellValue = data[rowIndex][colIndex].value

    if (cellValue.toLowerCase() === question.expectedFormula.toLowerCase()) {
      setResult("correct")
    } else {
      setResult("incorrect")
    }
  }

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setResult(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-100 p-4 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Question {currentQuestion + 1}:</h2>
        <p>{questions[currentQuestion].description}</p>
        <p className="text-sm text-gray-600 mt-1">Enter your formula in cell {questions[currentQuestion].cell}</p>
      </div>
      <Spreadsheet data={data} onChange={handleChange} />
      <div className="flex space-x-2">
        <Button onClick={checkFormula}>Check Formula</Button>
        <Button onClick={nextQuestion} disabled={currentQuestion >= questions.length - 1}>
          Next Question
        </Button>
      </div>
      {result && (
        <Alert variant={result === "correct" ? "default" : "destructive"}>
          {result === "correct" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          <AlertTitle>{result === "correct" ? "Correct!" : "Incorrect"}</AlertTitle>
          <AlertDescription>
            {result === "correct"
              ? "Great job! Your formula is correct."
              : `Try again. The expected formula is: ${questions[currentQuestion].expectedFormula}`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

