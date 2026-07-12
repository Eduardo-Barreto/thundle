import { beforeEach, describe, expect, test } from "bun:test"

import { getRecentDateStrs } from "@/lib/daily-robot"
import {
  loadBracketGame,
  loadBracketStats,
  loadGame,
  loadImageGame,
  loadImageStats,
  loadStats,
  recordBracketGameEnd,
  recordGameEnd,
  recordImageGameEnd,
  saveBracketGame,
  saveGame,
  saveImageGame,
} from "@/lib/storage"

// Datas recentes e consecutivas (terminando hoje) para não cair na poda de
// jogos com mais de 30 dias — datas fixas envelhecem e quebram os testes.
const [D1, D2, D3] = getRecentDateStrs(3) as [string, string, string]

beforeEach(() => {
  localStorage.clear()
})

describe("loadGame / saveGame", () => {
  test("returns undefined for unknown date", () => {
    expect(loadGame(D1)).toBeUndefined()
  })

  test("round-trips a game record", () => {
    saveGame(D1, {
      guesses: ["A", "B"],
      usedHint: true,
      hintAttribute: "year",
      completed: false,
    })
    const loaded = loadGame(D1)
    expect(loaded).toEqual({
      guesses: ["A", "B"],
      usedHint: true,
      hintAttribute: "year",
      completed: false,
    })
  })
})

describe("loadStats", () => {
  test("returns zeroed defaults on empty storage", () => {
    const stats = loadStats()
    expect(stats).toEqual({
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      averageGuesses: 0,
      guessDistribution: {},
    })
  })

  test("survives malformed JSON in storage", () => {
    localStorage.setItem("thundle", "{not valid json")
    const stats = loadStats()
    expect(stats.gamesPlayed).toBe(0)
  })
})

describe("recordGameEnd — win", () => {
  test("increments played and won, sets streak=1 with no prior history", () => {
    const stats = recordGameEnd(D1, { won: true, guessCount: 3 })
    expect(stats.gamesPlayed).toBe(1)
    expect(stats.gamesWon).toBe(1)
    expect(stats.currentStreak).toBe(1)
    expect(stats.maxStreak).toBe(1)
    expect(stats.guessDistribution["2-3"]).toBe(1)
  })

  test("continues streak when prior day was a win", () => {
    saveGame(D1, { guesses: ["A"], usedHint: false, completed: true })
    recordGameEnd(D1, { won: true, guessCount: 1 })
    const stats = recordGameEnd(D2, { won: true, guessCount: 2 })
    expect(stats.currentStreak).toBe(2)
    expect(stats.maxStreak).toBe(2)
  })

  test("computes rolling average of guesses", () => {
    recordGameEnd(D1, { won: true, guessCount: 2 })
    const stats = recordGameEnd(D2, { won: true, guessCount: 4 })
    expect(stats.averageGuesses).toBe(3)
  })

  test("buckets distribution correctly", () => {
    recordGameEnd(D1, { won: true, guessCount: 1 })
    recordGameEnd(D2, { won: true, guessCount: 4 })
    recordGameEnd(D3, { won: true, guessCount: 11 })
    const stats = loadStats()
    expect(stats.guessDistribution["1"]).toBe(1)
    expect(stats.guessDistribution["4-6"]).toBe(1)
    expect(stats.guessDistribution["11+"]).toBe(1)
  })
})

describe("recordGameEnd — loss", () => {
  test("increments played but not won", () => {
    const stats = recordGameEnd(D1, { won: false, guessCount: 10 })
    expect(stats.gamesPlayed).toBe(1)
    expect(stats.gamesWon).toBe(0)
  })

  test("loss resets current streak but preserves max", () => {
    recordGameEnd(D1, { won: true, guessCount: 1 })
    saveGame(D1, { guesses: ["A"], usedHint: false, completed: true })
    recordGameEnd(D2, { won: true, guessCount: 1 })
    saveGame(D2, { guesses: ["A"], usedHint: false, completed: true })
    const stats = recordGameEnd(D3, { won: false, guessCount: 10 })
    expect(stats.currentStreak).toBe(0)
    expect(stats.maxStreak).toBe(2)
  })

  test("loss does not increment distribution", () => {
    recordGameEnd(D1, { won: false, guessCount: 10 })
    expect(loadStats().guessDistribution["7-10"]).toBeUndefined()
  })
})

describe("loadImageGame / saveImageGame", () => {
  test("returns undefined for unknown date", () => {
    expect(loadImageGame("blur", D1)).toBeUndefined()
  })

  test("round-trips a per-variant image game record", () => {
    saveImageGame("blur", D1, { guesses: ["A", "B"], completed: false, lost: false })
    expect(loadImageGame("blur", D1)).toEqual({
      guesses: ["A", "B"],
      completed: false,
      lost: false,
    })
  })

  test("variants keep separate records for the same date", () => {
    saveImageGame("blur", D1, { guesses: ["A"], completed: true, lost: false })
    saveImageGame("zoom", D1, { guesses: ["X", "Y"], completed: false, lost: true })
    expect(loadImageGame("blur", D1)?.completed).toBe(true)
    expect(loadImageGame("zoom", D1)?.lost).toBe(true)
  })

  test("saving an image game leaves the classic game untouched", () => {
    saveGame(D1, { guesses: ["A"], usedHint: false, completed: true })
    saveImageGame("blur", D1, { guesses: ["B"], completed: false, lost: false })
    expect(loadGame(D1)?.completed).toBe(true)
  })
})

describe("recordImageGameEnd", () => {
  test("records into the variant's own stats, not classic", () => {
    recordImageGameEnd("blur", D1, { won: true, guessCount: 2 })
    expect(loadImageStats("blur").gamesWon).toBe(1)
    expect(loadStats().gamesPlayed).toBe(0)
  })

  test("keeps blur and zoom stats independent", () => {
    recordImageGameEnd("blur", D1, { won: true, guessCount: 1 })
    recordImageGameEnd("zoom", D1, { won: false, guessCount: 9 })
    expect(loadImageStats("blur").gamesWon).toBe(1)
    expect(loadImageStats("zoom").gamesWon).toBe(0)
    expect(loadImageStats("zoom").gamesPlayed).toBe(1)
  })

  test("streak continuity follows the same variant's prior day", () => {
    saveImageGame("blur", D1, { guesses: ["A"], completed: true, lost: false })
    recordImageGameEnd("blur", D1, { won: true, guessCount: 1 })
    const stats = recordImageGameEnd("blur", D2, { won: true, guessCount: 2 })
    expect(stats.currentStreak).toBe(2)
  })

  test("a win in another variant does not extend this variant's streak", () => {
    saveImageGame("zoom", D1, { guesses: ["A"], completed: true, lost: false })
    recordImageGameEnd("zoom", D1, { won: true, guessCount: 1 })
    const stats = recordImageGameEnd("blur", D2, { won: true, guessCount: 2 })
    expect(stats.currentStreak).toBe(1)
  })
})

describe("bracket games", () => {
  test("returns undefined for unknown date and round-trips per track", () => {
    expect(loadBracketGame("combate", D1)).toBeUndefined()
    saveBracketGame("combate", D1, { picks: { "26": "K-torze" }, confirmed: false })
    saveBracketGame("sumo", D1, {
      picks: { "16": "Tim Maia" },
      confirmed: true,
      result: { won: true, correctCount: 6, total: 7 },
    })
    expect(loadBracketGame("combate", D1)?.picks["26"]).toBe("K-torze")
    expect(loadBracketGame("combate", D1)?.confirmed).toBe(false)
    expect(loadBracketGame("sumo", D1)?.result?.won).toBe(true)
  })

  test("tracks keep separate stats and streaks follow the same track", () => {
    saveBracketGame("combate", D1, {
      picks: {},
      confirmed: true,
      result: { won: true, correctCount: 7, total: 7 },
    })
    recordBracketGameEnd("combate", D1, { won: true, guessCount: 7 })
    const combate = recordBracketGameEnd("combate", D2, { won: true, guessCount: 5 })
    expect(combate.currentStreak).toBe(2)
    expect(loadBracketStats("sumo").gamesPlayed).toBe(0)
  })

  test("win on one track does not continue the other track's streak", () => {
    saveBracketGame("sumo", D1, {
      picks: {},
      confirmed: true,
      result: { won: true, correctCount: 5, total: 7 },
    })
    recordBracketGameEnd("sumo", D1, { won: true, guessCount: 5 })
    const combate = recordBracketGameEnd("combate", D2, { won: true, guessCount: 6 })
    expect(combate.currentStreak).toBe(1)
  })
})
