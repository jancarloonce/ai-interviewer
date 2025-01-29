import React from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "@/components/ui/loader"

interface LandingPageProps {
  onStartInterview: () => void
  isLoading: boolean
}

export default function LandingPage({ onStartInterview, isLoading }: LandingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-blue-100 to-white">
      <h1 className="text-4xl font-bold mb-6 text-blue-800">Welcome to AI Interviewer</h1>
      <p className="text-xl mb-8 text-center max-w-2xl text-gray-600">
        Experience a cutting-edge interview process powered by artificial intelligence. Our AI interviewer will guide
        you through a spreadsheet formula exam to assess your skills.
      </p>
      <Button
        onClick={onStartInterview}
        disabled={isLoading}
        className="px-6 py-3 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-full transition duration-300 ease-in-out transform hover:scale-105"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Starting...
          </>
        ) : (
          "Start Interview"
        )}
      </Button>
    </div>
  )
}

