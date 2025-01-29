"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Mic, CheckCircle, XCircle } from "lucide-react"
import Image from "next/image"

export default function AIInterviewer() {
  const [stage, setStage] = useState<"initial" | "greeting" | "listening" | "exam" | "submitting" | "result">("initial")
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSheetLoading, setIsSheetLoading] = useState(true)
  const [resultMessage, setResultMessage] = useState("")
  const [examResult, setExamResult] = useState<"PASS" | "FAIL" | null>(null)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = "en-US"

      recognitionRef.current.onstart = () => {
        console.log("Speech recognition started")
        setIsListening(true)
      }

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase()
        console.log("Speech recognized:", transcript)
        if (stage === "greeting" || stage === "listening") {
          if (transcript.includes("yes") || transcript.includes("ready")) {
            console.log("User is ready. Moving to exam stage.")
            stopListening()
            setStage("exam")
          }
        } else if (stage === "exam") {
          if (transcript.includes("submit") || transcript.includes("finish") || transcript.includes("done")) {
            console.log("User wants to submit the exam.")
            stopListening()
            submitExam()
          }
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error)
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        console.log("Speech recognition ended")
        setIsListening(false)
        if (stage === "greeting" || stage === "listening" || stage === "exam") {
          startListening()
        }
      }
    } else {
      console.error("Speech recognition not supported in this browser")
    }
  }, [stage])

  const playAudio = async (text: string) => {
    console.log("Playing audio:", text)
    setIsLoading(true)
    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "speak", text }),
      })

      if (!response.ok) {
        throw new Error("Failed to get audio")
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      if (audioRef.current) {
        audioRef.current.src = audioUrl
        audioRef.current.play()
        audioRef.current.onended = () => {
          console.log("Audio ended. Moving to listening stage.")
          setStage("listening")
          startListening()
        }
      }
    } catch (error) {
      console.error("Error getting audio:", error)
      setVoiceError("Failed to get audio. Please try again or contact support.")
    } finally {
      setIsLoading(false)
    }
  }

  const startExam = () => {
    console.log("Starting exam")
    setStage("greeting")
    playAudio(
      "Hello! I'm your AI interviewer from Activate Talent. It's great to meet you today. I hope you're doing well. Are you ready to take the exam? Please respond with yes when you're ready.",
    )
  }

  const startListening = () => {
    if (isListening) {
      console.log("Already listening, no need to start again")
      return
    }
    console.log("Starting listening")
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (error) {
        console.error("Error starting speech recognition:", error)
        setIsListening(false)
      }
    } else {
      console.error("Speech recognition not initialized")
      setIsListening(false)
    }
  }

  const stopListening = () => {
    if (!isListening) {
      console.log("Not listening, no need to stop")
      return
    }
    console.log("Stopping listening")
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
        setIsListening(false)
      } catch (error) {
        console.error("Error stopping speech recognition:", error)
      }
    }
  }

  const submitExam = async () => {
    console.log("Submitting exam")
    setIsLoading(true)
    setStage("submitting")
    stopListening()
    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "checkAnswers" }),
      })

      if (!response.ok) {
        throw new Error("Failed to check answers")
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      // Get the exam result from the response headers
      const result = response.headers.get("X-Exam-Result")
      setExamResult(result as "PASS" | "FAIL")

      if (audioRef.current) {
        audioRef.current.src = audioUrl
        audioRef.current.play()
        audioRef.current.onended = () => {
          console.log("Result audio ended. Moving to result stage.")
          setStage("result")
        }
      }

      // Set a default result message
      setResultMessage("The interviewer will provide feedback on your spreadsheet formulas.")
    } catch (error) {
      console.error("Error checking answers:", error)
      setResultMessage(
        "We encountered an error while processing your exam. Please contact the interviewer for assistance.",
      )
      setExamResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (stage === "exam") {
      startListening()
    }
    return () => {
      if (stage !== "exam") {
        stopListening()
      }
    }
  }, [stage, startListening]) // Added startListening to dependencies

  return (
    <div className="flex h-screen">
      {/* Left side - AI Avatar */}
      <div className="w-1/3 p-4 flex flex-col items-center justify-center bg-gray-100">
        <div className="w-64 h-64 mb-4 relative">
          <Image src="/june.png" alt="AI Avatar" width={256} height={256} className="rounded-full object-cover" />
        </div>
        <h2 className="text-2xl font-bold mb-4">AI Interviewer</h2>
        {voiceError && (
          <div className="mt-4 p-2 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            <p>{voiceError}</p>
          </div>
        )}
        {stage === "initial" && (
          <Button onClick={startExam} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? "Starting..." : "Start Interview"}
          </Button>
        )}
        {(stage === "listening" || stage === "exam") && (
          <div className="flex items-center">
            <p className="mr-2">Status:</p>
            {isListening ? (
              <div className="flex items-center">
                <Mic className="h-6 w-6 text-green-500 mr-2" />
                <span className="text-green-500">Listening</span>
              </div>
            ) : (
              <span className="text-gray-500">Waiting for voice input</span>
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
            {isLoading && <Loader2 className="ml-2 h-6 w-6 animate-spin" />}
          </div>
        )}

        {stage === "listening" && (
          <div className="flex-1 flex items-center justify-center">
            <p>Please say "yes" when you're ready to begin the exam.</p>
          </div>
        )}

        {stage === "exam" && (
          <div className="flex-1 flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Spreadsheet Formula Exam</h2>
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
            <div className="mt-4 text-center">
              <p>
                Complete the spreadsheet with the correct formulas. When you're finished, say "submit", "finish", or
                "done" to complete the exam.
              </p>
            </div>
          </div>
        )}

        {stage === "submitting" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
              <h2 className="text-2xl font-bold">Processing Your Exam</h2>
              <p className="mt-2">Please wait while we analyze your responses...</p>
            </div>
          </div>
        )}

        {stage === "result" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              {examResult === "PASS" ? (
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              ) : (
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              )}
              <h2 className="text-2xl font-bold mb-4">Exam Completed</h2>
              <p className="text-lg mb-2">
                Result:{" "}
                <span className={examResult === "PASS" ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
                  {examResult}
                </span>
              </p>
              <p className="text-lg mb-4">{resultMessage}</p>
              <p className="mt-4">Thank you for participating in this interview process.</p>
              <p className="mt-4 text-sm text-gray-600">
                If you have any questions about your result or would like more information, please contact our HR
                department.
              </p>
            </div>
          </div>
        )}
      </div>

      <audio ref={audioRef} />
    </div>
  )
}

