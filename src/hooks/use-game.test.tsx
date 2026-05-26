import { beforeEach, describe, expect, test } from "bun:test"

import { act, renderHook } from "@testing-library/react"

import { useGame } from "@/hooks/use-game"
import { getTodayStr } from "@/lib/daily-robot"

const TODAY = getTodayStr()

beforeEach(() => {
  localStorage.clear()
})

describe("useGame initial state", () => {
  test("starts with no guesses, hint or completion when storage is empty", () => {
    const { result } = renderHook(() => useGame(TODAY))
    expect(result.current.results).toHaveLength(0)
    expect(result.current.usedHint).toBe(false)
    expect(result.current.completed).toBe(false)
    expect(result.current.lost).toBe(false)
    expect(result.current.remainingGuesses).toBe(10)
  })

  test("derives lost=true from saved state with 10 guesses and not completed", () => {
    const { result: prepare } = renderHook(() => useGame(TODAY))
    const robotNames = prepare.current.robots
      .filter((r) => r.name !== prepare.current.answer.name)
      .slice(0, 10)
      .map((r) => r.name)
    for (const name of robotNames) {
      act(() => prepare.current.submitGuess(name))
    }
    const fresh = renderHook(() => useGame(TODAY))
    expect(fresh.result.current.lost).toBe(true)
    expect(fresh.result.current.completed).toBe(false)
  })
})

describe("useGame submitGuess", () => {
  test("a single guess appends one result and is persisted", () => {
    const { result, rerender } = renderHook(() => useGame(TODAY))
    const wrongName = result.current.robots.find((r) => r.name !== result.current.answer.name)!.name
    act(() => result.current.submitGuess(wrongName))
    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0]?.robotName).toBe(wrongName)
    rerender()
    expect(result.current.results).toHaveLength(1)
  })

  test("guessing the answer triggers completed=true", () => {
    const { result } = renderHook(() => useGame(TODAY))
    act(() => result.current.submitGuess(result.current.answer.name))
    expect(result.current.completed).toBe(true)
    expect(result.current.lost).toBe(false)
  })

  test("duplicate guesses are ignored", () => {
    const { result } = renderHook(() => useGame(TODAY))
    const wrongName = result.current.robots.find((r) => r.name !== result.current.answer.name)!.name
    act(() => result.current.submitGuess(wrongName))
    act(() => result.current.submitGuess(wrongName))
    expect(result.current.results).toHaveLength(1)
  })

  test("unknown robot name is ignored", () => {
    const { result } = renderHook(() => useGame(TODAY))
    act(() => result.current.submitGuess("not-a-robot"))
    expect(result.current.results).toHaveLength(0)
  })

  test("guessing after completion is a no-op", () => {
    const { result } = renderHook(() => useGame(TODAY))
    act(() => result.current.submitGuess(result.current.answer.name))
    const wrongName = result.current.robots.find((r) => r.name !== result.current.answer.name)!.name
    act(() => result.current.submitGuess(wrongName))
    expect(result.current.results).toHaveLength(1)
  })

  test("10 wrong guesses transitions to lost=true and stops accepting input", () => {
    const { result } = renderHook(() => useGame(TODAY))
    const wrong = result.current.robots
      .filter((r) => r.name !== result.current.answer.name)
      .slice(0, 10)
      .map((r) => r.name)
    for (const name of wrong) {
      act(() => result.current.submitGuess(name))
    }
    expect(result.current.lost).toBe(true)
    expect(result.current.completed).toBe(false)

    const extra = result.current.robots
      .filter((r) => !wrong.includes(r.name) && r.name !== result.current.answer.name)
      .at(0)
    if (extra) {
      act(() => result.current.submitGuess(extra.name))
      expect(result.current.results).toHaveLength(10)
    }
  })

  test("remainingGuesses decrements per guess", () => {
    const { result } = renderHook(() => useGame(TODAY))
    const initial = result.current.remainingGuesses
    const wrong = result.current.robots.find((r) => r.name !== result.current.answer.name)!.name
    act(() => result.current.submitGuess(wrong))
    expect(result.current.remainingGuesses).toBe(initial - 1)
  })
})

describe("useGame requestHint", () => {
  test("first call sets usedHint=true and a hintAttribute", () => {
    const { result } = renderHook(() => useGame(TODAY))
    act(() => result.current.requestHint())
    expect(result.current.usedHint).toBe(true)
    expect(typeof result.current.hintAttribute).toBe("string")
  })

  test("subsequent calls are no-ops", () => {
    const { result } = renderHook(() => useGame(TODAY))
    act(() => result.current.requestHint())
    const firstAttr = result.current.hintAttribute
    act(() => result.current.requestHint())
    expect(result.current.hintAttribute).toBe(firstAttr)
  })

  test("hint persists across rehydration", () => {
    const { result } = renderHook(() => useGame(TODAY))
    act(() => result.current.requestHint())
    const attr = result.current.hintAttribute
    const fresh = renderHook(() => useGame(TODAY))
    expect(fresh.result.current.usedHint).toBe(true)
    expect(fresh.result.current.hintAttribute).toBe(attr)
  })
})
