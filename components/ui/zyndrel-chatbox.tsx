"use client"

import { FormEvent, useMemo, useState } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePanelStore } from "@/lib/panel-store"
import { cn } from "@/lib/utils"

type Bubble = {
  id: string
  text: string
  driftX: number
  driftY: number
  ttlMs: number
}

const BUBBLE_MAX_CHARS = 180
const BUBBLE_MAX_ITEMS = 8
const THINKING_BUBBLE_TEXT = "…"

function clampBubbleText(raw: string) {
  const compact = raw.replace(/\s+/g, " ").trim()
  if (!compact) return ""
  if (compact.length <= BUBBLE_MAX_CHARS) return compact

  const cut = compact.slice(0, BUBBLE_MAX_CHARS)
  const sentenceEnd = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"))
  const safeCut = sentenceEnd > 70 ? cut.slice(0, sentenceEnd + 1) : cut.slice(0, cut.lastIndexOf(" "))
  return `${safeCut || cut}…`
}

function splitReplyIntoBubbles(raw: string) {
  const compact = raw.replace(/\s+/g, " ").trim()
  if (!compact) return [] as string[]

  const sentences = compact
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  const chunks: string[] = []
  let current = ""

  for (const sentence of sentences.length ? sentences : [compact]) {
    const next = current ? `${current} ${sentence}` : sentence

    if (next.length <= BUBBLE_MAX_CHARS) {
      current = next
      continue
    }

    if (current) chunks.push(clampBubbleText(current))

    if (sentence.length <= BUBBLE_MAX_CHARS) {
      current = sentence
    } else {
      let remaining = sentence
      while (remaining.length > BUBBLE_MAX_CHARS) {
        const slice = remaining.slice(0, BUBBLE_MAX_CHARS)
        const breakAt = Math.max(slice.lastIndexOf(" "), Math.floor(BUBBLE_MAX_CHARS * 0.72))
        chunks.push(clampBubbleText(remaining.slice(0, breakAt)))
        remaining = remaining.slice(breakAt).trim()
      }
      current = remaining
    }
  }

  if (current) chunks.push(clampBubbleText(current))
  return chunks.filter(Boolean)
}

export function ZyndrelChatbox() {
  const panelOpen = usePanelStore((state) => Boolean(state.active) || state.isDirectControlOpen)
  const [pending, setPending] = useState(false)
  const [input, setInput] = useState("")
  const [bubbles, setBubbles] = useState<Bubble[]>([])

  const visibleBubbles = useMemo(() => bubbles.slice(-BUBBLE_MAX_ITEMS), [bubbles])

  const removeBubble = (id: string) => {
    setBubbles((current) => current.filter((bubble) => bubble.id !== id))
  }

  const pushAssistantBubble = (text: string, ttlOverrideMs?: number) => {
    const clamped = clampBubbleText(text)
    if (!clamped) return ""

    const id = `${Date.now()}-${Math.random()}`
    const ttlMs = ttlOverrideMs ?? 4200 + Math.floor(Math.random() * 1400)
    const next: Bubble = {
      id,
      text: clamped,
      driftX: Math.floor((Math.random() - 0.5) * 44),
      driftY: Math.floor(Math.random() * 18),
      ttlMs,
    }

    setBubbles((current) => [...current, next].slice(-BUBBLE_MAX_ITEMS))

    window.setTimeout(() => {
      removeBubble(id)
    }, ttlMs)

    return id
  }

  const onSend = async (event: FormEvent) => {
    event.preventDefault()
    const value = input.trim()
    if (!value || pending) return

    setInput("")
    setPending(true)

    const thinkingBubbleId = pushAssistantBubble(THINKING_BUBBLE_TEXT, 9000)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value }),
      })

      const payload = (await response.json().catch(() => null)) as { reply?: string; error?: string } | null
      removeBubble(thinkingBubbleId)

      if (!response.ok) {
        pushAssistantBubble(payload?.error || "Chat request failed.")
        return
      }

      const chunks = splitReplyIntoBubbles(payload?.reply || "No reply returned.")
      if (!chunks.length) {
        pushAssistantBubble("No reply returned.")
        return
      }

      chunks.forEach((chunk, index) => {
        window.setTimeout(() => {
          pushAssistantBubble(chunk)
        }, index * 140)
      })
    } catch {
      removeBubble(thinkingBubbleId)
      pushAssistantBubble("Connection issue. Try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <section
        className={cn(
          "pointer-events-none fixed left-1/2 z-[53] w-[min(88vw,460px)] -translate-x-1/2",
          "top-[clamp(16vh,24vh,33vh)]",
          panelOpen ? "opacity-70" : "opacity-100"
        )}
        aria-label="Zyndrel floating response bubbles"
      >
        <div className="relative min-h-16">
          {visibleBubbles.map((bubble, index) => (
            <div
              key={bubble.id}
              className={cn(
                "bubble-float bubble-glob env-glass-frame-soft absolute left-1/2 max-w-[85%] -translate-x-1/2 px-4 py-2.5 text-center text-[12px] leading-relaxed text-white/94",
                index === visibleBubbles.length - 1 ? "opacity-100" : "opacity-80"
              )}
              style={{
                transform: `translate(calc(-50% + ${bubble.driftX}px), ${index * 8 + bubble.driftY}px)`,
                animationDuration: `${bubble.ttlMs}ms, ${3200 + index * 400}ms`,
              }}
            >
              {bubble.text}
            </div>
          ))}
        </div>
      </section>

      <section
        className={cn(
          "fixed left-0 right-0 z-[54] px-3 sm:px-4",
          "bottom-[calc(max(env(safe-area-inset-bottom),0.7rem)+5.35rem)]",
          panelOpen ? "pointer-events-none opacity-70" : "pointer-events-none"
        )}
        aria-label="Zyndrel input"
      >
        <div className="pointer-events-auto mx-auto w-full max-w-[620px]">
          <div className="env-glass-frame overflow-hidden rounded-2xl px-2.5 py-2">
            <form onSubmit={onSend} className="flex items-end gap-1.5">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={1}
                placeholder="Message Zyndrel…"
                className="chat-no-zoom min-h-9 flex-1 resize-none rounded-lg border border-[color:rgb(var(--chrome-stroke-rgb)/0.26)] bg-[color:rgb(var(--chrome-surface-rgb)/0.4)] px-2.5 py-2 text-base text-white outline-none placeholder:text-white/40 md:text-[13px]"
              />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                disabled={!input.trim() || pending}
                className="h-9 w-9 rounded-lg env-glass-button text-white disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}
