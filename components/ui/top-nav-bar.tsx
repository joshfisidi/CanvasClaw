"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Activity, Settings2 } from "lucide-react"
import { TopNavActionButton } from "@/components/ui/top-nav-action-button"
import { TopNavStats, type IslandPresentation, type IslandStatus } from "@/components/ui/top-nav-stats"

type CronJobState = {
  running?: boolean
  isRunning?: boolean
  status?: string
  lastStatus?: string
  lastRunAt?: string
  lastRunAtMs?: number
  lastExitCode?: number
}

type CronJob = {
  id?: string
  meta?: {
    skill?: string
  }
  state?: CronJobState
}

type CronPayload = {
  jobs?: CronJob[]
}

type IslandContext = {
  status: IslandStatus
  title: string
  subtitle: string
  runningCount: number
}

function isRunningState(state?: CronJobState) {
  if (!state) return false
  return Boolean(state.running || state.isRunning || state.status === "running")
}

function jobLabel(job?: CronJob) {
  return job?.meta?.skill || job?.id || "No Active Job"
}

function parseMs(dateText?: string) {
  if (!dateText) return 0
  const parsed = Date.parse(dateText)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseRunAtMs(state?: CronJobState) {
  if (!state) return 0
  if (typeof state.lastRunAtMs === "number" && Number.isFinite(state.lastRunAtMs)) return state.lastRunAtMs
  return parseMs(state.lastRunAt)
}

function isSuccessfulCompletion(state?: CronJobState) {
  if (!state) return true
  if (typeof state.lastExitCode === "number") return state.lastExitCode === 0

  const normalized = (state.lastStatus || state.status || "").toLowerCase()
  if (normalized === "error" || normalized === "failed" || normalized === "fail") return false
  return true
}

function formatAge(ms: number) {
  if (ms < 6000) return "just now"
  if (ms < 60000) return `${Math.round(ms / 1000)}s ago`
  if (ms < 3600000) return `${Math.round(ms / 60000)}m ago`
  return `${Math.round(ms / 3600000)}h ago`
}

function deriveIslandContext(jobs: CronJob[]): IslandContext {
  const now = Date.now()
  const runningJobs = jobs.filter((job) => isRunningState(job.state))
  const runningCount = runningJobs.length

  if (runningCount > 0) {
    const current = runningJobs[0]
    return {
      status: "running",
      title: jobLabel(current),
      subtitle: runningCount > 1 ? `${runningCount} jobs running` : "Running now",
      runningCount,
    }
  }

  const completed = jobs
    .map((job) => ({ job, lastRunAtMs: parseRunAtMs(job.state), ok: isSuccessfulCompletion(job.state) }))
    .filter((item) => item.lastRunAtMs > 0)
    .sort((a, b) => b.lastRunAtMs - a.lastRunAtMs)

  const latest = completed[0]
  if (latest && now - latest.lastRunAtMs <= 120000) {
    const age = formatAge(now - latest.lastRunAtMs)

    return {
      status: latest.ok ? "success" : "error",
      title: jobLabel(latest.job),
      subtitle: latest.ok ? `Completed ${age}` : `Failed ${age}`,
      runningCount: 0,
    }
  }

  return {
    status: "idle",
    title: "Zyndrel Standby",
    subtitle: "Monitoring cron activity",
    runningCount: 0,
  }
}

export function TopNavBar() {
  const [context, setContext] = useState<IslandContext>({
    status: "idle",
    title: "Zyndrel Standby",
    subtitle: "Monitoring cron activity",
    runningCount: 0,
  })
  const [presentation, setPresentation] = useState<IslandPresentation>("minimal")
  const [manualExpandUntil, setManualExpandUntil] = useState<number>(() => Date.now() + 2400)
  const [interacting, setInteracting] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(1200)

  const holdTimerRef = useRef<number | null>(null)
  const lastStatusRef = useRef<IslandStatus>("idle")
  const streamRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const stream = new EventSource("/api/cron/jobs/stream")
    streamRef.current = stream

    stream.addEventListener("jobs", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as CronPayload
        const jobs = Array.isArray(payload?.jobs) ? payload.jobs : []
        const nextContext = deriveIslandContext(jobs)
        setContext(nextContext)

        if (lastStatusRef.current !== nextContext.status) {
          const durationMs =
            nextContext.status === "running"
              ? 2600
              : nextContext.status === "success"
                ? 3200
                : nextContext.status === "error"
                  ? 4400
                  : 1200

          setManualExpandUntil(Date.now() + durationMs)
          lastStatusRef.current = nextContext.status
        }
      } catch {
        // Ignore malformed stream messages and wait for the next signal.
      }
    })

    return () => {
      stream.close()
      if (streamRef.current === stream) {
        streamRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const updateWidth = () => setViewportWidth(window.innerWidth)
    updateWidth()
    window.addEventListener("resize", updateWidth)
    return () => window.removeEventListener("resize", updateWidth)
  }, [])

  useEffect(() => {
    const tick = window.setInterval(() => {
      const now = Date.now()

      const nextPresentation: IslandPresentation =
        interacting || now < manualExpandUntil
          ? "expanded"
          : context.runningCount > 1
            ? "minimal"
            : context.status === "idle"
              ? "minimal"
              : "compact"

      setPresentation((prev) => (prev === nextPresentation ? prev : nextPresentation))
    }, 160)

    return () => window.clearInterval(tick)
  }, [context.runningCount, context.status, interacting, manualExpandUntil])

  const sizePreset = useMemo(() => {
    const horizontalPadding = viewportWidth >= 640 ? 32 : 24
    const controlsWidth = 96
    const availableWidth = Math.max(viewportWidth - horizontalPadding - controlsWidth, 156)

    if (presentation === "minimal") return { width: Math.min(188, availableWidth), height: 40, radius: 999 }
    if (presentation === "compact") return { width: Math.min(320, availableWidth), height: 48, radius: 999 }
    return { width: Math.min(560, availableWidth), height: 76, radius: 30 }
  }, [presentation, viewportWidth])

  const islandStyle = useMemo(() => {
    const y = presentation === "minimal" ? -1 : 0
    const scale = presentation === "expanded" ? 1 : presentation === "minimal" ? 0.97 : 0.99

    return {
      width: `${sizePreset.width}px`,
      height: `${sizePreset.height}px`,
      borderRadius: `${sizePreset.radius}px`,
      transform: `translateY(${y}px) scale(${scale})`,
      transition:
        "width 420ms cubic-bezier(0.22, 1, 0.36, 1), height 420ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 420ms cubic-bezier(0.22, 1, 0.36, 1), transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
    } as const
  }, [presentation, sizePreset.height, sizePreset.radius, sizePreset.width])

  const leftStyle = useMemo(() => {
    const scale = presentation === "minimal" ? 0.92 : 1
    const opacity = presentation === "expanded" ? 1 : 0.9
    const y = presentation === "expanded" ? 0 : -1
    const x = presentation === "expanded" ? 0 : presentation === "minimal" ? 2 : 1

    return {
      transform: `translate(${x}px, ${y}px) scale(${scale})`,
      opacity,
      transition: "transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease-out",
    } as const
  }, [presentation])

  const rightStyle = useMemo(() => {
    const scale = presentation === "minimal" ? 0.92 : 1
    const opacity = presentation === "expanded" ? 1 : 0.9
    const y = presentation === "expanded" ? 0 : -1
    const x = presentation === "expanded" ? 0 : presentation === "minimal" ? -2 : -1

    return {
      transform: `translate(${x}px, ${y}px) scale(${scale})`,
      opacity,
      transition: "transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease-out",
    } as const
  }, [presentation])

  const beginPress = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current)
    }

    holdTimerRef.current = window.setTimeout(() => {
      setManualExpandUntil(Date.now() + 3600)
    }, 220)
  }

  const endPress = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        window.clearTimeout(holdTimerRef.current)
        holdTimerRef.current = null
      }
      streamRef.current?.close()
      streamRef.current = null
    }
  }, [])

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-[max(env(safe-area-inset-top),0.6rem)] sm:px-4">
      <nav className="pointer-events-auto flex items-start justify-between gap-2">
        <div className="pt-0.5" style={leftStyle}>
          <TopNavActionButton
            icon={Activity}
            label="Open Skills"
            active={presentation === "expanded"}
            onClick={() => window.open("/workspace/skills", "_blank", "noopener,noreferrer")}
          />
        </div>

        <div
          className="mx-auto flex min-w-0 shrink items-center justify-center overflow-hidden"
          style={islandStyle}
          onMouseEnter={() => setInteracting(true)}
          onMouseLeave={() => setInteracting(false)}
          onFocusCapture={() => setInteracting(true)}
          onBlurCapture={() => setInteracting(false)}
          onPointerDown={beginPress}
          onPointerUp={endPress}
          onPointerCancel={endPress}
          onClick={() => setManualExpandUntil(Date.now() + 3000)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              setManualExpandUntil(Date.now() + 3000)
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Dynamic top activity island"
        >
          <TopNavStats
            className="h-full w-full"
            presentation={presentation}
            status={context.status}
            title={context.title}
            subtitle={context.subtitle}
            runningCount={context.runningCount}
          />
        </div>

        <div className="pt-0.5" style={rightStyle}>
          <TopNavActionButton
            icon={Settings2}
            label="Open Cron Jobs"
            active={context.status !== "idle"}
            onClick={() => window.open("/cron/jobs.json", "_blank", "noopener,noreferrer")}
          />
        </div>
      </nav>
    </header>
  )
}
