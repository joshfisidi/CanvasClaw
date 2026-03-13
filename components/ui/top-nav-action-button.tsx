"use client"

import type { ComponentType } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TopNavActionButtonProps {
  icon: ComponentType<{ className?: string }>
  label: string
  onClick?: () => void
  active?: boolean
  className?: string
}

export function TopNavActionButton({
  icon: Icon,
  label,
  onClick,
  active,
  className,
}: TopNavActionButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn(
        "h-10 w-10 rounded-full text-white env-glass-icon-button",
        "hover:bg-[color:rgb(var(--chrome-highlight-rgb)/0.24)] hover:text-white",
        active ? "env-glass-button-active text-sky-100" : "",
        className
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </Button>
  )
}
