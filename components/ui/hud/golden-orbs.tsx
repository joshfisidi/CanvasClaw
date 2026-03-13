import { cn } from "@/lib/utils"

type GoldenOrbsProps = {
  count?: number
  activeCount?: number
}

function clampOrbCount(value: number, max: number) {
  return Math.max(0, Math.min(max, value))
}

export function GoldenOrbs({ count = 5, activeCount = 5 }: GoldenOrbsProps) {
  const safeCount = Math.max(1, count)
  const safeActive = clampOrbCount(activeCount, safeCount)

  return (
    <div className="pt-[0.08rem]">
      <div className="flex items-center gap-[0.22rem]" aria-label="Energy orbs">
        {Array.from({ length: safeCount }).map((_, index) => {
          const isActive = index < safeActive

          return (
            <span
              key={`orb-${index}`}
              className={cn(
                "h-[clamp(0.28rem,0.25rem+0.14vw,0.38rem)] w-[clamp(0.28rem,0.25rem+0.14vw,0.38rem)] rounded-full border transition-[opacity,box-shadow,transform] duration-200",
                isActive
                  ? "border-amber-100/70 bg-[radial-gradient(circle_at_30%_28%,rgba(254,243,199,0.98),rgba(251,191,36,0.92)_52%,rgba(146,64,14,0.9))] shadow-[0_0_0_1px_rgba(251,191,36,0.34),0_0_0.5rem_rgba(245,158,11,0.45)]"
                  : "border-amber-200/24 bg-[color:rgba(108,64,20,0.5)] opacity-55"
              )}
            />
          )
        })}
      </div>
    </div>
  )
}
