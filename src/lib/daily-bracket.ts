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

export type BracketManifest = {
  pinned: Record<BracketTrack, Record<string, string>>
  combate: BracketManifestEntry[]
  sumo: BracketManifestEntry[]
}

const manifest = bracketsData as BracketManifest

const TRACK_SEEDS: Record<BracketTrack, number> = { combate: 3121, sumo: 4243 }

export function bracketEntryId(entry: BracketManifestEntry): string {
  return `${entry.eventSlug}/${entry.categoryRef}`
}

export function pickDailyBracket(
  source: BracketManifest,
  dateStr: string,
  track: BracketTrack,
): BracketManifestEntry {
  const pool = source[track]
  if (pool.length === 0) throw new Error(`No brackets configured for track: ${track}`)

  // Pin apontando para id fora do pool (ex.: regeneração do manifest dropou a
  // chave) cai no sorteio em vez de lançar — um throw aqui roda no render e
  // derrubaria o app inteiro, não só o modo.
  const pinnedId = source.pinned[track]?.[dateStr]
  const pinned = pinnedId ? pool.find((e) => bracketEntryId(e) === pinnedId) : undefined
  if (pinned) return pinned

  const ids = pool.map(bracketEntryId).sort()
  const shuffled = shuffleWithSeed(ids, TRACK_SEEDS[track])
  const dayIndex = getPuzzleNumber(dateStr) - 1
  const cycleIndex = ((dayIndex % shuffled.length) + shuffled.length) % shuffled.length
  const id = shuffled[cycleIndex]!
  return pool.find((e) => bracketEntryId(e) === id)!
}

export function getDailyBracket(dateStr: string, track: BracketTrack): BracketManifestEntry {
  return pickDailyBracket(manifest, dateStr, track)
}
