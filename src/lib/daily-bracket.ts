import bracketsData from "@/config/brackets.json" with { type: "json" }
import { getPuzzleNumber, shuffleWithSeed } from "@/lib/daily-robot"
import type { BracketTrack } from "@/types"

export type BracketManifestEntry = {
  eventSlug: string
  eventName: string
  categoryRef: string
  categoryName: string
  matchCount: number
  hasDoubleElim: boolean
}

type BracketManifest = {
  pinned: Record<BracketTrack, Record<string, string>>
  combate: BracketManifestEntry[]
  sumo: BracketManifestEntry[]
}

const manifest = bracketsData as BracketManifest

const TRACK_SEEDS: Record<BracketTrack, number> = { combate: 3121, sumo: 4243 }

export function bracketEntryId(entry: BracketManifestEntry): string {
  return `${entry.eventSlug}/${entry.categoryRef}`
}

function findEntry(track: BracketTrack, id: string): BracketManifestEntry {
  const entry = manifest[track].find((e) => bracketEntryId(e) === id)
  if (!entry) throw new Error(`Bracket manifest entry not found: ${id}`)
  return entry
}

export function getDailyBracket(dateStr: string, track: BracketTrack): BracketManifestEntry {
  const pinnedId = manifest.pinned[track]?.[dateStr]
  if (pinnedId) return findEntry(track, pinnedId)

  const pool = manifest[track]
  if (pool.length === 0) throw new Error(`No brackets configured for track: ${track}`)
  const ids = pool.map(bracketEntryId).sort()
  const shuffled = shuffleWithSeed(ids, TRACK_SEEDS[track])
  const dayIndex = getPuzzleNumber(dateStr) - 1
  const cycleIndex = ((dayIndex % shuffled.length) + shuffled.length) % shuffled.length
  return findEntry(track, shuffled[cycleIndex]!)
}
