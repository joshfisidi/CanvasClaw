"use client"

import { useEffect, useState } from "react"
import { ModuleBoard } from "@/components/ui/module-board/ModuleBoard"
import { fetchInboundFiles, type GridItem } from "@/lib/workspace-api"

export function FilesPanel() {
  const [items, setItems] = useState<GridItem[]>([])

  useEffect(() => {
    let active = true

    void fetchInboundFiles().then((nextItems) => {
      if (active) setItems(nextItems)
    })

    return () => {
      active = false
    }
  }, [])

  return <ModuleBoard scope="files" items={items} />
}
