import { BRACKET_TRACKS } from "@/lib/bracket-modes"
import { getPreviousDateStr, IMAGE_VARIANTS } from "@/lib/daily-robot"
import type {
  BracketGameState,
  BracketTrack,
  GameState,
  ImageGameState,
  ImageGameVariant,
  LocalState,
  Stats,
} from "@/types"

const STORAGE_KEY = "thundle"
const MAX_GAME_AGE_DAYS = 30
const MS_PER_DAY = 1000 * 60 * 60 * 24

function defaultStats(): Stats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    averageGuesses: 0,
    guessDistribution: {},
  }
}

function emptyImageGames(): Record<ImageGameVariant, Record<string, ImageGameState>> {
  const out = {} as Record<ImageGameVariant, Record<string, ImageGameState>>
  for (const variant of IMAGE_VARIANTS) out[variant] = {}
  return out
}

function defaultImageStats(): Record<ImageGameVariant, Stats> {
  const out = {} as Record<ImageGameVariant, Stats>
  for (const variant of IMAGE_VARIANTS) out[variant] = defaultStats()
  return out
}

function emptyBracketGames(): Record<BracketTrack, Record<string, BracketGameState>> {
  const out = {} as Record<BracketTrack, Record<string, BracketGameState>>
  for (const track of BRACKET_TRACKS) out[track] = {}
  return out
}

function defaultBracketStats(): Record<BracketTrack, Stats> {
  const out = {} as Record<BracketTrack, Stats>
  for (const track of BRACKET_TRACKS) out[track] = defaultStats()
  return out
}

function emptyState(): LocalState {
  return {
    games: {},
    imageGames: emptyImageGames(),
    bracketGames: emptyBracketGames(),
    stats: defaultStats(),
    imageStats: defaultImageStats(),
    bracketStats: defaultBracketStats(),
  }
}

function isStorageAvailable(): boolean {
  try {
    const key = "__thundle_test__"
    localStorage.setItem(key, "1")
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

function mergeStats(partial?: Partial<Stats>): Stats {
  return { ...defaultStats(), ...partial, guessDistribution: partial?.guessDistribution ?? {} }
}

function read(): LocalState {
  if (!isStorageAvailable()) return emptyState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Partial<LocalState>

    const imageGames = emptyImageGames()
    const imageStats = defaultImageStats()
    for (const variant of IMAGE_VARIANTS) {
      imageGames[variant] = parsed.imageGames?.[variant] ?? {}
      imageStats[variant] = mergeStats(parsed.imageStats?.[variant])
    }

    const bracketGames = emptyBracketGames()
    const bracketStats = defaultBracketStats()
    for (const track of BRACKET_TRACKS) {
      bracketGames[track] = parsed.bracketGames?.[track] ?? {}
      bracketStats[track] = mergeStats(parsed.bracketStats?.[track])
    }

    return {
      games: parsed.games ?? {},
      imageGames,
      bracketGames,
      stats: mergeStats(parsed.stats),
      imageStats,
      bracketStats,
    }
  } catch {
    return emptyState()
  }
}

function write(state: LocalState): void {
  if (!isStorageAvailable()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function dateAgeDays(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number)
  if (!y || !m || !d) return Infinity
  const date = new Date(y, m - 1, d).getTime()
  return (Date.now() - date) / MS_PER_DAY
}

function pruneByAge<T>(games: Record<string, T>): Record<string, T> {
  const kept: Record<string, T> = {}
  for (const [date, game] of Object.entries(games)) {
    if (dateAgeDays(date) <= MAX_GAME_AGE_DAYS) kept[date] = game
  }
  return kept
}

function cleanOldGames(state: LocalState): LocalState {
  const imageGames = emptyImageGames()
  for (const variant of IMAGE_VARIANTS) {
    imageGames[variant] = pruneByAge(state.imageGames[variant])
  }
  const bracketGames = emptyBracketGames()
  for (const track of BRACKET_TRACKS) {
    bracketGames[track] = pruneByAge(state.bracketGames[track])
  }
  return { ...state, games: pruneByAge(state.games), imageGames, bracketGames }
}

export function loadGame(dateStr: string): GameState | undefined {
  return read().games[dateStr]
}

export function saveGame(dateStr: string, game: GameState): void {
  const state = cleanOldGames(read())
  state.games[dateStr] = game
  write(state)
}

export function loadImageGame(
  variant: ImageGameVariant,
  dateStr: string,
): ImageGameState | undefined {
  return read().imageGames[variant][dateStr]
}

export function saveImageGame(
  variant: ImageGameVariant,
  dateStr: string,
  game: ImageGameState,
): void {
  const state = cleanOldGames(read())
  state.imageGames[variant][dateStr] = game
  write(state)
}

export function loadBracketGame(
  track: BracketTrack,
  dateStr: string,
): BracketGameState | undefined {
  return read().bracketGames[track][dateStr]
}

export function saveBracketGame(
  track: BracketTrack,
  dateStr: string,
  game: BracketGameState,
): void {
  const state = cleanOldGames(read())
  state.bracketGames[track][dateStr] = game
  write(state)
}

export function loadStats(): Stats {
  return read().stats
}

export function loadImageStats(variant: ImageGameVariant): Stats {
  return read().imageStats[variant]
}

export function loadBracketStats(track: BracketTrack): Stats {
  return read().bracketStats[track]
}

function getBucket(guesses: number): string {
  if (guesses === 1) return "1"
  if (guesses <= 3) return "2-3"
  if (guesses <= 6) return "4-6"
  if (guesses <= 10) return "7-10"
  return "11+"
}

type GameEndOutcome = { won: boolean; guessCount: number }

function applyGameEnd(previous: Stats, outcome: GameEndOutcome, yesterdayWon: boolean): Stats {
  const stats: Stats = { ...previous, guessDistribution: { ...previous.guessDistribution } }
  const previousTotalGuesses = stats.averageGuesses * stats.gamesPlayed

  stats.gamesPlayed += 1
  if (outcome.won) {
    stats.gamesWon += 1
    stats.currentStreak = yesterdayWon ? stats.currentStreak + 1 : 1
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak)
    const bucket = getBucket(outcome.guessCount)
    stats.guessDistribution[bucket] = (stats.guessDistribution[bucket] ?? 0) + 1
  } else {
    stats.currentStreak = 0
  }

  const totalGuesses = previousTotalGuesses + outcome.guessCount
  stats.averageGuesses = Math.round((totalGuesses / stats.gamesPlayed) * 10) / 10
  return stats
}

export function recordGameEnd(dateStr: string, outcome: GameEndOutcome): Stats {
  const state = cleanOldGames(read())
  const yesterdayWon = state.games[getPreviousDateStr(dateStr)]?.completed === true
  state.stats = applyGameEnd(state.stats, outcome, yesterdayWon)
  write(state)
  return state.stats
}

export function recordImageGameEnd(
  variant: ImageGameVariant,
  dateStr: string,
  outcome: GameEndOutcome,
): Stats {
  const state = cleanOldGames(read())
  const yesterdayWon = state.imageGames[variant][getPreviousDateStr(dateStr)]?.completed === true
  state.imageStats[variant] = applyGameEnd(state.imageStats[variant], outcome, yesterdayWon)
  write(state)
  return state.imageStats[variant]
}

export function recordBracketGameEnd(
  track: BracketTrack,
  dateStr: string,
  outcome: GameEndOutcome,
): Stats {
  const state = cleanOldGames(read())
  const yesterday = state.bracketGames[track][getPreviousDateStr(dateStr)]
  const yesterdayWon = yesterday?.result?.won === true
  state.bracketStats[track] = applyGameEnd(state.bracketStats[track], outcome, yesterdayWon)
  write(state)
  return state.bracketStats[track]
}
