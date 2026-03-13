export type GridKind = "skill" | "media" | "file" | "job"

export type GridItem = {
  id: string
  title: string
  subtitle?: string
  kind: GridKind
  href?: string
  meta?: Record<string, unknown>
  updatedAt?: string
}
