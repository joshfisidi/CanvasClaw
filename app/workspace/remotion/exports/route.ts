import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { NextResponse } from "next/server"
import type { GridItem } from "@/lib/grid-item"

export const dynamic = "force-dynamic"
export const revalidate = 0

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v", ".ogv"])

function getVideoOutCandidates() {
  return [
    process.env.OPENCLAW_VIDEO_OUT_DIR,
    path.join(process.cwd(), "out"),
    path.join(process.cwd(), "..", "out"),
    path.join(process.cwd(), "..", "workspace", "video-engine", "out"),
    path.join(process.cwd(), "..", "workspace", "remotion-video", "out"),
    path.join(os.homedir(), ".openclaw", "out"),
    path.join(os.homedir(), ".openclaw", "workspace", "video-engine", "out"),
    path.join(os.homedir(), ".openclaw", "workspace", "remotion-video", "out"),
  ].filter(Boolean) as string[]
}

async function resolveVideoOutDir() {
  for (const candidate of getVideoOutCandidates()) {
    try {
      const stats = await fs.stat(candidate)
      if (stats.isDirectory()) {
        return path.resolve(candidate)
      }
    } catch {
      continue
    }
  }

  return null
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "Unknown size"
  if (bytes < 1024) return `${bytes} B`

  const units = ["KB", "MB", "GB", "TB"]
  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unitIndex]}`
}

async function listVideoFiles(videoDir: string): Promise<GridItem[]> {
  let names: string[]
  try {
    names = await fs.readdir(videoDir)
  } catch {
    return []
  }

  const entries: GridItem[] = []

  for (const name of names) {
    const ext = path.extname(name).toLowerCase()
    if (!VIDEO_EXTENSIONS.has(ext)) continue

    const filePath = path.join(videoDir, name)

    let stats
    try {
      stats = await fs.stat(filePath)
    } catch {
      continue
    }

    if (!stats.isFile()) continue

    entries.push({
      id: name,
      title: path.basename(name, ext),
      subtitle: `${ext.replace(".", "").toUpperCase()} · ${formatFileSize(stats.size)}`,
      kind: "media",
      href: `/workspace/file?kind=remotion-export&path=${encodeURIComponent(name)}`,
      meta: {
        fileName: name,
        ext,
        bytes: stats.size,
      },
      updatedAt: stats.mtime ? stats.mtime.toISOString() : undefined,
    })
  }

  entries.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
  return entries
}

export async function GET() {
  const source = await resolveVideoOutDir()
  const items = source ? await listVideoFiles(source) : []

  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  )
}
