import { describe, expect, test } from "bun:test"

import { act, renderHook } from "@testing-library/react"

import { useSearch } from "@/hooks/use-search"
import type { Robot } from "@/types"

function makeRobot(name: string): Robot {
  return {
    name,
    slug: name.toLowerCase(),
    year: 2020,
    superCategory: "Combate",
    category: "Beetle",
    active: true,
    trophies: { gold: 0, silver: 0, bronze: 0 },
    imageUrl: "",
  }
}

const robots = ["Thunder", "Lightning", "Storm", "Tornado", "Hurricane"].map(makeRobot)

function keyEvent(key: string): React.KeyboardEvent {
  let prevented = false
  return {
    key,
    preventDefault: () => {
      prevented = true
    },
    get defaultPrevented() {
      return prevented
    },
  } as unknown as React.KeyboardEvent
}

describe("useSearch", () => {
  test("short query (<2 chars) returns no results and stays closed", () => {
    const { result } = renderHook(() => useSearch(robots, new Set()))
    act(() => result.current.updateQuery("T"))
    expect(result.current.results).toHaveLength(0)
    expect(result.current.isOpen).toBe(false)
  })

  test("query ≥2 chars opens dropdown and populates results", () => {
    const { result } = renderHook(() => useSearch(robots, new Set()))
    act(() => result.current.updateQuery("Th"))
    expect(result.current.isOpen).toBe(true)
    expect(result.current.results.length).toBeGreaterThan(0)
    expect(result.current.results[0]?.robot.name).toBe("Thunder")
  })

  test("ArrowDown advances activeIndex, ArrowUp retreats, clamped at boundaries", () => {
    const { result } = renderHook(() => useSearch(robots, new Set()))
    act(() => result.current.updateQuery("or"))
    const count = result.current.results.length
    expect(count).toBeGreaterThan(1)
    const noop = (_: string) => undefined

    act(() => result.current.handleKeyDown(keyEvent("ArrowDown"), noop))
    expect(result.current.activeIndex).toBe(1)
    for (let i = 0; i < count + 5; i++) {
      act(() => result.current.handleKeyDown(keyEvent("ArrowDown"), noop))
    }
    expect(result.current.activeIndex).toBe(count - 1)

    for (let i = 0; i < count + 5; i++) {
      act(() => result.current.handleKeyDown(keyEvent("ArrowUp"), noop))
    }
    expect(result.current.activeIndex).toBe(0)
  })

  test("Enter calls onSelect with active robot's name and clears query", () => {
    const { result } = renderHook(() => useSearch(robots, new Set()))
    let selected = ""
    act(() => result.current.updateQuery("Th"))
    act(() => result.current.handleKeyDown(keyEvent("Enter"), (n) => (selected = n)))
    expect(selected).toBe("Thunder")
    expect(result.current.query).toBe("")
    expect(result.current.isOpen).toBe(false)
  })

  test("Enter on a guessed robot does not call onSelect", () => {
    const { result } = renderHook(() => useSearch(robots, new Set(["Thunder"])))
    let selected = ""
    act(() => result.current.updateQuery("Th"))
    act(() => result.current.handleKeyDown(keyEvent("Enter"), (n) => (selected = n)))
    expect(selected).toBe("")
  })

  test("Escape closes the dropdown", () => {
    const { result } = renderHook(() => useSearch(robots, new Set()))
    act(() => result.current.updateQuery("Th"))
    act(() => result.current.handleKeyDown(keyEvent("Escape"), () => undefined))
    expect(result.current.isOpen).toBe(false)
  })

  test("updateQuery resets activeIndex to 0", () => {
    const { result } = renderHook(() => useSearch(robots, new Set()))
    act(() => result.current.updateQuery("or"))
    act(() => result.current.handleKeyDown(keyEvent("ArrowDown"), () => undefined))
    expect(result.current.activeIndex).toBe(1)
    act(() => result.current.updateQuery("Th"))
    expect(result.current.activeIndex).toBe(0)
  })

  test("close() collapses dropdown without erasing query", () => {
    const { result } = renderHook(() => useSearch(robots, new Set()))
    act(() => result.current.updateQuery("Th"))
    act(() => result.current.close())
    expect(result.current.isOpen).toBe(false)
    expect(result.current.query).toBe("Th")
  })

  test("results contain highlight segments matching the query indexes", () => {
    const { result } = renderHook(() => useSearch(robots, new Set()))
    act(() => result.current.updateQuery("Thu"))
    const first = result.current.results[0]
    expect(first?.segments.some((s) => s.match)).toBe(true)
    const joined = first?.segments.map((s) => s.text).join("")
    expect(joined).toBe(first?.robot.name)
  })
})
