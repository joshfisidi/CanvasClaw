import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { NextResponse } from "next/server"

const ALLOWED_SKILLS = [
  "inbox-triage",
  "daily-planning",
  "media-pipeline",
  "ops-watch",
] as const

type SkillTriggerId = (typeof ALLOWED_SKILLS)[number]

type TriggerPayload = {
  skillId?: unknown
}

type TriggerJobResponse = {
  id: string
  agentId: string
  name: string
  description?: string
  enabled: boolean
  notify?: boolean
  deleteAfterRun?: boolean
  createdAtMs: number
  updatedAtMs: number
  schedule: {
    kind: "at"
    at: string
  }
  sessionTarget: "main"
  wakeMode: "now"
  payload: {
    kind: "systemEvent"
    text: string
  }
  meta: {
    source?: string
    skill: SkillTriggerId
    requestedAt?: string
  }
  state?: Record<string, unknown>
}

const execFileAsync = promisify(execFile)
const OPENCLAW_BIN = process.env.OPENCLAW_BIN || "openclaw"

const SKILL_PROMPTS: Record<SkillTriggerId, { name: string; instruction: string }> = {
  "inbox-triage": {
    name: "Inbox Triage",
    instruction:
      "Run inbox triage now. Review recent inbound messages, extract urgent action items, and produce a concise prioritized queue with due times and owners.",
  },
  "daily-planning": {
    name: "Daily Plan",
    instruction:
      "Generate the current daily execution plan now. Use known priorities and active commitments to create a short ordered action queue for today.",
  },
  "media-pipeline": {
    name: "Media Pipeline",
    instruction:
      "Run the media pipeline now. Scan recent inbound media, process pending assets, and summarize outputs with any blocking errors that need attention.",
  },
  "ops-watch": {
    name: "Ops Watch",
    instruction:
      "Run an operations check now. Inspect current automation health, cron/run signals, and surface any failures or anomalies with immediate remediation steps.",
  },
}

function isSkillTriggerId(value: unknown): value is SkillTriggerId {
  return typeof value === "string" && ALLOWED_SKILLS.includes(value as SkillTriggerId)
}

function buildSkillTriggerCommand(skillId: SkillTriggerId) {
  const nowMs = Date.now()
  const runAtIso = new Date(nowMs + 15_000).toISOString()
  const skillMeta = SKILL_PROMPTS[skillId]
  const name = `Direct Control · ${skillMeta.name}`
  const description = "One-shot action triggered from the Zyndrel direct-control panel."

  return {
    runAtIso,
    name,
    args: [
      "cron",
      "add",
      "--json",
      "--name",
      name,
      "--description",
      description,
      "--agent",
      "main",
      "--session",
      "main",
      "--wake",
      "now",
      "--at",
      runAtIso,
      "--system-event",
      skillMeta.instruction,
      "--delete-after-run",
    ],
  }
}

function getErrorDetails(error: unknown) {
  if (error && typeof error === "object") {
    const candidate = error as { stderr?: unknown; message?: unknown }
    if (typeof candidate.stderr === "string" && candidate.stderr.trim()) return candidate.stderr
    if (typeof candidate.message === "string" && candidate.message.trim()) return candidate.message
  }

  return String(error)
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function POST(request: Request) {
  let payload: TriggerPayload | null = null

  try {
    payload = (await request.json()) as TriggerPayload
  } catch {
    payload = null
  }

  const skillId = payload?.skillId
  if (!isSkillTriggerId(skillId)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid skill id",
        allowedSkills: ALLOWED_SKILLS,
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  }

  try {
    const command = buildSkillTriggerCommand(skillId)
    const { stdout } = await execFileAsync(OPENCLAW_BIN, command.args, {
      timeout: 15_000,
      maxBuffer: 2 * 1024 * 1024,
      env: process.env,
    })
    const triggerJob = JSON.parse(stdout) as TriggerJobResponse

    return NextResponse.json(
      {
        ok: true,
        status: "queued",
        requestId: String(triggerJob.id),
        skillId,
        queuedAt: new Date().toISOString(),
        runAt: triggerJob.schedule?.at || command.runAtIso,
        execution: "openclaw-cron-cli",
      },
      {
        status: 202,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to queue trigger job",
        details: getErrorDetails(error),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  }
}
