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

export default function GoogleSheetEmbed() {
  const [sheetUrl, setSheetUrl] = useState("")
  const [cellToCheck, setCellToCheck] = useState("")
  const [embeddedUrl, setEmbeddedUrl] = useState("")
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleEmbed = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (sheetUrl) {
      const match = sheetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
      if (match && match[1]) {
        const sheetId = match[1]
        const embedUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit?usp=sharing&embedded=true`
        setEmbeddedUrl(embedUrl)
      } else {
        alert("Invalid Google Sheet URL. Please check and try again.")
      }
    }
  }

  const handleCheckFormula = async () => {
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
      <form onSubmit={handleEmbed} className="space-y-2">
        <Label htmlFor="sheet-url">Google Sheet URL</Label>
        <div className="flex space-x-2">
          <Input
            id="sheet-url"
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            required
          />
          <Button type="submit">Embed</Button>
        </div>
      </form>

      {embeddedUrl && (
        <div className="aspect-[16/9]">
          <iframe src={embeddedUrl} className="w-full h-full border-none" allowFullScreen />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="cell-to-check">Cell to Check (e.g., B2)</Label>
        <div className="flex space-x-2">
          <Input
            id="cell-to-check"
            type="text"
            placeholder="B2"
            value={cellToCheck}
            onChange={(e) => setCellToCheck(e.target.value)}
          />
          <Button onClick={handleCheckFormula} disabled={isLoading || !embeddedUrl}>
            {isLoading ? "Checking..." : "Check Formula"}
          </Button>
        </div>
      </div>

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

