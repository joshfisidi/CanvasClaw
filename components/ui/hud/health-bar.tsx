import { HudBar } from "./hud-bar"

type HealthBarProps = {
  value?: number
}

export function HealthBar({ value = 78 }: HealthBarProps) {
  return <HudBar label="Health" value={value} tone="health" />
}
