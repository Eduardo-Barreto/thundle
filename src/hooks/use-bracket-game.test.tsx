import { afterAll, beforeEach, describe, expect, test } from "bun:test"

import { act, renderHook, waitFor } from "@testing-library/react"

import { useBracketGame } from "@/hooks/use-bracket-game"
import type { BracketManifestEntry } from "@/lib/daily-bracket"
import { getTodayStr } from "@/lib/daily-robot"
import { loadBracketGame, loadBracketStats } from "@/lib/storage"
import cpbr16Bracket from "@/test/fixtures/rcx-cpbr16-lightweight-bracket.json"
import cpbr16Robots from "@/test/fixtures/rcx-cpbr16-lightweight-robots.json"

const TODAY = getTodayStr()

const ENTRY: BracketManifestEntry = {
  eventSlug: "rcx-cpbr16",
  eventName: "RCX - CPBR16",
  categoryRef: "lightweight",
  categoryName: "Lightweight - 27,2kg / 60lb",
  matchCount: 12,
  hasDoubleElim: true,
}

const realFetch = globalThis.fetch

function mockFetch() {
  globalThis.fetch = ((input: RequestInfo | URL) => {
    const url = String(input)
    const body = url.includes("/bracket") ? cpbr16Bracket : { data: cpbr16Robots }
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))
  }) as typeof fetch
}

async function readyGame(options: { disablePersistence?: boolean } = {}) {
  const rendered = renderHook(() =>
    useBracketGame(TODAY, "combate", { entryOverride: ENTRY, ...options }),
  )
  await waitFor(() => {
    expect(rendered.result.current.remote.status).toBe("ready")
  })
  return rendered
}

function fillableWithoutPick(current: ReturnType<typeof useBracketGame>) {
  return current.propagation!.slots.filter((s) => s.fillable && !current.picks.has(s.position))
}

async function fillAll(rendered: Awaited<ReturnType<typeof readyGame>>) {
  for (let i = 0; i < 20 && !rendered.result.current.canConfirm; i++) {
    const slot = fillableWithoutPick(rendered.result.current)[0]!
    act(() => rendered.result.current.setPick(slot.position, slot.a ?? slot.b!))
  }
}

beforeEach(() => {
  localStorage.clear()
  mockFetch()
})

afterAll(() => {
  globalThis.fetch = realFetch
})

describe("useBracketGame", () => {
  test("loads the bracket and exposes only entry slots as fillable", async () => {
    const { result } = await readyGame()
    expect(result.current.pendingCount).toBeGreaterThan(0)
    expect(result.current.canConfirm).toBe(false)
    const fillable = fillableWithoutPick(result.current)
    expect(fillable.length).toBeGreaterThan(0)
    for (const slot of fillable) {
      expect(slot.a ?? slot.b).toBeTruthy()
    }
  })

  test("editing an upstream pick orphans dependent downstream picks", async () => {
    const { result } = await readyGame()
    const semi =
      result.current.remote.status === "ready"
        ? result.current.remote.window.slots.find((s) => s.role === "winners-semifinal")!
        : undefined!
    const match = fillableWithoutPick(result.current).find((s) => s.position === semi.position)!
    const [first, second] = [match.a!, match.b!]

    act(() => result.current.setPick(semi.position, first))
    const final = result.current.propagation!.slots.find((s) =>
      result.current.remote.status === "ready"
        ? result.current.remote.window.slots.some(
            (w) => w.position === s.position && w.role === "winners-final",
          )
        : false,
    )!
    expect([final.a, final.b]).toContain(first)

    act(() => result.current.setPick(final.position, first))
    expect(result.current.picks.get(final.position)).toBe(first)

    // Trocar a semi invalida o pick da final que dependia do primeiro robô.
    act(() => result.current.setPick(semi.position, second))
    expect(result.current.picks.has(final.position)).toBe(false)
  })

  test("confirm scores the picks, persists the result and records stats once", async () => {
    const rendered = await readyGame()
    await fillAll(rendered)
    expect(rendered.result.current.canConfirm).toBe(true)

    act(() => rendered.result.current.confirm())
    act(() => rendered.result.current.confirm())

    const { result } = rendered
    expect(result.current.confirmed).toBe(true)
    expect(result.current.result!.total).toBeGreaterThan(0)
    expect(loadBracketGame("combate", TODAY)?.confirmed).toBe(true)
    expect(loadBracketStats("combate").gamesPlayed).toBe(1)
    expect(loadBracketStats("sumo").gamesPlayed).toBe(0)
  })

  test("an unconfirmed draft survives a remount", async () => {
    const first = await readyGame()
    const slot = fillableWithoutPick(first.result.current)[0]!
    const name = slot.a ?? slot.b!
    act(() => first.result.current.setPick(slot.position, name))
    first.unmount()

    const second = await readyGame()
    expect(second.result.current.picks.get(slot.position)).toBe(name)
    expect(second.result.current.confirmed).toBe(false)
  })

  test("disablePersistence keeps storage untouched", async () => {
    const rendered = await readyGame({ disablePersistence: true })
    await fillAll(rendered)
    act(() => rendered.result.current.confirm())
    expect(rendered.result.current.confirmed).toBe(true)
    expect(loadBracketGame("combate", TODAY)).toBeUndefined()
    expect(loadBracketStats("combate").gamesPlayed).toBe(0)
  })
})
