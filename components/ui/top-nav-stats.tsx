"use client"

import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export type IslandPresentation = "minimal" | "compact" | "expanded"
export type IslandStatus = "idle" | "running" | "success" | "error"

interface TopNavStatsProps {
  presentation: IslandPresentation
  status: IslandStatus
  title: string
  subtitle: string
  runningCount: number
  className?: string
}

export function TopNavStats({
  presentation,
  status,
  title,
  subtitle,
  runningCount,
  className,
}: TopNavStatsProps) {
  const StatusIcon =
    status === "running"
      ? LoaderCircle
      : status === "success"
        ? CheckCircle2
        : status === "error"
          ? AlertTriangle
          : Clock3

  const statusTone =
    status === "running"
      ? "text-sky-300"
      : status === "success"
        ? "text-emerald-300"
        : status === "error"
          ? "text-rose-300"
          : "text-white/80"

  if (presentation === "minimal") {
    return (
      <div
        className={cn(
          "pointer-events-auto flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-full px-3 text-white env-glass-pill",
          className
        )}
      >
        <StatusIcon className={cn("h-3.5 w-3.5", statusTone, status === "running" ? "animate-spin" : "")} />
        <p className="text-xs font-medium tracking-wide">{title}</p>
        {runningCount > 1 ? (
          <span className="rounded-full bg-white/14 px-2 py-0.5 text-[10px] font-semibold leading-none">
            +{runningCount - 1}
          </span>
        ) : null}
      </div>
    )
  }

  if (presentation === "compact") {
    return (
      <div
        className={cn(
          "pointer-events-auto flex h-12 w-full min-w-0 items-center justify-between rounded-full px-4 text-white env-glass-pill",
          className
        )}
      >
        <div className="min-w-0">
          <p className="truncate text-[10px] uppercase tracking-[0.14em] text-white/62">Live Activity</p>
          <p className="truncate text-sm font-semibold">{title}</p>
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-1.5">
          <StatusIcon className={cn("h-3.5 w-3.5", statusTone, status === "running" ? "animate-spin" : "")} />
          <span className={cn("text-xs font-medium", statusTone)}>{subtitle}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "pointer-events-auto w-full min-w-0 rounded-[1.65rem] px-4 py-3 text-white env-glass-frame-soft",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] uppercase tracking-[0.14em] text-white/62">Live Activity</p>
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="truncate text-xs text-white/72">{subtitle}</p>
        </div>
        <StatusIcon className={cn("mt-0.5 h-4 w-4 shrink-0", statusTone, status === "running" ? "animate-spin" : "")} />
      </div>
    </div>
  )
}
