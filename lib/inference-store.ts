"use client"

const STORAGE_KEY = "zyndrel_raw_score"

export function getRawScore(): number {
  if (typeof window === "undefined") return 0
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) return 0
  const parsed = Number.parseInt(stored, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export function incrementRawScore(): number {
  if (typeof window === "undefined") return 0
  const next = getRawScore() + 1
  window.localStorage.setItem(STORAGE_KEY, next.toString())
  return next
}

export function getDisplayScore(raw: number): number {
  return Math.floor(Math.sqrt(Math.max(0, raw)))
}
