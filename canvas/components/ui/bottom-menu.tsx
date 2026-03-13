"use client"

import { Button } from "@/components/ui/button"
import { BottomNavModalHost } from "@/components/ui/bottom-nav/modals"
import { ZyndrelControlPanel } from "@/components/ui/bottom-nav/control-panel"
import { BOTTOM_NAV_ITEMS } from "@/components/ui/bottom-nav/items"
import { usePanelStore } from "@/lib/panel-store"
import { cn } from "@/lib/utils"

export function BottomMenu({ className }: { className?: string }) {
  const active = usePanelStore((state) => state.active)
  const open = usePanelStore((state) => state.open)

  return (
    <nav
      aria-label="Workspace navigation"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),0.7rem)] sm:px-4",
        className
      )}
    >
      <div className="mx-auto w-full max-w-[620px]">
        <ZyndrelControlPanel />
        <div
          className={cn(
            "rounded-[22px] p-2",
            "env-glass-frame"
          )}
        >
          <div className="grid grid-cols-4 gap-2">
            {BOTTOM_NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = active === item.id

              return (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  className={cn(
                    "h-14 rounded-xl px-2 text-white",
                    "flex flex-col items-center justify-center gap-1",
                    "env-glass-button transition-[background-color,border-color,color,box-shadow] duration-200 ease-out",
                    isActive ? "env-glass-button-active text-sky-100" : "text-white/84"
                  )}
                  onClick={() => open(item.id)}
                  aria-label={item.label}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[11px] font-medium leading-none">{item.shortLabel}</span>
                </Button>
              )
            })}
          </div>
        </div>
      </div>

      <BottomNavModalHost />
    </nav>
  )
}
