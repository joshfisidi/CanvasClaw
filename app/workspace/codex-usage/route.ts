import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

const DEFAULT_MAX_TOKENS = 100_000

type UsageSnapshot = {
  sessionKey: string
  updatedAtMs: number
  inputTokens?: number
  outputTokens?: number
  totalTokens: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function asFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function resolveSessionsIndexCandidates() {
  const stateDir = process.env.OPENCLAW_STATE_DIR

  return [
    process.env.OPENCLAW_SESSIONS_INDEX,
    stateDir ? path.join(stateDir, "agents", "main", "sessions", "sessions.json") : null,
    path.join(os.homedir(), ".openclaw", "agents", "main", "sessions", "sessions.json"),
    path.join(process.cwd(), "..", "agents", "main", "sessions", "sessions.json"),
    path.join(process.cwd(), "agents", "main", "sessions", "sessions.json"),
  ].filter(Boolean) as string[]
}

async function resolveFirstExistingFile(candidates: string[]) {
  for (const candidate of candidates) {
    try {
      const stats = await fs.stat(candidate)
      if (stats.isFile()) return path.resolve(candidate)
    } catch {
      continue
    }
  }

  return null
}

function parseLatestUsageSnapshot(payload: string): UsageSnapshot | null {
  let parsed: unknown

  try {
    parsed = JSON.parse(payload)
  } catch {
    return null
  }

  if (!isRecord(parsed)) return null

  const preferred = parsed["agent:main:main"]
  if (isRecord(preferred)) {
    const totalTokens = asFiniteNumber(preferred.totalTokens)
    if (totalTokens !== undefined) {
      return {
        sessionKey: "agent:main:main",
        updatedAtMs: asFiniteNumber(preferred.updatedAt) || 0,
        inputTokens: asFiniteNumber(preferred.inputTokens),
        outputTokens: asFiniteNumber(preferred.outputTokens),
        totalTokens,
      }
    }
  }

  let latest: UsageSnapshot | null = null

  for (const [sessionKey, entry] of Object.entries(parsed)) {
    if (!isRecord(entry)) continue

    const totalTokens = asFiniteNumber(entry.totalTokens)
    if (totalTokens === undefined) continue

    const updatedAtMs = asFiniteNumber(entry.updatedAt) || 0
    if (!latest || updatedAtMs >= latest.updatedAtMs) {
      latest = {
        sessionKey,
        updatedAtMs,
        inputTokens: asFiniteNumber(entry.inputTokens),
        outputTokens: asFiniteNumber(entry.outputTokens),
        totalTokens,
      }
    }
  }

  return latest
}

function resolveMaxTokens() {
  const fromEnv = Number.parseInt(process.env.OPENCLAW_HEALTH_MAX_TOKENS || "", 10)
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv
  return DEFAULT_MAX_TOKENS
}

function toHealth(totalTokens: number, maxTokens: number) {
  const normalizedUsage = Math.min(Math.max(totalTokens, 0) / maxTokens, 1)
  return Math.round((1 - normalizedUsage) * 100)
}

export async function GET() {
  const source = await resolveFirstExistingFile(resolveSessionsIndexCandidates())

  if (!source) {
    return NextResponse.json(
      { ok: false, error: "Session index not found" },
      { status: 404, headers: { "Cache-Control": "no-store, max-age=0" } }
    )
  }

  let payload = ""
  try {
    payload = await fs.readFile(source, "utf8")
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to read session index" },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    )
  }

  const snapshot = parseLatestUsageSnapshot(payload)
  if (!snapshot) {
    return NextResponse.json(
      { ok: false, error: "No usage snapshot available" },
      { status: 404, headers: { "Cache-Control": "no-store, max-age=0" } }
    )
  }

  const maxTokens = resolveMaxTokens()

  return NextResponse.json(
    {
      ok: true,
      sessionKey: snapshot.sessionKey,
      updatedAtMs: snapshot.updatedAtMs,
      inputTokens: snapshot.inputTokens,
      outputTokens: snapshot.outputTokens,
      totalTokens: snapshot.totalTokens,
      maxTokens,
      health: toHealth(snapshot.totalTokens, maxTokens),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  )
}
