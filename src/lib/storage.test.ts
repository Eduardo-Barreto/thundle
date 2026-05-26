import { beforeEach, describe, expect, test } from "bun:test"

import { loadGame, loadStats, recordGameEnd, saveGame } from "@/lib/storage"

beforeEach(() => {
  localStorage.clear()
})

describe("loadGame / saveGame", () => {
  test("returns undefined for unknown date", () => {
    expect(loadGame("2026-05-24")).toBeUndefined()
  })

  test("round-trips a game record", () => {
    saveGame("2026-05-24", {
      guesses: ["A", "B"],
      usedHint: true,
      hintAttribute: "year",
      completed: false,
    })
    const loaded = loadGame("2026-05-24")
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
    const stats = recordGameEnd("2026-05-24", { won: true, guessCount: 3 })
    expect(stats.gamesPlayed).toBe(1)
    expect(stats.gamesWon).toBe(1)
    expect(stats.currentStreak).toBe(1)
    expect(stats.maxStreak).toBe(1)
    expect(stats.guessDistribution["2-3"]).toBe(1)
  })

  test("continues streak when prior day was a win", () => {
    saveGame("2026-05-24", { guesses: ["A"], usedHint: false, completed: true })
    recordGameEnd("2026-05-24", { won: true, guessCount: 1 })
    const stats = recordGameEnd("2026-05-25", { won: true, guessCount: 2 })
    expect(stats.currentStreak).toBe(2)
    expect(stats.maxStreak).toBe(2)
  })

  test("computes rolling average of guesses", () => {
    recordGameEnd("2026-05-24", { won: true, guessCount: 2 })
    const stats = recordGameEnd("2026-05-25", { won: true, guessCount: 4 })
    expect(stats.averageGuesses).toBe(3)
  })

  test("buckets distribution correctly", () => {
    recordGameEnd("2026-05-24", { won: true, guessCount: 1 })
    recordGameEnd("2026-05-25", { won: true, guessCount: 4 })
    recordGameEnd("2026-05-26", { won: true, guessCount: 11 })
    const stats = loadStats()
    expect(stats.guessDistribution["1"]).toBe(1)
    expect(stats.guessDistribution["4-6"]).toBe(1)
    expect(stats.guessDistribution["11+"]).toBe(1)
  })
})

describe("recordGameEnd — loss", () => {
  test("increments played but not won", () => {
    const stats = recordGameEnd("2026-05-24", { won: false, guessCount: 10 })
    expect(stats.gamesPlayed).toBe(1)
    expect(stats.gamesWon).toBe(0)
  })

  test("loss resets current streak but preserves max", () => {
    recordGameEnd("2026-05-24", { won: true, guessCount: 1 })
    saveGame("2026-05-24", { guesses: ["A"], usedHint: false, completed: true })
    recordGameEnd("2026-05-25", { won: true, guessCount: 1 })
    saveGame("2026-05-25", { guesses: ["A"], usedHint: false, completed: true })
    const stats = recordGameEnd("2026-05-26", { won: false, guessCount: 10 })
    expect(stats.currentStreak).toBe(0)
    expect(stats.maxStreak).toBe(2)
  })

  test("loss does not increment distribution", () => {
    recordGameEnd("2026-05-24", { won: false, guessCount: 10 })
    expect(loadStats().guessDistribution["7-10"]).toBeUndefined()
  })
})
