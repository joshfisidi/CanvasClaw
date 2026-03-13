"use client"

import { useEffect, useState } from "react"
import { ModuleBoard } from "@/components/ui/module-board/ModuleBoard"
import { fetchCronJobs, type GridItem } from "@/lib/workspace-api"

export function JobsPanel() {
  const [items, setItems] = useState<GridItem[]>([])

  useEffect(() => {
    let active = true

    void fetchCronJobs().then((nextItems) => {
      if (active) setItems(nextItems)
    })

    return () => {
      active = false
    }
  }, [])

  return <ModuleBoard scope="jobs" items={items} />
}
