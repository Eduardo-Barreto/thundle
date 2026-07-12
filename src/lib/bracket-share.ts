import {
  namesMatch,
  resolveWinner,
  type BracketGraph,
  type BracketWindow,
} from "@/lib/bracket-logic"

/**
 * Correctness grid for the share text, grouped as the player reads the board:
 * semifinals, winners final, losers stretch, grand final(s). Mirrors the
 * scorePicks accounting for the conditional reset slot.
 */
export function shareRoundsFor(
  win: BracketWindow,
  picks: ReadonlyMap<number, string>,
  graph: BracketGraph,
  resetActive: boolean,
): boolean[][] {
  const correct = (position: number) => {
    const pick = picks.get(position)
    const real = resolveWinner(graph, position)
    return Boolean(pick && real && namesMatch(pick, real))
  }

  const semis: boolean[] = []
  const losersSlots: { position: number }[] = []
  for (const slot of win.slots) {
    if (slot.role === "winners-semifinal") semis.push(correct(slot.position))
    else if (
      slot.side === "losers" &&
      slot.role !== "grand-final" &&
      slot.role !== "grand-final-reset"
    ) {
      losersSlots.push({ position: slot.position })
    }
  }
  losersSlots.sort((a, b) => b.position - a.position)
  const losers = losersSlots.map((slot) => correct(slot.position))

  const winnersFinal = [correct(win.winnersFinalPosition)]
  const grandFinals: boolean[] = []
  if (win.grandFinalPosition != null) grandFinals.push(correct(win.grandFinalPosition))
  if (win.resetPosition != null && (graph.isBracketReset || resetActive)) {
    grandFinals.push(graph.isBracketReset && resetActive ? correct(win.resetPosition) : false)
  }

  const groups = [semis, winnersFinal, losers, grandFinals]
  return groups.filter((group) => group.length > 0)
}
