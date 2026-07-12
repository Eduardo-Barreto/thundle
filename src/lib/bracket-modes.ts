import type { BracketTrack } from "@/types"

export const BRACKET_TRACKS: readonly BracketTrack[] = ["combate", "sumo"]

type BracketTrackMeta = {
  label: string
}

export const BRACKET_TRACK_META: Record<BracketTrack, BracketTrackMeta> = {
  combate: { label: "Combate" },
  sumo: { label: "Sumô" },
}
