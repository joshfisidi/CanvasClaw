"use client"

import { useEffect } from "react"

export function ViewportHeightSync() {
  useEffect(() => {
    const setViewportHeight = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      document.documentElement.style.setProperty("--app-vh", `${viewportHeight * 0.01}px`)
      document.documentElement.style.setProperty("--app-height", `${viewportHeight}px`)
    }

    setViewportHeight()
    window.addEventListener("resize", setViewportHeight)
    window.addEventListener("orientationchange", setViewportHeight)
    window.visualViewport?.addEventListener("resize", setViewportHeight)

    return () => {
      window.removeEventListener("resize", setViewportHeight)
      window.removeEventListener("orientationchange", setViewportHeight)
      window.visualViewport?.removeEventListener("resize", setViewportHeight)
    }
  }, [])

  return null
}
