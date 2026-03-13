"use client"

import { useEffect, useRef, useState } from "react"
import { getDisplayScore, getRawScore } from "@/lib/inference-store"

export default function InferenceDisplay() {
  const [display, setDisplay] = useState(0)
  const [pulse, setPulse] = useState(false)
  const pulseTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const raw = getRawScore()
    setDisplay(getDisplayScore(raw))

    const handler = () => {
      const rawUpdated = getRawScore()
      setDisplay(getDisplayScore(rawUpdated))
      setPulse(true)

      if (pulseTimerRef.current) {
        window.clearTimeout(pulseTimerRef.current)
      }
      pulseTimerRef.current = window.setTimeout(() => setPulse(false), 120)
    }

    window.addEventListener("zyndrel-pet", handler)
    return () => {
      if (pulseTimerRef.current) {
        window.clearTimeout(pulseTimerRef.current)
        pulseTimerRef.current = null
      }
      window.removeEventListener("zyndrel-pet", handler)
    }
  }, [])

  return <div className={`inference-display env-glass-frame ${pulse ? "pulse" : ""}`}>{display}</div>
}
