import { getPreviousDateStr } from "@/lib/daily-robot"
import type { LocalState, GameState, Stats } from "@/types"

const STORAGE_KEY = "thundle"
const MAX_GAME_AGE_DAYS = 30
const MS_PER_DAY = 1000 * 60 * 60 * 24

const DEFAULT_STATS: Stats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  averageGuesses: 0,
  guessDistribution: {},
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

function read(): LocalState {
  if (!isStorageAvailable()) {
    return { games: {}, stats: { ...DEFAULT_STATS, guessDistribution: {} } }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { games: {}, stats: { ...DEFAULT_STATS, guessDistribution: {} } }
    const parsed = JSON.parse(raw) as Partial<LocalState>
    return {
      games: parsed.games ?? {},
      stats: {
        ...DEFAULT_STATS,
        ...parsed.stats,
        guessDistribution: parsed.stats?.guessDistribution ?? {},
      },
    }
  } catch {
    return { games: {}, stats: { ...DEFAULT_STATS, guessDistribution: {} } }
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

function cleanOldGames(state: LocalState): LocalState {
  const games: Record<string, GameState> = {}
  for (const [date, game] of Object.entries(state.games)) {
    if (dateAgeDays(date) <= MAX_GAME_AGE_DAYS) {
      games[date] = game
    }
  }
  return { ...state, games }
}

export function loadGame(dateStr: string): GameState | undefined {
  return read().games[dateStr]
}

export function saveGame(dateStr: string, game: GameState): void {
  const state = cleanOldGames(read())
  state.games[dateStr] = game
  write(state)
}

export function loadStats(): Stats {
  return read().stats
}

function getBucket(guesses: number): string {
  if (guesses === 1) return "1"
  if (guesses <= 3) return "2-3"
  if (guesses <= 6) return "4-6"
  if (guesses <= 10) return "7-10"
  return "11+"
}

type GameEndOutcome = { won: boolean; guessCount: number }

export function recordGameEnd(dateStr: string, outcome: GameEndOutcome): Stats {
  const state = cleanOldGames(read())
  const stats: Stats = { ...state.stats, guessDistribution: { ...state.stats.guessDistribution } }

  const previousGamesPlayed = stats.gamesPlayed
  const previousTotalGuesses = stats.averageGuesses * previousGamesPlayed

  stats.gamesPlayed = previousGamesPlayed + 1
  if (outcome.won) {
    stats.gamesWon += 1
    const yesterdayWon = state.games[getPreviousDateStr(dateStr)]?.completed === true
    stats.currentStreak = yesterdayWon ? stats.currentStreak + 1 : 1
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak)
    const bucket = getBucket(outcome.guessCount)
    stats.guessDistribution[bucket] = (stats.guessDistribution[bucket] ?? 0) + 1
  } else {
    stats.currentStreak = 0
  }

  const totalGuesses = previousTotalGuesses + outcome.guessCount
  stats.averageGuesses = Math.round((totalGuesses / stats.gamesPlayed) * 10) / 10

  state.stats = stats
  write(state)
  return stats
}
