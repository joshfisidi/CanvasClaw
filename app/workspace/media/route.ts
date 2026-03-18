import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { NextResponse } from "next/server"
import type { GridItem } from "@/lib/grid-item"

export const dynamic = "force-dynamic"
export const revalidate = 0

const MEDIA_LIST_DEPTH = Number.parseInt(process.env.OPENCLAW_MEDIA_LIST_DEPTH || "3", 10)

function getMediaRootCandidates() {
  return [
    process.env.OPENCLAW_MEDIA_DIR,
    path.join(process.cwd(), "media"),
    path.join(process.cwd(), "..", "media"),
    path.join(process.cwd(), "..", "workspace", ".openclaw", "media"),
    path.join(os.homedir(), ".openclaw", "media"),
  ].filter(Boolean) as string[]
}

function getInboundCandidates(mediaRoot?: string | null) {
  return [
    process.env.OPENCLAW_MEDIA_INBOUND_DIR,
    mediaRoot ? path.join(mediaRoot, "inbound") : null,
    path.join(process.cwd(), "media", "inbound"),
    path.join(process.cwd(), "..", "media", "inbound"),
    path.join(process.cwd(), "..", "workspace", ".openclaw", "media", "inbound"),
    path.join(os.homedir(), ".openclaw", "media", "inbound"),
  ].filter(Boolean) as string[]
}

async function resolveFirstExistingDir(candidates: string[]) {
  for (const candidate of candidates) {
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

function formatExt(ext: string) {
  if (!ext) return "File"
  return ext.slice(1).toUpperCase()
}

async function listMediaEntries(mediaDir: string, fileKind: "inbound" | "media"): Promise<GridItem[]> {
  const safeDepth = Number.isFinite(MEDIA_LIST_DEPTH) ? Math.max(0, Math.min(8, MEDIA_LIST_DEPTH)) : 3
  const entries: GridItem[] = []

  async function walk(relativeDir: string, depth: number): Promise<void> {
    if (depth > safeDepth) return

    const absoluteDir = relativeDir ? path.join(mediaDir, relativeDir) : mediaDir
    let dirEntries

    try {
      dirEntries = await fs.readdir(absoluteDir, { withFileTypes: true })
    } catch {
      return
    }

    dirEntries.sort((a, b) => a.name.localeCompare(b.name))

    for (const item of dirEntries) {
      if (!item || item.name.startsWith(".")) continue

      const relativePath = relativeDir ? `${relativeDir}/${item.name}` : item.name
      const absolutePath = path.join(mediaDir, relativePath)

      let stats
      try {
        stats = await fs.stat(absolutePath)
      } catch {
        continue
      }

      if (stats.isDirectory()) {
        await walk(relativePath, depth + 1)
        continue
      }

      if (!stats.isFile()) continue

      entries.push({
        id: relativePath,
        title: item.name,
        subtitle: `${formatExt(path.extname(item.name).toLowerCase())} · ${formatFileSize(stats.size)}`,
        kind: "file",
        href: `/workspace/file?kind=${fileKind}&path=${encodeURIComponent(relativePath)}`,
        meta: {
          relativePath,
          bytes: stats.size,
          ext: path.extname(item.name).toLowerCase(),
        },
        updatedAt: stats.mtime ? stats.mtime.toISOString() : undefined,
      })
    }
  }

  await walk("", 0)
  entries.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
  return entries
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const scope = url.searchParams.get("scope")
  const mediaRoot = await resolveFirstExistingDir(getMediaRootCandidates())
  const useInboundSource = scope === "inbound"
  const source = useInboundSource ? await resolveFirstExistingDir(getInboundCandidates(mediaRoot)) : mediaRoot
  const items = source ? await listMediaEntries(source, useInboundSource ? "inbound" : "media") : []

  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  )
}
