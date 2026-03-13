"use client"

import { useEffect, useState } from "react"
import { ModuleBoard } from "@/components/ui/module-board/ModuleBoard"
import { fetchMediaExports, type GridItem } from "@/lib/workspace-api"

export function MediaPanel() {
  const [items, setItems] = useState<GridItem[]>([])

  useEffect(() => {
    let active = true

    void fetchMediaExports().then((nextItems) => {
      if (active) setItems(nextItems)
    })

    return () => {
      active = false
    }
  }, [])

  return <ModuleBoard scope="media" items={items} />
}
