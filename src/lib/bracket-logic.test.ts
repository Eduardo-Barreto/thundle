import { describe, expect, test } from "bun:test"

import type { BracketResponse } from "@/lib/bracket-api"
import {
  buildBracketGraph,
  computeWindow,
  namesMatch,
  normalizeName,
  propagatePicks,
  resolveWinner,
  scorePicks,
} from "@/lib/bracket-logic"
import rcbrJson from "@/test/fixtures/rcbr-2025-3kg-rc-bracket.json" with { type: "json" }
import cpbrJson from "@/test/fixtures/rcx-cpbr16-lightweight-bracket.json" with { type: "json" }

const rcbr = rcbrJson as unknown as BracketResponse
const cpbr = cpbrJson as unknown as BracketResponse

const rcbrGraph = buildBracketGraph(rcbr.matches)
const cpbrGraph = buildBracketGraph(cpbr.matches)

describe("namesMatch / normalizeName", () => {
  test("normalizes accents, case and spacing", () => {
    expect(normalizeName("Raijū RC")).toBe("raiju rc")
    expect(normalizeName("  Coelho   Escovado ")).toBe("coelho escovado")
  })

  test("truncated cell text matches its full name", () => {
    expect(namesMatch("Raijū R", "Raijū RC")).toBe(true)
    expect(namesMatch("Nekomata -", "Nekomata - RC")).toBe(true)
  })

  test("distinct robots do not match", () => {
    expect(namesMatch("Atena", "Artemis RC")).toBe(false)
    expect(namesMatch("Tim Maia", "Coelho Escovado")).toBe(false)
  })

  test("empty / nullish never match", () => {
    expect(namesMatch(null, "Tim Maia")).toBe(false)
    expect(namesMatch("", "")).toBe(false)
  })
})

describe("buildBracketGraph — round inference", () => {
  test("rcbr winners rounds collapse to 4 rounds ending in the final", () => {
    const sizes = rcbrGraph.winnersRounds.map((r) => r.positions.length)
    expect(sizes).toEqual([6, 4, 2, 1])
    expect(rcbrGraph.winnersRounds.at(-1)?.positions).toEqual([29])
    expect(rcbrGraph.winnersRounds.at(-2)?.positions).toEqual([27, 28])
  })

  test("rcbr losers rounds infer the full reverse-numbered ladder", () => {
    const sizes = rcbrGraph.losersRounds.map((r) => r.positions.length)
    expect(sizes).toEqual([2, 4, 2, 2, 1, 1])
    expect(rcbrGraph.losersRounds.at(-1)?.positions).toEqual([1])
  })

  test("cpbr winners and losers rounds", () => {
    expect(cpbrGraph.winnersRounds.map((r) => r.positions.length)).toEqual([3, 2, 1])
    expect(cpbrGraph.winnersRounds.at(-1)?.positions).toEqual([13])
    expect(cpbrGraph.losersRounds.map((r) => r.positions.length)).toEqual([2, 1, 1, 1])
  })
})

describe("resolveWinner", () => {
  test("rcbr resolves every match unambiguously, inferring the winner-null losers", () => {
    for (const m of rcbr.matches) {
      expect(resolveWinner(rcbrGraph, m.position)).not.toBeNull()
    }
    // Losers ladder carries winner=null everywhere and must be inferred.
    expect(resolveWinner(rcbrGraph, 1)).toBe("Tim Maia")
    expect(resolveWinner(rcbrGraph, 5)).toBe("Nekomata - RC")
    expect(resolveWinner(rcbrGraph, 7)).toBe("Raijū RC")
  })

  test("cpbr resolves every match", () => {
    for (const m of cpbr.matches) {
      expect(resolveWinner(cpbrGraph, m.position)).not.toBeNull()
    }
  })

  test("losers cell_loser_dropped names the winner in both fixtures", () => {
    for (const [graph, res] of [
      [rcbrGraph, rcbr],
      [cpbrGraph, cpbr],
    ] as const) {
      for (const m of res.matches) {
        if (m.side !== "losers" || !m.cell_loser_dropped) continue
        expect(namesMatch(resolveWinner(graph, m.position), m.cell_loser_dropped)).toBe(true)
      }
    }
  })

  test("champions", () => {
    expect(rcbrGraph.winnersChampion).toBe("Coelho Escovado")
    expect(rcbrGraph.losersChampion).toBe("Tim Maia")
    expect(rcbrGraph.champion).toBe("Tim Maia")

    expect(cpbrGraph.winnersChampion).toBe("K-torze")
    expect(cpbrGraph.losersChampion).toBe("Federal M.T.")
    expect(cpbrGraph.champion).toBe("K-torze")
  })
})

describe("grand final detection", () => {
  test("rcbr has a double grand final (bracket reset) at 30/31", () => {
    expect(rcbrGraph.isBracketReset).toBe(true)
    expect(rcbrGraph.grandFinals).toEqual([30, 31])
  })

  test("cpbr has a single grand final at 14, not a reset", () => {
    expect(cpbrGraph.isBracketReset).toBe(false)
    expect(cpbrGraph.grandFinals).toEqual([14])
  })
})

describe("computeWindow", () => {
  test("rcbr window: 2 semis + final + 4 losers + GF + reset", () => {
    const win = computeWindow(rcbrGraph)
    expect(win.positions).toEqual([27, 28, 29, 4, 3, 2, 1, 30, 31])
    expect(win.resetPosition).not.toBeNull()
    expect(win.grandFinalPosition).toBe(30)
    expect(win.resetPosition).toBe(31)
    expect(win.winnersFinalPosition).toBe(29)
    expect(win.losersFinalPosition).toBe(1)
  })

  test("rcbr window entry participants are the real, given robots", () => {
    const win = computeWindow(rcbrGraph)
    const semi = win.slots.find((s) => s.position === 27)!
    expect(semi.a).toEqual({ kind: "given", robot: "Coelho Escovado" })
    expect(semi.b).toEqual({ kind: "given", robot: "Frank (RC)" })

    // Losers entry: the survivor is given, the semi loser drops in.
    const entry = win.slots.find((s) => s.position === 3)!
    expect(entry.a).toEqual({ kind: "given", robot: "Nekomata - RC" })
    expect(entry.b).toEqual({ kind: "loser-of", position: 28 })

    // Losers final: winner of the losers semi vs the loser of the winners final.
    const losersFinal = win.slots.find((s) => s.position === 1)!
    expect(losersFinal.a).toEqual({ kind: "winner-of", position: 2 })
    expect(losersFinal.b).toEqual({ kind: "loser-of", position: 29 })

    // Grand final pairs the two champions.
    const gf = win.slots.find((s) => s.position === 30)!
    expect(gf.a).toEqual({ kind: "winner-of", position: 1 })
    expect(gf.b).toEqual({ kind: "winner-of", position: 29 })
  })

  test("cpbr window has no reset slot", () => {
    const win = computeWindow(cpbrGraph)
    expect(win.positions).toEqual([11, 12, 13, 4, 3, 2, 1, 14])
    expect(win.resetPosition).toBeNull()
    expect(win.resetPosition).toBeNull()
    expect(win.slots.some((s) => s.role === "grand-final-reset")).toBe(false)
  })
})

describe("propagatePicks", () => {
  test("empty picks: only the entry slots are fillable", () => {
    const win = computeWindow(rcbrGraph)
    const prop = propagatePicks(win, new Map())
    const fillable = prop.slots
      .filter((s) => s.fillable)
      .map((s) => s.position)
      .sort((a, b) => a - b)
    // Only the winners semis start with both participants known; every losers
    // entry waits on the semifinal loser that drops into it.
    expect(fillable).toEqual([27, 28])
    expect(prop.resetActive).toBe(false)
  })

  test("picks flow downstream into derived participants", () => {
    const win = computeWindow(rcbrGraph)
    const picks = new Map<number, string>([
      [27, "Coelho Escovado"],
      [28, "Dragonite RC"],
    ])
    const prop = propagatePicks(win, picks)
    const final = prop.slots.find((s) => s.position === 29)!
    expect(final.a).toBe("Coelho Escovado")
    expect(final.b).toBe("Dragonite RC")
    expect(final.fillable).toBe(true)
    // Loser of semi 28 (Tim Maia) drops into losers entry 3.
    const entry = prop.slots.find((s) => s.position === 3)!
    expect(entry.b).toBe("Tim Maia")
  })

  test("editing an upstream pick orphans the now-impossible downstream pick", () => {
    const win = computeWindow(rcbrGraph)
    const picks = new Map<number, string>([
      [27, "Coelho Escovado"],
      [28, "Dragonite RC"],
      [29, "Coelho Escovado"],
    ])
    expect(propagatePicks(win, picks).orphanedPicks).toEqual([])

    // Change semi 27 so Coelho no longer reaches the final; the final pick dies.
    const edited = new Map(picks)
    edited.set(27, "Frank (RC)")
    const prop = propagatePicks(win, edited)
    expect(prop.orphanedPicks).toContain(29)
  })

  test("the conditional reset slot activates only when the losers robot wins GF1", () => {
    const win = computeWindow(rcbrGraph)
    const base = new Map<number, string>([
      [27, "Coelho Escovado"],
      [28, "Dragonite RC"],
      [29, "Coelho Escovado"],
      [4, "Frank (RC)"],
      [3, "Tim Maia"],
      [2, "Tim Maia"],
      [1, "Tim Maia"],
    ])

    const winnersWinsGf = new Map(base)
    winnersWinsGf.set(30, "Coelho Escovado")
    expect(propagatePicks(win, winnersWinsGf).resetActive).toBe(false)

    const losersWinsGf = new Map(base)
    losersWinsGf.set(30, "Tim Maia")
    const prop = propagatePicks(win, losersWinsGf)
    expect(prop.resetActive).toBe(true)
    expect(prop.slots.find((s) => s.position === 31)?.active).toBe(true)
  })
})

describe("scorePicks", () => {
  test("a fully correct bolão scores every slot and the champion", () => {
    const win = computeWindow(rcbrGraph)
    const picks = new Map<number, string>([
      [27, "Coelho Escovado"],
      [28, "Dragonite RC"],
      [29, "Coelho Escovado"],
      [4, "Frank (RC)"],
      [3, "Tim Maia"],
      [2, "Tim Maia"],
      [1, "Tim Maia"],
      [30, "Tim Maia"],
      [31, "Tim Maia"],
    ])
    const score = scorePicks(win, picks, rcbrGraph)
    expect(score.total).toBe(9)
    expect(score.correctCount).toBe(9)
    expect(score.championCorrect).toBe(true)
  })

  test("predicting no reset when the real bracket had one costs the reset slot", () => {
    const win = computeWindow(rcbrGraph)
    const picks = new Map<number, string>([
      [27, "Coelho Escovado"],
      [28, "Dragonite RC"],
      [29, "Coelho Escovado"],
      [4, "Frank (RC)"],
      [3, "Tim Maia"],
      [2, "Tim Maia"],
      [1, "Tim Maia"],
      [30, "Coelho Escovado"], // player says the winners champ closes it out
    ])
    const score = scorePicks(win, picks, rcbrGraph)
    // Reset really happened, so it still counts toward the total but is wrong,
    // and GF1 itself is wrong (Tim Maia actually won it).
    expect(score.total).toBe(9)
    expect(score.correctCount).toBe(7)
    expect(score.championCorrect).toBe(false)
  })

  test("cpbr scoring without a reset slot", () => {
    const win = computeWindow(cpbrGraph)
    const picks = new Map<number, string>([
      [11, "K-torze"],
      [12, "Federal M.T."],
      [13, "K-torze"],
      [4, "Ragnar"],
      [3, "Cáragor"],
      [2, "Cáragor"],
      [1, "Federal M.T."],
      [14, "K-torze"],
    ])
    const score = scorePicks(win, picks, cpbrGraph)
    expect(score.total).toBe(8)
    expect(score.correctCount).toBe(8)
    expect(score.championCorrect).toBe(true)
  })
})
