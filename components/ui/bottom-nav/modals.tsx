"use client"

import { useRef, useState, type TouchEvent } from "react"
import { renderPanel } from "@/components/ui/panels/registry"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { usePanelStore } from "@/lib/panel-store"
import { cn } from "@/lib/utils"
import { getBottomNavItemById } from "./items"

const SWIPE_CLOSE_THRESHOLD = 110
const SWIPE_ACTIVATION_DISTANCE = 14
const SWIPE_ACTIVATION_WINDOW_MS = 100
const SWIPE_IGNORE_SELECTOR = "[data-modal-swipe-ignore='true']"

export function BottomNavModalHost() {
  const active = usePanelStore((state) => state.active)
  const close = usePanelStore((state) => state.close)
  const isDirectControlOpen = usePanelStore((state) => state.isDirectControlOpen)
  const item = active ? getBottomNavItemById(active) : null
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const sheetContentRef = useRef<HTMLDivElement | null>(null)
  const touchStartYRef = useRef<number | null>(null)
  const touchStartXRef = useRef<number | null>(null)
  const touchStartTimeRef = useRef<number | null>(null)
  const swipeActiveRef = useRef(false)
  const dragOffsetRef = useRef(0)
  const shouldIgnoreSwipeRef = useRef(false)

  const shouldIgnoreSwipe = (eventTarget: EventTarget | null) => {
    if (!(eventTarget instanceof HTMLElement)) return false
    return Boolean(eventTarget.closest(SWIPE_IGNORE_SELECTOR))
  }

  const handleSwipeStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return

    if (shouldIgnoreSwipe(event.target)) {
      shouldIgnoreSwipeRef.current = true
      return
    }

    shouldIgnoreSwipeRef.current = false
    touchStartYRef.current = event.touches[0].clientY
    touchStartXRef.current = event.touches[0].clientX
    touchStartTimeRef.current = event.timeStamp
    swipeActiveRef.current = false
  }

  const handleSwipeMove = (event: TouchEvent<HTMLDivElement>) => {
    if (shouldIgnoreSwipeRef.current) return
    if (event.touches.length !== 1 || touchStartYRef.current === null || touchStartXRef.current === null) return

    const deltaY = event.touches[0].clientY - touchStartYRef.current
    const deltaX = Math.abs(event.touches[0].clientX - touchStartXRef.current)

    if (!swipeActiveRef.current) {
      const scrollTop = sheetContentRef.current?.scrollTop ?? 0
      const isMostlyVertical = Math.abs(deltaY) >= deltaX
      const startTime = touchStartTimeRef.current ?? event.timeStamp
      const elapsedMs = event.timeStamp - startTime

      if (deltaY <= 0 || !isMostlyVertical || scrollTop > 0) return
      if (deltaY < SWIPE_ACTIVATION_DISTANCE) return
      if (elapsedMs > SWIPE_ACTIVATION_WINDOW_MS) return

      swipeActiveRef.current = true
      setIsDragging(true)
    }

    event.preventDefault()
    const nextOffset = Math.max(0, deltaY)
    dragOffsetRef.current = nextOffset
    setDragOffset(nextOffset)
  }

  const resetSwipeState = () => {
    touchStartYRef.current = null
    touchStartXRef.current = null
    touchStartTimeRef.current = null
    swipeActiveRef.current = false
    shouldIgnoreSwipeRef.current = false
    dragOffsetRef.current = 0
    setIsDragging(false)
    setDragOffset(0)
  }

  const handleSwipeEnd = () => {
    if (!swipeActiveRef.current) {
      resetSwipeState()
      return
    }

    const shouldClose = dragOffsetRef.current > SWIPE_CLOSE_THRESHOLD
    resetSwipeState()
    if (shouldClose) close()
  }

  return (
    <Sheet
      modal={false}
      open={active !== null}
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <SheetContent
        ref={sheetContentRef}
        side="bottom"
        overlayClassName="pointer-events-none bg-transparent backdrop-blur-[2px]"
        className={cn(
          "mx-auto h-[min(78vh,680px)] max-h-[calc(var(--app-height)-88px)] w-[min(680px,calc(100%-1rem))] overflow-y-auto rounded-[24px] p-0 text-white env-glass-frame",
          "sm:w-[min(760px,calc(100%-2rem))]",
          "transition-[filter,opacity,transform] duration-300 ease-out",
          isDirectControlOpen && active ? "pointer-events-none scale-[0.988] opacity-[0.72] blur-[3px] saturate-[0.86]" : ""
        )}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <SheetTitle className="sr-only">
          {item ? item.label : "Bottom navigation panel"}
        </SheetTitle>
        <div
          className="h-full touch-pan-y"
          style={{
            transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
            transition: isDragging ? "none" : "transform 180ms ease-out",
          }}
          onTouchStart={handleSwipeStart}
          onTouchMove={handleSwipeMove}
          onTouchEnd={handleSwipeEnd}
          onTouchCancel={resetSwipeState}
        >
          <div className="mb-1 flex h-10 items-center justify-center">
            <div className="h-1.5 w-14 rounded-full bg-white/35" />
          </div>
          <div className="px-4 pb-4">
            {item ? renderPanel(item, close) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
