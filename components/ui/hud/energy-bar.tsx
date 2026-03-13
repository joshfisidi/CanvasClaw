import { HudBar } from "./hud-bar"

type EnergyBarProps = {
  value?: number
}

export function EnergyBar({ value = 64 }: EnergyBarProps) {
  return <HudBar label="Energy" value={value} tone="energy" />
}
