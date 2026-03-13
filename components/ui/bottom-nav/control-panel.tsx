"use client"

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react"
import { Aperture, Bot, Radar, Sparkles, Workflow, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePanelStore } from "@/lib/panel-store"
import { cn } from "@/lib/utils"

type TriggerSkillId =
  | "inbox-triage"
  | "daily-planning"
  | "media-pipeline"
  | "ops-watch"

type ControlSkill = {
  id: TriggerSkillId
  label: string
  caption: string
  icon: ComponentType<{ className?: string }>
}

const CONTROL_SKILLS: ControlSkill[] = [
  {
    id: "inbox-triage",
    label: "Inbox Triage",
    caption: "Distill email signals",
    icon: Radar,
  },
  {
    id: "daily-planning",
    label: "Daily Plan",
    caption: "Generate action queue",
    icon: Workflow,
  },
  {
    id: "media-pipeline",
    label: "Media Pipeline",
    caption: "Process fresh assets",
    icon: Aperture,
  },
  {
    id: "ops-watch",
    label: "Ops Watch",
    caption: "Run systems check",
    icon: Bot,
  },
]

type TriggerState = {
  status: "idle" | "running" | "ok" | "error"
  skillId: TriggerSkillId | null
  note: string
}

type TriggerApiSuccess = {
  ok: true
  status: "queued"
  requestId: string
  skillId: TriggerSkillId
  queuedAt: string
  runAt?: string
}

type TriggerApiError = {
  ok?: false
  error?: string
  details?: string
}

const INITIAL_STATE: TriggerState = {
  status: "idle",
  skillId: null,
  note: "Ready",
}

export function ZyndrelControlPanel() {
  const setDirectControlOpen = usePanelStore((state) => state.setDirectControlOpen)
  const [isSubmitting, setIsSubmitting] = useState<TriggerSkillId | null>(null)
  const [state, setState] = useState<TriggerState>(INITIAL_STATE)
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    setDirectControlOpen(isOpen)
    return () => setDirectControlOpen(false)
  }, [isOpen, setDirectControlOpen])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (panelRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      setIsOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    window.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      window.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  const statusTone = useMemo(() => {
    if (state.status === "ok") return "text-emerald-200 border-emerald-200/35 bg-emerald-400/10"
    if (state.status === "error") return "text-rose-200 border-rose-200/35 bg-rose-500/10"
    if (state.status === "running") {
      return "text-amber-100 border-amber-100/42 bg-amber-400/14"
    }
    return "text-amber-50/90 border-amber-200/30 bg-[color:rgba(92,56,18,0.42)]"
  }, [state.status])

  const triggerSkill = async (skillId: TriggerSkillId) => {
    setIsSubmitting(skillId)
    setState({
      status: "running",
      skillId,
      note: `Triggering ${CONTROL_SKILLS.find((skill) => skill.id === skillId)?.label || "skill"}...`,
    })

    try {
      const response = await fetch("/api/skills/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ skillId }),
      })

      let responseBody: TriggerApiSuccess | TriggerApiError | null = null
      try {
        responseBody = (await response.json()) as TriggerApiSuccess | TriggerApiError
      } catch {
        responseBody = null
      }

      if (!response.ok) {
        const responseError =
          responseBody && (!("ok" in responseBody) || responseBody.ok !== true)
            ? (responseBody as TriggerApiError)
            : null

        setState({
          status: "error",
          skillId,
          note: responseError?.details || responseError?.error || "Trigger failed",
        })
        return
      }

      const requestId =
        responseBody && "requestId" in responseBody && typeof responseBody.requestId === "string"
          ? responseBody.requestId
          : ""

      setState({
        status: "ok",
        skillId,
        note: requestId ? `Queued ${requestId.slice(0, 8)}` : "Queued for execution",
      })
    } catch {
      setState({
        status: "error",
        skillId,
        note: "Connection issue",
      })
    } finally {
      setIsSubmitting(null)
    }
  }

  return (
    <div className="pointer-events-none fixed left-3 z-[56] bottom-[calc(max(env(safe-area-inset-bottom),0.7rem)+5.15rem)] sm:left-4">
      <section
        ref={panelRef}
        id="zyndrel-control-center-panel"
        aria-label="Zyndrel direct control panel"
        className={cn(
          "pointer-events-auto absolute bottom-[0.35rem] left-0 z-[56] w-[min(430px,calc(100vw-1.5rem))] origin-bottom-left transition-all duration-300 ease-out",
          isOpen ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-2 scale-[0.97] opacity-0"
        )}
      >
        <div className="relative max-h-[min(62vh,380px)] overflow-auto rounded-[24px] border border-amber-200/38 bg-[linear-gradient(160deg,rgba(55,31,10,0.84),rgba(29,16,7,0.72)),radial-gradient(circle_at_86%_8%,rgba(251,191,36,0.24),transparent_56%)] p-3 shadow-[0_14px_34px_rgba(0,0,0,0.48),0_0_0_1px_rgba(251,191,36,0.2),inset_0_1px_0_rgba(255,232,179,0.2)] backdrop-blur-[16px]">
          <div className="pointer-events-none absolute inset-0 opacity-80 [background:radial-gradient(circle_at_20%_0%,rgba(251,191,36,0.22),transparent_48%),radial-gradient(circle_at_80%_100%,rgba(217,119,6,0.2),transparent_44%)]" />
          <div className="pointer-events-none absolute inset-0 [background:linear-gradient(120deg,transparent_0%,rgba(255,235,188,0.08)_24%,transparent_45%)]" />

          <div className="relative flex items-start justify-between gap-3 pb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-amber-100/90">Zyndrel Direct Control</p>
              <p className="pt-1 text-xs text-amber-50/78">One-tap execution for core autonomy routines</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide", statusTone)}>
                {state.skillId ? `${state.note}` : "Ready"}
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-full border border-amber-200/26 bg-[color:rgba(83,46,14,0.44)] text-amber-50/86 hover:bg-[color:rgba(127,73,21,0.56)] hover:text-amber-50"
                aria-label="Collapse control center"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="relative grid grid-cols-2 gap-2">
            {CONTROL_SKILLS.map((skill) => {
              const Icon = skill.icon
              const active = state.skillId === skill.id
              const pending = isSubmitting === skill.id

              return (
                <Button
                  key={skill.id}
                  type="button"
                  variant="ghost"
                  className={cn(
                    "group h-16 rounded-xl px-3 text-left text-amber-50",
                    "justify-start gap-2.5 border border-amber-200/24 bg-[color:rgba(57,31,11,0.55)] shadow-[inset_0_1px_0_rgba(255,230,168,0.12)]",
                    "transition-[transform,background-color,border-color] duration-200 ease-out",
                    "active:scale-[0.98] hover:border-amber-100/40 hover:bg-[color:rgba(93,53,18,0.62)]",
                    active
                      ? "border-amber-100/58 bg-[color:rgba(156,93,24,0.48)] text-amber-100 shadow-[0_0_0_1px_rgba(251,191,36,0.3),inset_0_1px_0_rgba(255,238,194,0.28)]"
                      : "text-amber-50/92"
                  )}
                  onClick={() => void triggerSkill(skill.id)}
                  disabled={Boolean(isSubmitting)}
                  aria-label={skill.label}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200/36 bg-[color:rgba(117,68,20,0.42)] text-amber-100">
                    <Icon className={cn("h-4 w-4", pending ? "animate-pulse" : "")} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold leading-tight">{skill.label}</p>
                    <p className="truncate pt-0.5 text-[10px] text-amber-50/72">{skill.caption}</p>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>
      </section>

      <Button
        ref={triggerRef}
        type="button"
        size="icon"
        variant="ghost"
        className={cn(
          "pointer-events-auto relative z-[58] h-14 w-14 rounded-full p-0 text-amber-50 transition-[transform,opacity,box-shadow,background-color,border-color] duration-220 ease-out",
          "border border-amber-200/46",
          "bg-[radial-gradient(circle_at_28%_18%,rgba(251,191,36,0.34),rgba(133,77,14,0.38)_54%,rgba(26,14,7,0.84)_100%)]",
          "shadow-[0_14px_34px_rgba(0,0,0,0.46),0_0_0_1px_rgba(251,191,36,0.25),0_0_26px_rgba(245,158,11,0.28),inset_0_1px_0_rgba(255,234,190,0.36)]",
          "backdrop-blur-[14px]",
          isOpen
            ? "pointer-events-none scale-90 opacity-0 border-amber-100/60 shadow-[0_14px_34px_rgba(0,0,0,0.46),0_0_0_1px_rgba(254,240,138,0.3),0_0_32px_rgba(245,158,11,0.32),inset_0_1px_0_rgba(255,244,214,0.44)]"
            : "scale-100 opacity-100 hover:scale-[1.02] hover:border-amber-100/58 hover:shadow-[0_16px_34px_rgba(0,0,0,0.48),0_0_0_1px_rgba(251,191,36,0.3),0_0_34px_rgba(245,158,11,0.3),inset_0_1px_0_rgba(255,237,197,0.42)]"
        )}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="zyndrel-control-center-panel"
        aria-label={isOpen ? "Collapse Zyndrel control center" : "Open Zyndrel control center"}
      >
        <div className="relative flex h-full w-full items-center justify-center">
          <Sparkles className={cn("h-5 w-5 transition-transform duration-200", isOpen ? "scale-95" : "scale-100")} />
          <span className="pointer-events-none absolute inset-[7px] rounded-full border border-amber-100/25" />
        </div>
      </Button>
    </div>
  )
}
