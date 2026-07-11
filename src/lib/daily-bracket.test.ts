import { describe, expect, test } from "bun:test"

import { BRACKET_TRACKS } from "@/lib/bracket-modes"
import { bracketEntryId, getDailyBracket, pickDailyBracket } from "@/lib/daily-bracket"

describe("getDailyBracket", () => {
  test("is deterministic for the same date and track", () => {
    for (const track of BRACKET_TRACKS) {
      const a = getDailyBracket("2026-08-01", track)
      const b = getDailyBracket("2026-08-01", track)
      expect(bracketEntryId(a)).toBe(bracketEntryId(b))
    }
  })

  test("pinned date overrides the seeded pick", () => {
    const entry = getDailyBracket("2026-07-09", "combate")
    expect(bracketEntryId(entry)).toBe("rcx-cpbr16/lightweight")
  })

  test("cycles through the pool without throwing across many days", () => {
    for (let day = 1; day <= 60; day++) {
      const date = `2026-08-${String((day % 28) + 1).padStart(2, "0")}`
      for (const track of BRACKET_TRACKS) {
        expect(() => getDailyBracket(date, track)).not.toThrow()
      }
    }
  })
})

describe("pickDailyBracket — pin fallback", () => {
  const entry = (id: string) => {
    const [eventSlug, categoryRef] = id.split("/") as [string, string]
    return {
      eventSlug,
      eventName: eventSlug,
      categoryRef,
      categoryName: categoryRef,
      matchCount: 10,
      hasDoubleElim: true,
    }
  }
  const source = {
    pinned: { combate: { "2026-08-01": "fantasma/lightweight" }, sumo: {} },
    combate: [entry("a/ant"), entry("b/beetle")],
    sumo: [entry("c/3kg-r-c")],
  }

  test("pin para id inexistente cai no sorteio em vez de lançar", () => {
    const picked = pickDailyBracket(source, "2026-08-01", "combate")
    expect(["a/ant", "b/beetle"]).toContain(bracketEntryId(picked))
  })

  test("pin válido vence o sorteio", () => {
    const valid = {
      ...source,
      pinned: { combate: { "2026-08-01": "b/beetle" }, sumo: {} },
    }
    expect(bracketEntryId(pickDailyBracket(valid, "2026-08-01", "combate"))).toBe("b/beetle")
  })
})
