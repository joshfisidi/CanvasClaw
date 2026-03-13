import type { ComponentType } from "react"
import { FileVideo2, Files, FolderOutput, ListChecks } from "lucide-react"

export type BottomNavItemId = "media-received" | "remotion-exports" | "current-cron-jobs" | "current-skills"

export type BottomNavItem = {
  id: BottomNavItemId
  label: string
  shortLabel: string
  description: string
  href: string
  glyph: string
  icon: ComponentType<{ className?: string }>
}

export const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  {
    id: "media-received",
    label: "Files Received",
    shortLabel: "Files",
    description: "Open incoming media list",
    href: "/workspace/media",
    glyph: "F",
    icon: Files,
  },
  {
    id: "remotion-exports",
    label: "Remotion Media",
    shortLabel: "Media",
    description: "Open exported video files",
    href: "/workspace/remotion/exports",
    glyph: "M",
    icon: FileVideo2,
  },
  {
    id: "current-cron-jobs",
    label: "Current Jobs",
    shortLabel: "Jobs",
    description: "Review active and queued cron jobs",
    href: "/cron/jobs.json",
    glyph: "J",
    icon: ListChecks,
  },
  {
    id: "current-skills",
    label: "Current Skills",
    shortLabel: "Skills",
    description: "View installed and available skills",
    href: "/workspace/skills",
    glyph: "S",
    icon: FolderOutput,
  },
]

export function getBottomNavItemById(id: BottomNavItemId) {
  return BOTTOM_NAV_ITEMS.find((item) => item.id === id) ?? null
}
