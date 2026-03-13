"use client"

import { useEffect, useMemo, useRef, useState, type MouseEvent, type TouchEvent } from "react"
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useModuleBoardStore, type PanelScope } from "@/lib/module-board-store"
import { cn } from "@/lib/utils"
import type { GridItem } from "@/lib/grid-item"

const PAGE_SIZE = 8

function arraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false
  }
  return true
}

function reconcileOrder(scope: PanelScope, items: GridItem[], order: Record<PanelScope, string[]>) {
  const scopedOrder = order[scope] ?? []
  const validItemIds = new Set(items.map((item) => item.id))
  const keepFromOrder = scopedOrder.filter((id) => validItemIds.has(id))
  const existingOrder = new Set(keepFromOrder)
  const missingIds = items.map((item) => item.id).filter((id) => !existingOrder.has(id))
  return [...keepFromOrder, ...missingIds]
}

function SortableItem({ item, moveMode }: { item: GridItem; moveMode: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleTileClick = (event: MouseEvent<HTMLDivElement>) => {
    if (moveMode) {
      event.preventDefault()
      return
    }
    if (!item.href) return
    window.open(item.href, "_blank", "noopener,noreferrer")
  }

  return (
    <div
      data-grid-card="true"
      ref={setNodeRef}
      style={style}
      className={cn(
        "module-board-card relative h-[140px] overflow-hidden rounded-2xl p-4 text-white transition-all env-glass-frame-soft",
        "shadow-[0_8px_30px_rgba(0,0,0,0.4)]",
        "touch-manipulation",
        item.href ? "cursor-pointer" : "",
        moveMode ? "scale-95 ring-2 ring-sky-400" : ""
      )}
      onClick={handleTileClick}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className={cn(
          "module-board-drag-handle absolute right-2 top-2 rounded px-2 py-1 text-xs font-medium text-white touch-none",
          moveMode ? "bg-sky-500" : "bg-white/20 hover:bg-white/30"
        )}
        onContextMenu={(event) => event.preventDefault()}
        onPointerMove={() => {
          const selection = window.getSelection?.()
          if (selection && selection.type === "Range") selection.removeAllRanges()
        }}
        onClick={(event) => event.stopPropagation()}
      >
        Move
      </button>
      <div className="flex h-full flex-col gap-2">
        <div className="min-h-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{item.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-white/75">{item.subtitle || "No details available"}</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full border border-[color:rgb(var(--chrome-stroke-rgb)/0.36)] bg-[color:rgb(var(--chrome-highlight-rgb)/0.16)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/85">
            {item.kind}
          </span>
          {item.href ? (
            <a
              href={item.href}
              target="_blank"
              rel="noreferrer"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                if (moveMode) {
                  event.preventDefault()
                  event.stopPropagation()
                  return
                }
                event.stopPropagation()
              }}
              className="rounded-md border border-[color:rgb(var(--chrome-stroke-rgb)/0.36)] bg-[color:rgb(var(--chrome-highlight-rgb)/0.16)] px-2 py-0.5 text-[10px] font-medium text-white hover:bg-[color:rgb(var(--chrome-highlight-rgb)/0.28)]"
            >
              Open
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function ModuleBoard({ scope, items }: { scope: PanelScope; items: GridItem[] }) {
  const { order, setOrder, page, setPage } = useModuleBoardStore()
  const currentPage = page[scope]
  const [moveMode, setMoveMode] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const itemMap = useMemo(() => {
    const nextMap = new Map<string, GridItem>()
    for (const item of items) {
      nextMap.set(item.id, item)
    }
    return nextMap
  }, [items])

  const reconciledIds = useMemo(() => reconcileOrder(scope, items, order), [scope, items, order])
  const fullOrderedItems = useMemo(
    () => reconciledIds.map((id) => itemMap.get(id)).filter((item): item is GridItem => Boolean(item)),
    [itemMap, reconciledIds]
  )
  const totalPages = Math.ceil(fullOrderedItems.length / PAGE_SIZE) || 1
  const safePage = Math.min(currentPage, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const end = Math.min(start + PAGE_SIZE, fullOrderedItems.length)
  const visibleItems = fullOrderedItems.slice(start, end)
  const pageEmptySlots = Math.max(0, PAGE_SIZE - visibleItems.length)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  )
  const scopedOrder = order[scope] ?? []

  useEffect(() => {
    if (!arraysEqual(scopedOrder, reconciledIds)) {
      setOrder(scope, reconciledIds)
    }
  }, [scopedOrder, reconciledIds, scope, setOrder])

  useEffect(() => {
    if (safePage !== currentPage) {
      setPage(scope, safePage)
    }
  }, [currentPage, safePage, scope, setPage])

  useEffect(() => {
    return () => {
      document.body.classList.remove("dragging")
    }
  }, [])

  function handleSwipe() {
    if (touchStartX.current === null || touchEndX.current === null) return

    const delta = touchStartX.current - touchEndX.current
    const threshold = 50

    if (delta > threshold) {
      if (safePage < totalPages) setPage(scope, safePage + 1)
    } else if (delta < -threshold) {
      if (safePage > 1) setPage(scope, safePage - 1)
    }

    touchStartX.current = null
    touchEndX.current = null
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (moveMode) return
    touchStartX.current = event.changedTouches[0].clientX
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (moveMode) return
    touchEndX.current = event.changedTouches[0].clientX
    handleSwipe()
  }

  const onDragEnd = (event: DragEndEvent) => {
    touchStartX.current = null
    touchEndX.current = null
    document.body.classList.remove("dragging")
    setMoveMode(false)
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    const visibleIds = visibleItems.map((item) => item.id)
    const oldVisibleIndex = visibleIds.indexOf(activeId)
    const newVisibleIndex = visibleIds.indexOf(overId)
    if (oldVisibleIndex === -1 || newVisibleIndex === -1) return

    const movedVisible = arrayMove(visibleIds, oldVisibleIndex, newVisibleIndex)
    const fullIds = fullOrderedItems.map((item) => item.id)
    for (let index = 0; index < movedVisible.length; index += 1) {
      fullIds[start + index] = movedVisible[index]
    }
    setOrder(scope, fullIds)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => {
        touchStartX.current = null
        touchEndX.current = null
        document.body.classList.add("dragging")
        setMoveMode(true)
      }}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        touchStartX.current = null
        touchEndX.current = null
        document.body.classList.remove("dragging")
        setMoveMode(false)
      }}
    >
      <div
        data-modal-swipe-ignore="true"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="module-board overflow-x-hidden"
      >
        <div key={`page-${safePage}`} className="module-board-grid grid grid-cols-2 gap-4 auto-rows-[140px]">
          <SortableContext items={visibleItems.map((item) => item.id)} strategy={rectSortingStrategy}>
            {visibleItems.map((item) => (
              <SortableItem key={item.id} item={item} moveMode={moveMode} />
            ))}
          </SortableContext>
          {Array.from({ length: pageEmptySlots }, (_, offset) => start + visibleItems.length + offset + 1).map((slotId) => (
            <div
              key={`empty-slot-${safePage}-${slotId}`}
              aria-hidden
              className="h-[140px] overflow-hidden rounded-2xl border border-[color:rgb(var(--chrome-stroke-rgb)/0.2)] bg-[color:rgb(var(--chrome-surface-rgb)/0.24)]"
            />
          ))}
        </div>
      </div>
      {fullOrderedItems.length > 0 ? (
        <div className="mt-3 mb-2 flex justify-center">
          {Array.from({ length: totalPages }, (_, pageNumber) => pageNumber + 1).map((pageNumber) => (
            <div
              key={`page-dot-${pageNumber}`}
              className={cn(
                "mx-1 h-2 w-2 rounded-full transition-all",
                safePage === pageNumber ? "bg-white" : "bg-white/30"
              )}
            />
          ))}
        </div>
      ) : null}
      {fullOrderedItems.length === 0 ? (
        <p className="mt-6 text-center text-sm text-white/70">No items found.</p>
      ) : null}
    </DndContext>
  )
}
