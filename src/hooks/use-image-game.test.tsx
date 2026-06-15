import { beforeEach, describe, expect, test } from "bun:test"

import { act, renderHook } from "@testing-library/react"

import { useImageGame } from "@/hooks/use-image-game"
import { getTodayStr } from "@/lib/daily-robot"
import { MAX_IMAGE_GUESSES } from "@/lib/image-modes"
import { loadImageStats } from "@/lib/storage"

const TODAY = getTodayStr()

function wrongNames(result: { current: ReturnType<typeof useImageGame> }, count: number): string[] {
  return result.current.robots
    .filter((r) => r.name !== result.current.answer.name)
    .slice(0, count)
    .map((r) => r.name)
}

beforeEach(() => {
  localStorage.clear()
})

describe("useImageGame initial state", () => {
  test("starts empty with all guesses remaining", () => {
    const { result } = renderHook(() => useImageGame(TODAY, "blur"))
    expect(result.current.guessNames).toHaveLength(0)
    expect(result.current.completed).toBe(false)
    expect(result.current.lost).toBe(false)
    expect(result.current.remainingGuesses).toBe(MAX_IMAGE_GUESSES)
    expect(result.current.revealed).toBe(0)
  })

  test("blur and zoom pick independent answers from the image pool", () => {
    const blur = renderHook(() => useImageGame(TODAY, "blur"))
    const zoom = renderHook(() => useImageGame(TODAY, "zoom"))
    expect(blur.result.current.answer.imageUrl.trim()).not.toBe("")
    expect(zoom.result.current.answer.imageUrl.trim()).not.toBe("")
  })
})

describe("useImageGame submitGuess", () => {
  test("a correct guess completes the game and fully reveals the image", () => {
    const { result } = renderHook(() => useImageGame(TODAY, "blur"))
    act(() => result.current.submitGuess(result.current.answer.name))
    expect(result.current.completed).toBe(true)
    expect(result.current.lost).toBe(false)
    expect(result.current.revealed).toBe(MAX_IMAGE_GUESSES)
  })

  test("a wrong guess advances reveal without ending the game", () => {
    const { result } = renderHook(() => useImageGame(TODAY, "blur"))
    act(() => result.current.submitGuess(wrongNames(result, 1)[0]!))
    expect(result.current.revealed).toBe(1)
    expect(result.current.completed).toBe(false)
    expect(result.current.lost).toBe(false)
  })

  test("duplicate guesses are ignored", () => {
    const { result } = renderHook(() => useImageGame(TODAY, "blur"))
    const name = wrongNames(result, 1)[0]!
    act(() => result.current.submitGuess(name))
    act(() => result.current.submitGuess(name))
    expect(result.current.guessNames).toHaveLength(1)
  })

  test("running out of guesses transitions to lost and records a loss", () => {
    const { result } = renderHook(() => useImageGame(TODAY, "zoom"))
    for (const name of wrongNames(result, MAX_IMAGE_GUESSES)) {
      act(() => result.current.submitGuess(name))
    }
    expect(result.current.lost).toBe(true)
    expect(result.current.completed).toBe(false)
    const stats = loadImageStats("zoom")
    expect(stats.gamesPlayed).toBe(1)
    expect(stats.gamesWon).toBe(0)
  })

  test("a win records into the played variant's stats only", () => {
    const { result } = renderHook(() => useImageGame(TODAY, "blur"))
    act(() => result.current.submitGuess(result.current.answer.name))
    expect(loadImageStats("blur").gamesWon).toBe(1)
    expect(loadImageStats("zoom").gamesPlayed).toBe(0)
  })

  test("state persists across rehydration", () => {
    const { result } = renderHook(() => useImageGame(TODAY, "blur"))
    const name = wrongNames(result, 1)[0]!
    act(() => result.current.submitGuess(name))
    const fresh = renderHook(() => useImageGame(TODAY, "blur"))
    expect(fresh.result.current.guessNames).toEqual([name])
  })
})

describe("useImageGame with answerOverride", () => {
  test("does not persist or record stats", () => {
    const { result } = renderHook(() => useImageGame(TODAY, "blur"))
    const override = result.current.answer
    const overridden = renderHook(() =>
      useImageGame(TODAY, "blur", { answerOverride: override, disablePersistence: true }),
    )
    act(() => overridden.result.current.submitGuess(override.name))
    expect(overridden.result.current.completed).toBe(true)
    expect(loadImageStats("blur").gamesPlayed).toBe(0)
  })
})
