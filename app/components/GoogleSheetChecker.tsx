"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle } from "lucide-react"

interface CheckResult {
  isCorrect: boolean
  explanation: string
}

export default function GoogleSheetChecker() {
  const [sheetUrl, setSheetUrl] = useState("")
  const [cellToCheck, setCellToCheck] = useState("")
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setCheckResult(null)

    try {
      const response = await fetch("/api/check-formula", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sheetUrl, cellToCheck }),
      })

      if (!response.ok) {
        throw new Error("Failed to check formula")
      }

      const result = await response.json()
      setCheckResult(result)
    } catch (error) {
      console.error("Error checking formula:", error)
      setCheckResult({
        isCorrect: false,
        explanation: "An error occurred while checking the formula. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sheet-url">Google Sheet URL</Label>
          <Input
            id="sheet-url"
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cell-to-check">Cell to Check (e.g., B2)</Label>
          <Input
            id="cell-to-check"
            type="text"
            placeholder="B2"
            value={cellToCheck}
            onChange={(e) => setCellToCheck(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Checking..." : "Check Formula"}
        </Button>
      </form>
      {checkResult && (
        <Alert variant={checkResult.isCorrect ? "default" : "destructive"}>
          {checkResult.isCorrect ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          <AlertTitle>{checkResult.isCorrect ? "Correct!" : "Incorrect"}</AlertTitle>
          <AlertDescription>{checkResult.explanation}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

