import { describe, expect, test } from "bun:test"

import {
  TEAM_WORD_LENGTH,
  computeKeyStatuses,
  isWinningGuess,
  scoreGuess,
} from "@/lib/team-mode-scoring"

const TEAM_ANSWER = "THUNDERATZ"

describe("scoreGuess", () => {
  test("exact answer is all correct", () => {
    const result = scoreGuess(TEAM_ANSWER)
    expect(result.statuses.every((s) => s === "correct")).toBe(true)
    expect(isWinningGuess(result)).toBe(true)
  })

  test("totally wrong word marks all wrong", () => {
    const wrong = "XXXXXXXXXX".slice(0, TEAM_WORD_LENGTH)
    const result = scoreGuess(wrong)
    expect(result.statuses.every((s) => s === "wrong")).toBe(true)
    expect(isWinningGuess(result)).toBe(false)
  })

  test("partial marks letters present but misplaced", () => {
    const result = scoreGuess("HXXXXXXXXX", "THUNDERATZ")
    expect(result.statuses[0]).toBe("partial")
    expect(result.statuses[1]).toBe("wrong")
  })

  test("handles double letters: answer has two T's, ten T's guess yields two correct positions", () => {
    const result = scoreGuess("TTTTTTTTTT")
    const correct = result.statuses.filter((s) => s === "correct").length
    const wrong = result.statuses.filter((s) => s === "wrong").length
    expect(correct).toBe(2)
    expect(wrong).toBe(TEAM_WORD_LENGTH - 2)
  })

  test("double-letter guess against single-letter answer: one correct, one wrong (Wordle rule)", () => {
    const result = scoreGuess("AAXX", "BACD")
    expect(result.statuses).toEqual(["wrong", "correct", "wrong", "wrong"])
  })

  test("correct takes precedence over partial for same letter", () => {
    const guess = "T" + "X".repeat(TEAM_WORD_LENGTH - 1)
    const result = scoreGuess(guess)
    expect(result.statuses[0]).toBe("correct")
  })

  test("throws when guess length mismatches answer", () => {
    expect(() => scoreGuess("SHORT")).toThrow()
  })

  test("explicit custom answer is supported", () => {
    const result = scoreGuess("CATS", "CATS")
    expect(isWinningGuess(result)).toBe(true)
  })
})

describe("computeKeyStatuses", () => {
  test("empty guesses → empty record", () => {
    expect(computeKeyStatuses([])).toEqual({})
  })

  test("aggregates statuses per letter across guesses", () => {
    const a = scoreGuess("HXXXXXXXXX", "THUNDERATZ") // H partial, others wrong
    const status = computeKeyStatuses([a])
    expect(status["H"]).toBe("partial")
    expect(status["X"]).toBe("wrong")
  })

  test("higher rank wins: correct overrides partial overrides wrong", () => {
    const partialH = scoreGuess("HXXXXXXXXX", "THUNDERATZ")
    const correctH = scoreGuess("XHXXXXXXXX", "THUNDERATZ")
    expect(computeKeyStatuses([partialH, correctH])["H"]).toBe("correct")
    expect(computeKeyStatuses([correctH, partialH])["H"]).toBe("correct")
  })

  test("normalizes letter case to uppercase keys", () => {
    const g = scoreGuess("thunderatz".toUpperCase(), "THUNDERATZ")
    const status = computeKeyStatuses([g])
    expect(status["T"]).toBe("correct")
  })
})
