"use client"

import type { ReactNode } from "react"
import type { BottomNavItem } from "@/components/ui/bottom-nav/items"
import { FilesPanel } from "@/components/ui/panels/FilesPanel"
import { JobsPanel } from "@/components/ui/panels/JobsPanel"
import { MediaPanel } from "@/components/ui/panels/MediaPanel"
import { SkillsPanel } from "@/components/ui/panels/SkillsPanel"

export function renderPanel(item: BottomNavItem, _onClose: () => void): ReactNode {
  switch (item.id) {
    case "media-received":
      return <FilesPanel />
    case "remotion-exports":
      return <MediaPanel />
    case "current-cron-jobs":
      return <JobsPanel />
    case "current-skills":
      return <SkillsPanel />
    default:
      return null
  }
}
