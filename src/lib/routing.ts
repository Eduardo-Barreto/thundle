import { getPuzzleNumber, getTodayStr, IMAGE_VARIANTS } from "@/lib/daily-robot"
import { IMAGE_MODE_META } from "@/lib/image-modes"
import type { ImageGameVariant } from "@/types"

export type GameMode = "classic" | ImageGameVariant

export const TEAM_PATH = "/team"

export function getModeFromPath(pathname: string): GameMode {
  const path = pathname.replace(/\/+$/, "")
  for (const variant of IMAGE_VARIANTS) {
    if (path === `/${IMAGE_MODE_META[variant].path}`) return variant
  }
  return "classic"
}

function pathForMode(mode: GameMode): string {
  return mode === "classic" ? "/" : `/${IMAGE_MODE_META[mode].path}`
}

export function updateUrlState(dateStr: string, mode: GameMode): void {
  const url = new URL(window.location.href)
  url.pathname = pathForMode(mode)
  if (dateStr === getTodayStr()) {
    url.searchParams.delete("p")
  } else {
    url.searchParams.set("p", String(getPuzzleNumber(dateStr)))
  }
  window.history.replaceState(null, "", url)
}
