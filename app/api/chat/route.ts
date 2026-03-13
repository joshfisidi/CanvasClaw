import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { NextResponse } from "next/server"

type ChatPayload = {
  message?: string
}

type SessionsResponse = {
  sessions?: Array<{
    key?: string
    sessionId?: string
  }>
}

type AgentResponse = {
  result?: {
    payloads?: Array<{
      text?: string | null
    }>
  }
}

const execFileAsync = promisify(execFile)
const OPENCLAW_BIN = process.env.OPENCLAW_BIN || "openclaw"
const DEFAULT_SESSION_KEY = process.env.OPENCLAW_CHAT_SESSION_KEY || "agent:main:main"

async function resolveSessionId() {
  const { stdout } = await execFileAsync(OPENCLAW_BIN, ["sessions", "--json"], {
    timeout: 15_000,
    maxBuffer: 4 * 1024 * 1024,
    env: process.env,
  })

  const parsed = JSON.parse(stdout) as SessionsResponse
  const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : []
  const match = sessions.find((session) => session.key === DEFAULT_SESSION_KEY && session.sessionId)

  if (!match?.sessionId) {
    throw new Error(`Session key not found: ${DEFAULT_SESSION_KEY}`)
  }

  return match.sessionId
}

async function runAgentTurn(sessionId: string, message: string) {
  const { stdout } = await execFileAsync(
    OPENCLAW_BIN,
    ["agent", "--session-id", sessionId, "--message", message, "--json"],
    {
      timeout: 90_000,
      maxBuffer: 8 * 1024 * 1024,
      env: process.env,
    }
  )

  const parsed = JSON.parse(stdout) as AgentResponse
  const payloads = parsed.result?.payloads ?? []
  const text = payloads.map((payload) => payload?.text?.trim()).filter(Boolean).join("\n\n")

  if (!text) throw new Error("Agent returned empty payload")
  return text
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as ChatPayload | null
  const message = payload?.message?.trim() ?? ""

  if (!message) {
    return NextResponse.json({ ok: false, error: "Empty message" }, { status: 400 })
  }

  try {
    const sessionId = await resolveSessionId()
    const reply = await runAgentTurn(sessionId, message)

    return NextResponse.json(
      { ok: true, reply },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  } catch (error) {
    const details = error instanceof Error ? error.message : "Agent request failed"
    return NextResponse.json(
      { ok: false, error: details },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  }
}
