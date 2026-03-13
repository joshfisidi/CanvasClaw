"use client"

import type { GridItem, GridKind } from "@/lib/grid-item"

function isGridKind(value: unknown): value is GridKind {
  return value === "skill" || value === "media" || value === "file" || value === "job"
}

function normalizeItem(value: unknown): GridItem | null {
  if (!value || typeof value !== "object") return null
  const item = value as Record<string, unknown>
  if (typeof item.id !== "string" || typeof item.title !== "string" || !isGridKind(item.kind)) {
    return null
  }

  return {
    id: item.id,
    title: item.title,
    subtitle: typeof item.subtitle === "string" ? item.subtitle : undefined,
    kind: item.kind,
    href: typeof item.href === "string" ? item.href : undefined,
    meta: item.meta && typeof item.meta === "object" ? (item.meta as Record<string, unknown>) : undefined,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : undefined,
  }
}

async function fetchItems(url: string): Promise<GridItem[]> {
  try {
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) return []

    const payload = (await response.json()) as { items?: unknown[] } | null
    if (!payload || !Array.isArray(payload.items)) return []

    return payload.items
      .map(normalizeItem)
      .filter((item): item is GridItem => item !== null)
  } catch {
    return []
  }
}

export async function fetchSkills(): Promise<GridItem[]> {
  return fetchItems("/workspace/skills")
}

export async function fetchMediaExports(): Promise<GridItem[]> {
  return fetchItems("/workspace/remotion/exports")
}

export async function fetchInboundFiles(): Promise<GridItem[]> {
  return fetchItems("/workspace/media?scope=inbound")
}

export async function fetchCronJobs(): Promise<GridItem[]> {
  return fetchItems("/workspace/cron")
}

export type { GridItem }
