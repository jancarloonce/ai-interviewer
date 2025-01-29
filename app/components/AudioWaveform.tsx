"use client"

import type React from "react"
import { useEffect, useRef } from "react"

interface AudioWaveformProps {
  isPlaying: boolean
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({ isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.beginPath()
      ctx.moveTo(0, canvas.height / 2)

      for (let i = 0; i < canvas.width; i++) {
        const amplitude = isPlaying ? Math.random() * 50 : 5
        const y = Math.sin(i * 0.05) * amplitude + canvas.height / 2
        ctx.lineTo(i, y)
      }

      ctx.strokeStyle = "#000000" // Black color
      ctx.lineWidth = 2
      ctx.stroke()

      animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [isPlaying])

  return <canvas ref={canvasRef} width={256} height={256} className="rounded-full" />
}

export default AudioWaveform

