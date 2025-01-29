"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Volume2, Loader2 } from "lucide-react"

interface CheckResult {
  response: string
  audioBase64: string
}

export default function GoogleSheetQuiz() {
  const [sheetUrl, setSheetUrl] = useState("")
  const [embeddedUrl, setEmbeddedUrl] = useState("")
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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

  const handleCheckAnswers = async () => {
    setIsLoading(true)
    setCheckResult(null)

    try {
      const response = await fetch("/api/check-answers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sheetUrl }),
      })

      if (!response.ok) {
        throw new Error("Failed to check answers")
      }

      const result = await response.json()
      setCheckResult(result)
    } catch (error) {
      console.error("Error checking answers:", error)
      alert("An error occurred while checking the answers. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const playAudio = () => {
    if (checkResult?.audioBase64 && audioRef.current) {
      audioRef.current.src = `data:audio/mpeg;base64,${checkResult.audioBase64}`
      audioRef.current.play()
      setIsPlaying(true)
      audioRef.current.onended = () => setIsPlaying(false)
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
        <div className="space-y-4">
          <div className="aspect-[16/9]">
            <iframe src={embeddedUrl} className="w-full h-full border-none" allowFullScreen />
          </div>
          <Button onClick={handleCheckAnswers} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? "Checking..." : "Check Answers"}
          </Button>
        </div>
      )}

      {checkResult && (
        <Alert>
          <AlertTitle className="flex items-center justify-between">
            AI Feedback
            <Button variant="outline" size="icon" onClick={playAudio} disabled={isPlaying}>
              {isPlaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{checkResult.response}</AlertDescription>
        </Alert>
      )}

      <audio ref={audioRef} />
    </div>
  )
}

