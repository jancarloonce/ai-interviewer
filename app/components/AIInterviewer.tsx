"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Mic } from "lucide-react"
import Image from "next/image"

export default function AIInterviewer() {
  const [stage, setStage] = useState<"initial" | "greeting" | "listening" | "exam" | "result">("initial")
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSheetLoading, setIsSheetLoading] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.lang = "en-US"
      recognitionRef.current.interimResults = false
      recognitionRef.current.maxAlternatives = 1

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase()
        console.log("Speech recognized:", transcript)
        if (transcript.includes("yes") || transcript.includes("ready")) {
          console.log("User is ready. Moving to exam stage.")
          setStage("exam")
        } else {
          console.log("User is not ready. Asking again.")
          playAudio("I'm sorry, I didn't catch that. Please say yes when you're ready to begin the exam.")
        }
        setIsListening(false)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error)
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        console.log("Speech recognition ended")
        setIsListening(false)
      }
    } else {
      console.error("Speech recognition not supported in this browser")
    }
  }, [])

  const playAudio = (text: string) => {
    console.log("Playing audio:", text)
    setIsLoading(true)
    fetch("/api/interview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "greeting", text }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to get audio")
        }
        return response.json()
      })
      .then(({ audioBase64 }) => {
        if (audioRef.current) {
          audioRef.current.src = `data:audio/mpeg;base64,${audioBase64}`
          audioRef.current.play()
          audioRef.current.onended = () => {
            console.log("Audio ended. Moving to listening stage.")
            setStage("listening")
            startListening()
          }
        }
      })
      .catch((error) => {
        console.error("Error getting audio:", error)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  const startExam = () => {
    console.log("Starting exam")
    setStage("greeting")
    playAudio(
      "Hello! I'm your AI interviewer from Activate Talent. It's great to meet you today. I hope you're doing well. Are you ready to take the exam? Please respond with yes when you're ready.",
    )
  }

  const startListening = () => {
    console.log("Starting listening")
    setIsListening(true)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
      } catch (error) {
        console.error("Error starting speech recognition:", error)
        setIsListening(false)
      }
    } else {
      console.error("Speech recognition not initialized")
      setIsListening(false)
    }
  }

  const submitExam = () => {
    console.log("Submitting exam")
    setIsLoading(true)
    fetch("/api/interview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "checkAnswers" }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to check answers")
        }
        return response.json()
      })
      .then(({ audioBase64 }) => {
        if (audioRef.current) {
          audioRef.current.src = `data:audio/mpeg;base64,${audioBase64}`
          audioRef.current.play()
          audioRef.current.onended = () => {
            console.log("Result audio ended. Moving to result stage.")
            setStage("result")
          }
        }
      })
      .catch((error) => {
        console.error("Error checking answers:", error)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  return (
    <div className="flex h-screen">
      {/* Left side - AI Avatar */}
      <div className="w-1/3 p-4 flex flex-col items-center justify-center bg-gray-100">
        <div className="relative w-64 h-64 mb-4">
          <Image src="/placeholder.svg" alt="AI Avatar" layout="fill" objectFit="cover" className="rounded-full" />
        </div>
        <h2 className="text-2xl font-bold mb-4">AI Interviewer</h2>
        {stage === "initial" && (
          <Button onClick={startExam} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? "Starting..." : "Start Interview"}
          </Button>
        )}
        {stage === "listening" && (
          <div className="flex items-center">
            <p className="mr-2">Listening:</p>
            {isListening ? (
              <Mic className="h-8 w-8 text-green-500 animate-pulse" />
            ) : (
              <Button onClick={startListening}>Speak</Button>
            )}
          </div>
        )}
      </div>

      {/* Right side - Exam Area */}
      <div className="w-2/3 p-4 flex flex-col">
        {stage === "initial" && (
          <div className="flex-1 flex items-center justify-center">
            <h2 className="text-2xl font-bold">Welcome to your AI Interview</h2>
          </div>
        )}

        {stage === "greeting" && (
          <div className="flex-1 flex items-center justify-center">
            <h2 className="text-2xl font-bold">AI Interviewer is speaking</h2>
          </div>
        )}

        {stage === "listening" && (
          <div className="flex-1 flex items-center justify-center">
            <p>Please say "yes" when you're ready to begin the exam.</p>
          </div>
        )}

        {stage === "exam" && (
          <div className="flex-1 flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Candidate Exam</h2>
            <div className="relative flex-1">
              {isSheetLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
              <iframe
                src="https://docs.google.com/spreadsheets/d/1UQkuSlYqaBqobS5-TTFrqxTKx_efMjAeFH1mSzcpi0c/edit?gid=0#gid=0"
                className="w-full h-full border-none"
                allowFullScreen
                onLoad={() => setIsSheetLoading(false)}
              />
            </div>
            <Button onClick={submitExam} disabled={isLoading} className="mt-4">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? "Submitting..." : "Submit Exam"}
            </Button>
          </div>
        )}

        {stage === "result" && (
          <div className="flex-1 flex items-center justify-center">
            <div>
              <h2 className="text-2xl font-bold mb-4">Thank you for completing the exam</h2>
              <p>The interview is now over. You may close this window.</p>
            </div>
          </div>
        )}
      </div>

      <audio ref={audioRef} />
    </div>
  )
}

