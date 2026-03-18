import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { NextResponse } from "next/server"
import type { GridItem } from "@/lib/grid-item"

export const dynamic = "force-dynamic"
export const revalidate = 0

type SkillEntry = GridItem

function getSkillRootCandidates() {
  return [
    process.env.OPENCLAW_SKILLS_DIR,
    path.join(process.cwd(), "..", "workspace", "skills"),
    path.join(os.homedir(), ".codex", "skills"),
    path.join(process.cwd(), "skills"),
  ].filter(Boolean) as string[]
}

async function existingSkillRoots() {
  const roots: string[] = []

  for (const candidate of getSkillRootCandidates()) {
    try {
      const stats = await fs.stat(candidate)
      if (stats.isDirectory()) {
        roots.push(path.resolve(candidate))
      }
    } catch {
      continue
    }
  }

  return roots
}

async function listSkillsFromRoot(rootDir: string, maxDepth = 4) {
  const entries: SkillEntry[] = []

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return

    let children
    try {
      children = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    children.sort((a, b) => a.name.localeCompare(b.name))

    for (const child of children) {
      const absolute = path.join(dir, child.name)

      if (child.isFile() && child.name === "SKILL.md") {
        const stats = await fs.stat(absolute).catch(() => null)
        const skillFileContent = await fs.readFile(absolute, "utf8").catch(() => "")
        const relativeSkillFile = path.relative(rootDir, absolute).replace(/\\/g, "/")
        const relativeSkillId = relativeSkillFile.replace(/\/SKILL\.md$/i, "")
        const directoryName = path.basename(path.dirname(absolute))
        const fallbackName = relativeSkillId || directoryName
        const { name, description } = readSkillFrontMatter(skillFileContent)
        const updatedAt =
          stats?.mtime && !Number.isNaN(stats.mtime.getTime()) ? stats.mtime.toISOString() : undefined
        const id = `${rootDir}:${fallbackName}`

        entries.push({
          id,
          title: name || directoryName,
          subtitle: description || undefined,
          kind: "skill",
          meta: {
            source: rootDir,
            skillFile: absolute,
            relativeSkillId: fallbackName,
          },
          updatedAt,
        })
        continue
      }

      if (child.isDirectory()) {
        await walk(absolute, depth + 1)
      }
    }
  }

  await walk(rootDir, 0)
  return entries
}

function readSkillFrontMatter(content: string) {
  if (!content.startsWith("---")) {
    return { name: "", description: "" }
  }

  const lines = content.split(/\r?\n/)
  let lineIndex = 1
  const fields: Record<string, string> = {}

  while (lineIndex < lines.length) {
    const line = lines[lineIndex].trim()
    lineIndex += 1
    if (line === "---") break
    if (!line || line.startsWith("#")) continue

    const separatorIndex = line.indexOf(":")
    if (separatorIndex <= 0) continue

    const key = line.slice(0, separatorIndex).trim().toLowerCase()
    const rawValue = line.slice(separatorIndex + 1).trim()
    fields[key] = rawValue.replace(/^['"]|['"]$/g, "")
  }

  return {
    name: fields.name || "",
    description: fields.description || "",
  }
}

export async function GET() {
  const roots = await existingSkillRoots()
  const allEntries = await Promise.all(roots.map((root) => listSkillsFromRoot(root)))
  const deduped = new Map<string, SkillEntry>()

  for (const entries of allEntries) {
    for (const entry of entries) {
      if (!deduped.has(entry.id)) {
        deduped.set(entry.id, entry)
      }
    }
  }

  const items = Array.from(deduped.values()).sort((a, b) => {
    const byUpdatedAt = (b.updatedAt || "").localeCompare(a.updatedAt || "")
    if (byUpdatedAt !== 0) return byUpdatedAt
    return a.title.localeCompare(b.title)
  })

  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  )
}
