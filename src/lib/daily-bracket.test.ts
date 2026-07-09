import { describe, expect, test } from "bun:test"

import { BRACKET_TRACKS } from "@/lib/bracket-modes"
import { bracketEntryId, getDailyBracket } from "@/lib/daily-bracket"

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
