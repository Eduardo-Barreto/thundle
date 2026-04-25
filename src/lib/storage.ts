import type { LocalState, GameState, Stats } from "@/types"

const STORAGE_KEY = "thundle"
const MAX_GAME_AGE_DAYS = 30

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
    return { games: {}, stats: DEFAULT_STATS }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { games: {}, stats: DEFAULT_STATS }
    return JSON.parse(raw) as LocalState
  } catch {
    return { games: {}, stats: DEFAULT_STATS }
  }
}

function write(state: LocalState): void {
  if (!isStorageAvailable()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function cleanOldGames(state: LocalState): LocalState {
  const cutoff = Date.now() - MAX_GAME_AGE_DAYS * 24 * 60 * 60 * 1000
  const games: Record<string, GameState> = {}
  for (const [date, game] of Object.entries(state.games)) {
    if (new Date(date).getTime() >= cutoff) {
      games[date] = game
    }
  }
  return { ...state, games }
}

export function loadGame(dateStr: string): GameState | undefined {
  const state = read()
  return state.games[dateStr]
}

export function saveGame(dateStr: string, game: GameState): void {
  const state = cleanOldGames(read())
  state.games[dateStr] = game
  write(state)
}

export function loadStats(): Stats {
  return read().stats
}

export function saveStats(stats: Stats): void {
  const state = read()
  state.stats = stats
  write(state)
}

function getBucket(guesses: number): string {
  if (guesses === 1) return "1"
  if (guesses <= 3) return "2-3"
  if (guesses <= 6) return "4-6"
  if (guesses <= 10) return "7-10"
  return "11+"
}

export function recordWin(dateStr: string, guessCount: number): void {
  const state = cleanOldGames(read())
  const stats = state.stats

  stats.gamesPlayed += 1
  stats.gamesWon += 1

  const yesterday = new Date(dateStr)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)
  const playedYesterday = state.games[yesterdayStr]?.completed

  stats.currentStreak = playedYesterday ? stats.currentStreak + 1 : 1
  stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak)

  const totalGuesses = stats.averageGuesses * (stats.gamesPlayed - 1) + guessCount
  stats.averageGuesses = Math.round((totalGuesses / stats.gamesPlayed) * 10) / 10

  const bucket = getBucket(guessCount)
  stats.guessDistribution[bucket] = (stats.guessDistribution[bucket] ?? 0) + 1

  state.stats = stats
  write(state)
}
