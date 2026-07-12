import { describe, expect, test } from "bun:test"

import type { ApiBracketMatch } from "@/lib/bracket-api"
import { buildBracketGraph, computeWindow, resolveWinner } from "@/lib/bracket-logic"
import { shareRoundsFor } from "@/lib/bracket-share"
import rcbr from "@/test/fixtures/rcbr-2025-3kg-rc-bracket.json"
import cpbr16 from "@/test/fixtures/rcx-cpbr16-lightweight-bracket.json"

function allCorrectPicks(matches: ApiBracketMatch[]) {
  const graph = buildBracketGraph(matches)
  const win = computeWindow(graph)
  const picks = new Map<number, string>()
  for (const slot of win.slots) {
    const real = resolveWinner(graph, slot.position)
    if (real) picks.set(slot.position, real)
  }
  return { graph, win, picks }
}

describe("shareRoundsFor", () => {
  test("all-correct picks produce an all-green grid matching the window", () => {
    const { graph, win, picks } = allCorrectPicks(cpbr16.matches as ApiBracketMatch[])
    const rounds = shareRoundsFor(win, picks, graph, false)
    const flat = rounds.flat()
    expect(flat.every(Boolean)).toBe(true)
    expect(flat).toHaveLength(win.slots.length)
    // semis, winners final, losers, grand final
    expect(rounds[0]).toHaveLength(2)
    expect(rounds[1]).toHaveLength(1)
  })

  test("a wrong pick turns exactly its slot red", () => {
    const { graph, win, picks } = allCorrectPicks(cpbr16.matches as ApiBracketMatch[])
    const semi = win.slots.find((s) => s.role === "winners-semifinal")!
    const real = resolveWinner(graph, semi.position)!
    const match = graph.matches.get(semi.position)!
    const loser = match.cell_robot_a === real ? match.cell_robot_b : match.cell_robot_a
    picks.set(semi.position, loser!)
    const rounds = shareRoundsFor(win, picks, graph, false)
    expect(rounds.flat().filter((ok) => !ok)).toHaveLength(1)
    expect(rounds[0]).toContain(false)
  })

  test("a real bracket reset the player skipped counts as a red slot", () => {
    const { graph, win, picks } = allCorrectPicks(rcbr.matches as ApiBracketMatch[])
    expect(graph.isBracketReset).toBe(true)
    picks.delete(win.resetPosition!)
    // resetActive=false: o jogador previu o campeão da winners na GF1.
    const rounds = shareRoundsFor(win, picks, graph, false)
    const grandFinals = rounds.at(-1)!
    expect(grandFinals).toHaveLength(2)
    expect(grandFinals[1]).toBe(false)
  })
})
