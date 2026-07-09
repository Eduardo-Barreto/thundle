import { BRACKET_TRACKS } from "@/lib/bracket-modes"
import { getPuzzleNumber, getTodayStr, IMAGE_VARIANTS } from "@/lib/daily-robot"
import { IMAGE_MODE_META } from "@/lib/image-modes"
import type { BracketTrack, ImageGameVariant } from "@/types"

export type GameMode = "classic" | ImageGameVariant | "bracket"

export const TEAM_PATH = "/team"
const BRACKET_PATH = "bracket"

export function getModeFromPath(pathname: string): GameMode {
  const path = pathname.replace(/\/+$/, "")
  if (path === `/${BRACKET_PATH}`) return "bracket"
  for (const variant of IMAGE_VARIANTS) {
    if (path === `/${IMAGE_MODE_META[variant].path}`) return variant
  }
  return "classic"
}

function pathForMode(mode: GameMode): string {
  if (mode === "classic") return "/"
  if (mode === "bracket") return `/${BRACKET_PATH}`
  return `/${IMAGE_MODE_META[mode].path}`
}

export function getTrackFromSearch(search: string): BracketTrack | undefined {
  const param = new URLSearchParams(search).get("t")
  return BRACKET_TRACKS.find((track) => track === param)
}

export function updateUrlState(dateStr: string, mode: GameMode, track?: BracketTrack): void {
  const url = new URL(window.location.href)
  url.pathname = pathForMode(mode)
  if (dateStr === getTodayStr()) {
    url.searchParams.delete("p")
  } else {
    url.searchParams.set("p", String(getPuzzleNumber(dateStr)))
  }
  if (mode === "bracket" && track) {
    url.searchParams.set("t", track)
  } else {
    url.searchParams.delete("t")
  }
  window.history.replaceState(null, "", url)
}
