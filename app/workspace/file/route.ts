import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

type FileKind = "inbound" | "media" | "remotion-export"

function getMediaInboundCandidates() {
  const mediaRoot = process.env.OPENCLAW_MEDIA_DIR
  return [
    process.env.OPENCLAW_MEDIA_INBOUND_DIR,
    mediaRoot ? path.join(mediaRoot, "inbound") : null,
    path.join(process.cwd(), "media", "inbound"),
    path.join(process.cwd(), "..", "media", "inbound"),
    path.join(process.cwd(), "..", "workspace", ".openclaw", "media", "inbound"),
    path.join(os.homedir(), ".openclaw", "media", "inbound"),
  ].filter(Boolean) as string[]
}

function getMediaRootCandidates() {
  return [
    process.env.OPENCLAW_MEDIA_DIR,
    path.join(process.cwd(), "media"),
    path.join(process.cwd(), "..", "media"),
    path.join(process.cwd(), "..", "workspace", ".openclaw", "media"),
    path.join(os.homedir(), ".openclaw", "media"),
  ].filter(Boolean) as string[]
}

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

function sanitizeRelativePath(value: string) {
  const parts = value
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)

  if (!parts.length) return null
  if (parts.some((part) => part === "." || part === "..")) return null
  return parts.join("/")
}

function resolveMimeType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase()
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg"
    case ".png":
      return "image/png"
    case ".webp":
      return "image/webp"
    case ".gif":
      return "image/gif"
    case ".svg":
      return "image/svg+xml"
    case ".mp4":
      return "video/mp4"
    case ".webm":
      return "video/webm"
    case ".mov":
      return "video/quicktime"
    case ".m4v":
      return "video/x-m4v"
    case ".json":
      return "application/json"
    case ".txt":
    case ".log":
      return "text/plain; charset=utf-8"
    default:
      return "application/octet-stream"
  }
}

async function resolveBaseDir(kind: FileKind) {
  if (kind === "inbound") {
    return resolveFirstExistingDir(getMediaInboundCandidates())
  }
  if (kind === "media") {
    return resolveFirstExistingDir(getMediaRootCandidates())
  }
  return resolveFirstExistingDir(getVideoOutCandidates())
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const kind = url.searchParams.get("kind")
  const filePath = url.searchParams.get("path")
  const asDownload = url.searchParams.get("download") === "1"

  if ((kind !== "inbound" && kind !== "media" && kind !== "remotion-export") || !filePath) {
    return NextResponse.json({ error: "Invalid file request." }, { status: 400 })
  }

  const safePath = sanitizeRelativePath(filePath)
  if (!safePath) {
    return NextResponse.json({ error: "Invalid file path." }, { status: 400 })
  }

  const baseDir = await resolveBaseDir(kind)
  if (!baseDir) {
    return NextResponse.json({ error: "File source unavailable." }, { status: 404 })
  }

  const absolutePath = path.resolve(baseDir, safePath)
  const expectedPrefix = `${baseDir}${path.sep}`
  if (absolutePath !== baseDir && !absolutePath.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: "Path traversal blocked." }, { status: 400 })
  }

  let fileStats
  try {
    fileStats = await fs.stat(absolutePath)
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 })
  }

  if (!fileStats.isFile()) {
    return NextResponse.json({ error: "Requested path is not a file." }, { status: 404 })
  }

  const content = await fs.readFile(absolutePath)
  const fileName = path.basename(absolutePath)

  return new Response(content, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": resolveMimeType(fileName),
      "Content-Length": String(fileStats.size),
      "Content-Disposition": `${asDownload ? "attachment" : "inline"}; filename=\"${encodeURIComponent(fileName)}\"`,
    },
  })
}
