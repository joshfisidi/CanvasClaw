"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type PanelScope =
  | "media"
  | "skills"
  | "jobs"
  | "files"

type ScopedBoardState = {
  order: Record<PanelScope, string[]>
  page: Record<PanelScope, number>
  setOrder: (scope: PanelScope, ids: string[]) => void
  setPage: (scope: PanelScope, page: number) => void
}

const PANEL_SCOPES: PanelScope[] = ["media", "skills", "jobs", "files"]

function emptyOrder(): Record<PanelScope, string[]> {
  return {
    media: [],
    skills: [],
    jobs: [],
    files: [],
  }
}

function emptyPage(): Record<PanelScope, number> {
  return {
    media: 1,
    skills: 1,
    jobs: 1,
    files: 1,
  }
}

function normalizeIds(ids: unknown) {
  if (!Array.isArray(ids)) return []
  return Array.from(
    new Set(ids.filter((id): id is string => typeof id === "string" && id.length > 0))
  )
}

function normalizePageValue(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1
  return Math.max(1, Math.floor(value))
}

function normalizeOrder(input: unknown): Record<PanelScope, string[]> {
  const base = emptyOrder()
  if (!input || typeof input !== "object") return base

  const order = input as Record<string, unknown>
  for (const scope of PANEL_SCOPES) {
    base[scope] = normalizeIds(order[scope])
  }
  return base
}

function normalizePage(input: unknown): Record<PanelScope, number> {
  const base = emptyPage()
  if (!input || typeof input !== "object") return base

  const page = input as Record<string, unknown>
  for (const scope of PANEL_SCOPES) {
    base[scope] = normalizePageValue(page[scope])
  }
  return base
}

export const useModuleBoardStore = create<ScopedBoardState>()(
  persist(
    (set) => ({
      order: emptyOrder(),
      page: emptyPage(),
      setOrder: (scope, ids) =>
        set((state) => ({
          order: {
            ...state.order,
            [scope]: normalizeIds(ids),
          },
        })),
      setPage: (scope, page) =>
        set((state) => {
          const nextPage = normalizePageValue(page)
          if (state.page[scope] === nextPage) return state
          return {
            page: {
              ...state.page,
              [scope]: nextPage,
            },
          }
        }),
    }),
    {
      name: "openclaw-scoped-module-board",
      version: 3,
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== "object") {
          return { order: emptyOrder(), page: emptyPage() }
        }

        const state = persistedState as Record<string, unknown>
        if (state.order && typeof state.order === "object") {
          return {
            order: normalizeOrder(state.order),
            page: normalizePage(state.page),
          }
        }

        if (state.boards && typeof state.boards === "object") {
          const boards = state.boards as Record<string, unknown>
          const migrated = emptyOrder()
          for (const scope of PANEL_SCOPES) {
            const boardItems = Array.isArray(boards[scope]) ? boards[scope] : []
            migrated[scope] = Array.from(
              new Set(
                boardItems
                  .map((item) =>
                    item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string"
                      ? (item as { id: string }).id
                      : null
                  )
                  .filter((id): id is string => Boolean(id))
              )
            )
          }
          return { order: migrated, page: emptyPage() }
        }

        return { order: emptyOrder(), page: emptyPage() }
      },
      partialize: (state) => ({ order: state.order, page: state.page }),
    }
  )
)
