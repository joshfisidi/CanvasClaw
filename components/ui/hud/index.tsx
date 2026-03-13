"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { EnergyBar } from "./energy-bar"
import { GoldenOrbs } from "./golden-orbs"
import { HealthBar } from "./health-bar"
import InferenceDisplay from "./inference-display"

type HudProps = {
  className?: string
  health?: number
  energy?: number
  activeOrbs?: number
}

type CodexUsageResponse = {
  ok?: boolean
  health?: number
}

const CODEX_USAGE_REFRESH_INTERVAL_MS = 10 * 60 * 1000

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function HUD({ className, health = 78, energy = 64, activeOrbs = 5 }: HudProps) {
  const [tokenDrivenHealth, setTokenDrivenHealth] = useState(() => clampPercent(health))

  useEffect(() => {
    setTokenDrivenHealth(clampPercent(health))
  }, [health])

  useEffect(() => {
    let isMounted = true

    const syncHealthFromCodexUsage = async () => {
      try {
        const response = await fetch("/workspace/codex-usage", { cache: "no-store" })
        if (!response.ok) return

        const payload = (await response.json()) as CodexUsageResponse
        if (!isMounted || !payload?.ok || typeof payload.health !== "number") return
        setTokenDrivenHealth(clampPercent(payload.health))
      } catch {
        // Keep the previous health value when usage telemetry is unavailable.
      }
    }

    syncHealthFromCodexUsage()
    const intervalId = window.setInterval(syncHealthFromCodexUsage, CODEX_USAGE_REFRESH_INTERVAL_MS)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  return (
    <>
      <aside
        aria-label="Heads-up display"
        className={cn(
          "pointer-events-none fixed left-3 top-[calc(max(env(safe-area-inset-top),0.6rem)+5.5rem)] z-[35] w-[min(clamp(8.75rem,24vw,10.25rem),calc(100vw-1.5rem))] sm:left-4",
          className
        )}
      >
        <div className="rounded-[0.95rem] p-[0.4rem] env-glass-frame">
          <div className="space-y-[0.4rem]">
            <HealthBar value={tokenDrivenHealth} />
            <div className="space-y-[0.24rem]">
              <EnergyBar value={energy} />
              <GoldenOrbs count={5} activeCount={activeOrbs} />
            </div>
          </div>
        </div>
      </aside>
      <InferenceDisplay />
    </>
  )
}
