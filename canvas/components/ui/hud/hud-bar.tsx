import { cn } from "@/lib/utils"

type HudBarProps = {
  label: string
  value: number
  tone: "health" | "energy"
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

export function HudBar({ label, value, tone }: HudBarProps) {
  const safeValue = clampPercent(value)
  const fillToneClass =
    tone === "health"
      ? "bg-[linear-gradient(90deg,rgba(248,113,113,0.96),rgba(220,38,38,0.94)_48%,rgba(127,29,29,0.9))]"
      : "bg-[linear-gradient(90deg,rgba(125,211,252,0.96),rgba(37,99,235,0.9)_52%,rgba(30,58,138,0.9))]"

  return (
    <div className="space-y-[0.2rem]">
      <div className="flex items-center justify-between text-[clamp(0.42rem,0.39rem+0.14vw,0.5rem)] font-semibold uppercase tracking-[0.14em] text-white/78">
        <span>{label}</span>
        <span>{safeValue}%</span>
      </div>
      <div className="h-[clamp(0.45rem,0.4rem+0.22vw,0.62rem)] rounded-full border border-[color:rgb(var(--chrome-stroke-rgb)/0.34)] bg-[color:rgb(var(--chrome-surface-rgb)/0.58)] p-[0.08rem] shadow-[inset_0_1px_0_rgb(var(--chrome-stroke-rgb)/0.18)]">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-out",
            fillToneClass,
            "shadow-[0_0_0.65rem_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.34)]"
          )}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  )
}
