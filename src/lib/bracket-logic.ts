import type { ApiBracketMatch } from "@/lib/bracket-api"

type Side = "winners" | "losers"

export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

export function namesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return false
  if (na === nb) return true
  // Cell text is often truncated ("Raijū R" vs "Raijū RC"); accept a prefix
  // relation but require enough shared length to avoid conflating short names.
  if (Math.min(na.length, nb.length) < 3) return false
  return na.startsWith(nb) || nb.startsWith(na)
}

function pairOf(m: ApiBracketMatch): [string, string] {
  return [
    m.cell_robot_a ?? m.detail?.left.robot ?? "",
    m.cell_robot_b ?? m.detail?.right.robot ?? "",
  ]
}

function explicitWinner(m: ApiBracketMatch): string | null {
  return m.detail?.winner ?? m.cell_winner ?? null
}

function matchContains(m: ApiBracketMatch, name: string): boolean {
  const [a, b] = pairOf(m)
  return namesMatch(a, name) || namesMatch(b, name)
}

function samePair(x: ApiBracketMatch, y: ApiBracketMatch): boolean {
  const [xa, xb] = pairOf(x)
  const [ya, yb] = pairOf(y)
  return (namesMatch(xa, ya) && namesMatch(xb, yb)) || (namesMatch(xa, yb) && namesMatch(xb, ya))
}

function dedupe(names: string[]): string[] {
  const out: string[] = []
  for (const n of names) {
    if (n && !out.some((o) => namesMatch(o, n))) out.push(n)
  }
  return out
}

interface RoundView {
  side: Side
  index: number
  label: string
  positions: number[]
}

interface BracketEdge {
  fromPosition: number
  toPosition: number
}

export interface BracketGraph {
  matches: Map<number, ApiBracketMatch>
  winnersRounds: RoundView[]
  losersRounds: RoundView[]
  edges: BracketEdge[]
  /** Positions in play order: [grand final] or [grand final, reset]. */
  grandFinals: number[]
  isBracketReset: boolean
  winnersChampion: string | null
  losersChampion: string | null
  champion: string | null
}

function extractGrandFinals(matches: ApiBracketMatch[]): {
  grandFinals: ApiBracketMatch[]
  ladder: ApiBracketMatch[]
  isReset: boolean
} {
  const hasLosers = matches.some((m) => m.side === "losers")
  const hasWinners = matches.some((m) => m.side === "winners")
  if (!hasLosers || !hasWinners) {
    return { grandFinals: [], ladder: matches, isReset: false }
  }

  const byPos = [...matches].sort((a, b) => b.position - a.position)
  const top = byPos[0]
  const second = byPos[1]
  if (!top) return { grandFinals: [], ladder: matches, isReset: false }

  // A bracket reset shows up as the two highest positions being the same pair,
  // with the losers-tagged match (GF1) sitting one position below the
  // winners-tagged rematch (GF2). A winners final that happens to be a rematch
  // of its own losers final never has the winners match on top, so it is not
  // mistaken for a reset.
  const isReset =
    !!second && top.side === "winners" && second.side === "losers" && samePair(top, second)

  if (isReset && second) {
    const gfPositions = new Set([top.position, second.position])
    return {
      grandFinals: [second, top],
      ladder: matches.filter((m) => !gfPositions.has(m.position)),
      isReset: true,
    }
  }

  return {
    grandFinals: [top],
    ladder: matches.filter((m) => m.position !== top.position),
    isReset: false,
  }
}

/**
 * Group a flat, single-side match list into content-inferred rounds. Ported
 * from robocore-scraper's layout.ts: upstream gives no edges, and the losers
 * side numbers positions in reverse (position 1 = losers final), so rounds are
 * derived by walking matches in chronological order and placing each one after
 * the latest round any of its robots already appeared in.
 */
function groupIntoRounds(matches: ApiBracketMatch[]): ApiBracketMatch[][] {
  const first = matches[0]
  if (!first) return []
  const isLosers = first.side === "losers"
  const sorted = [...matches].sort((a, b) =>
    isLosers ? b.position - a.position : a.position - b.position,
  )

  const roundOf = new Map<number, number>()
  const playedBy = new Map<string, number[]>()
  let lastRound = 0

  for (const m of sorted) {
    const slots = pairOf(m).filter((s): s is string => !!s)
    let parentRound = -1
    for (const slot of slots) {
      for (const pos of lookupHistory(playedBy, slot)) {
        const r = roundOf.get(pos)
        if (r != null && r > parentRound) parentRound = r
      }
    }
    // Monotonic guard: fresh matches (both robots new) must not fall behind an
    // earlier match at the same tournament stage that carried one robot over.
    let myRound = parentRound + 1
    if (myRound < lastRound) myRound = lastRound
    roundOf.set(m.position, myRound)
    lastRound = myRound
    for (const slot of slots) addHistory(playedBy, slot, m.position)
  }

  const maxRound = Math.max(0, ...roundOf.values())
  const rounds: ApiBracketMatch[][] = Array.from({ length: maxRound + 1 }, () => [])
  for (const m of sorted) rounds[roundOf.get(m.position) ?? 0]!.push(m)
  while (rounds.length > 0 && rounds[rounds.length - 1]!.length === 0) rounds.pop()
  return rounds
}

function lookupHistory(index: Map<string, number[]>, needle: string): number[] {
  const exact = index.get(needle)
  if (exact && exact.length) return exact
  const out: number[] = []
  for (const [stored, positions] of index) {
    if (namesMatch(stored, needle)) out.push(...positions)
  }
  return out
}

function addHistory(index: Map<string, number[]>, name: string, pos: number): void {
  const list = index.get(name)
  if (list) list.push(pos)
  else index.set(name, [pos])
}

function winnersLabel(index: number, total: number): string {
  const fromEnd = total - 1 - index
  if (fromEnd === 0) return "Final"
  if (fromEnd === 1) return "Semifinal"
  if (fromEnd === 2) return "Quartas"
  if (fromEnd === 3) return "Oitavas"
  return `R${index + 1}`
}

function losersLabel(index: number, total: number): string {
  return index === total - 1 ? "Final da Losers" : `Losers R${index + 1}`
}

function toRoundViews(groups: ApiBracketMatch[][], side: Side): RoundView[] {
  return groups.map((group, index) => ({
    side,
    index,
    label:
      side === "winners" ? winnersLabel(index, groups.length) : losersLabel(index, groups.length),
    positions: group.map((m) => m.position),
  }))
}

function buildEdges(
  winners: ApiBracketMatch[][],
  losers: ApiBracketMatch[][],
  grandFinals: ApiBracketMatch[],
): BracketEdge[] {
  const edges: BracketEdge[] = []
  const linkSide = (groups: ApiBracketMatch[][]) => {
    for (let r = 0; r < groups.length - 1; r++) {
      const cur = groups[r]
      const next = groups[r + 1]
      if (!cur || !next) continue
      for (const child of next) {
        const [ca, cb] = pairOf(child)
        for (const parent of cur) {
          if (matchContains(parent, ca) || matchContains(parent, cb)) {
            edges.push({ fromPosition: parent.position, toPosition: child.position })
          }
        }
      }
    }
  }
  linkSide(winners)
  linkSide(losers)
  const winnersFinal = winners.at(-1)?.[0]
  const losersFinal = losers.at(-1)?.[0]
  const gf1 = grandFinals[0]
  if (gf1) {
    if (winnersFinal) edges.push({ fromPosition: winnersFinal.position, toPosition: gf1.position })
    if (losersFinal) edges.push({ fromPosition: losersFinal.position, toPosition: gf1.position })
    const gf2 = grandFinals[1]
    if (gf2) edges.push({ fromPosition: gf1.position, toPosition: gf2.position })
  }
  return edges
}

export function buildBracketGraph(matches: ApiBracketMatch[]): BracketGraph {
  const { grandFinals, ladder, isReset } = extractGrandFinals(matches)
  const winnersGroups = groupIntoRounds(ladder.filter((m) => m.side === "winners"))
  const losersGroups = groupIntoRounds(ladder.filter((m) => m.side === "losers"))

  const byPosition = new Map<number, ApiBracketMatch>()
  for (const m of matches) byPosition.set(m.position, m)

  const graph: BracketGraph = {
    matches: byPosition,
    winnersRounds: toRoundViews(winnersGroups, "winners"),
    losersRounds: toRoundViews(losersGroups, "losers"),
    edges: buildEdges(winnersGroups, losersGroups, grandFinals),
    grandFinals: grandFinals.map((m) => m.position),
    isBracketReset: isReset,
    winnersChampion: null,
    losersChampion: null,
    champion: null,
  }

  const winnersFinalPos = winnersGroups.at(-1)?.[0]?.position ?? null
  const losersFinalPos = losersGroups.at(-1)?.[0]?.position ?? null
  graph.winnersChampion = winnersFinalPos != null ? resolveWinner(graph, winnersFinalPos) : null
  graph.losersChampion = losersFinalPos != null ? resolveWinner(graph, losersFinalPos) : null
  const lastGf = graph.grandFinals.at(-1)
  graph.champion = lastGf != null ? resolveWinner(graph, lastGf) : graph.winnersChampion

  return graph
}

function losersChronology(graph: BracketGraph): number[] {
  return graph.losersRounds.flatMap((r) => r.positions).sort((a, b) => b - a)
}

// Cell fields carry truncated text ("Raijū R"); resolve a winner candidate back
// to the fuller of the two participant names so returned names stay canonical.
function canonicalizeWinner(m: ApiBracketMatch, candidate: string): string {
  const [a, b] = pairOf(m)
  if (namesMatch(a, candidate)) return a.length >= candidate.length ? a : candidate
  if (namesMatch(b, candidate)) return b.length >= candidate.length ? b : candidate
  return candidate
}

function inferLosersWinner(graph: BracketGraph, m: ApiBracketMatch): string | null {
  // The winner of a losers match is the pair member that shows up in a later
  // match; the loser is eliminated and never appears again.
  const chronology = losersChronology(graph)
  const idx = chronology.indexOf(m.position)
  const later: ApiBracketMatch[] = []
  if (idx >= 0) {
    for (let i = idx + 1; i < chronology.length; i++) {
      const pos = chronology[i]
      const mm = pos != null ? graph.matches.get(pos) : undefined
      if (mm) later.push(mm)
    }
  }
  for (const gf of graph.grandFinals) {
    const mm = graph.matches.get(gf)
    if (mm) later.push(mm)
  }

  const [a, b] = pairOf(m)
  const aLater = !!a && later.some((x) => matchContains(x, a))
  const bLater = !!b && later.some((x) => matchContains(x, b))
  if (aLater && !bLater) return a
  if (bLater && !aLater) return b
  return null
}

/** Real participants of a match, for the post-confirm reveal. */
export function matchParticipants(
  graph: BracketGraph,
  position: number,
): [string | null, string | null] {
  const m = graph.matches.get(position)
  if (!m) return [null, null]
  const [a, b] = pairOf(m)
  return [a || null, b || null]
}

export function resolveWinner(graph: BracketGraph, position: number): string | null {
  const m = graph.matches.get(position)
  if (!m) return null
  const explicit = explicitWinner(m)
  if (explicit) return canonicalizeWinner(m, explicit)
  if (m.side !== "losers") return null
  // Losers matches leave winner/cell_winner null; cell_loser_dropped names the
  // robot that won and advances through the losers bracket. Fall back to
  // content inference only if that field is missing.
  if (m.cell_loser_dropped) return canonicalizeWinner(m, m.cell_loser_dropped)
  return inferLosersWinner(graph, m)
}

function loserOf(graph: BracketGraph, position: number): string | null {
  const m = graph.matches.get(position)
  if (!m) return null
  const winner = resolveWinner(graph, position)
  if (!winner) return null
  const [a, b] = pairOf(m)
  if (namesMatch(a, winner)) return b
  if (namesMatch(b, winner)) return a
  return null
}

function losersEntryPosition(graph: BracketGraph, robot: string): number | null {
  // Earliest losers appearance = highest position (reverse numbering).
  for (const pos of losersChronology(graph)) {
    const m = graph.matches.get(pos)
    if (m && matchContains(m, robot)) return pos
  }
  return null
}

type ParticipantSource =
  | { kind: "given"; robot: string }
  | { kind: "winner-of"; position: number }
  | { kind: "loser-of"; position: number }

type WindowRole =
  | "winners-semifinal"
  | "winners-final"
  | "losers-entry"
  | "losers-semifinal"
  | "losers-final"
  | "grand-final"
  | "grand-final-reset"

export interface WindowSlot {
  position: number
  side: Side
  role: WindowRole
  label: string
  a: ParticipantSource
  b: ParticipantSource
  conditional?: boolean
}

export interface BracketWindow {
  slots: WindowSlot[]
  positions: number[]
  winnersFinalPosition: number
  losersFinalPosition: number
  grandFinalPosition: number | null
  resetPosition: number | null
}

const LABELS: Record<WindowRole, string> = {
  "winners-semifinal": "Semifinal",
  "winners-final": "Final (Winners)",
  "losers-entry": "Losers",
  "losers-semifinal": "Semifinal (Losers)",
  "losers-final": "Final (Losers)",
  "grand-final": "Grande Final",
  "grand-final-reset": "Grande Final (reset)",
}

/**
 * Carve out the "semifinals onward" slice the puzzle presents: the two winners
 * semifinals, the winners final, the losers matches from where the semifinal
 * losers drop in down to the losers final, and the grand final (plus a
 * conditional reset slot). Entry slots expose their real, given participants;
 * every other slot references upstream slots so picks can flow through.
 */
export function computeWindow(graph: BracketGraph): BracketWindow {
  const wRounds = graph.winnersRounds
  const finalRound = wRounds.at(-1)
  const semisRound = wRounds.at(-2)
  if (!finalRound || !semisRound) {
    throw new Error("bracket has no winners semifinals to build a window from")
  }
  const winnersFinalPosition = finalRound.positions[0]
  const semiPositions = semisRound.positions
  const losersFinalPosition = graph.losersRounds.at(-1)?.positions[0]
  if (winnersFinalPosition == null || losersFinalPosition == null) {
    throw new Error("bracket has no winners/losers final to build a window from")
  }

  const winnerOfRobot = (robot: string, candidates: number[]): ParticipantSource | null => {
    for (const p of candidates) {
      if (namesMatch(resolveWinner(graph, p), robot)) return { kind: "winner-of", position: p }
    }
    return null
  }

  // Map every winners-round loser that feeds this window to (dropName -> the
  // winners match it dropped from, its losers entry position).
  const droppers: { name: string; from: number; entry: number }[] = []
  for (const p of [...semiPositions, winnersFinalPosition]) {
    const loser = loserOf(graph, p)
    if (!loser) continue
    const entry = losersEntryPosition(graph, loser)
    if (entry != null) droppers.push({ name: loser, from: p, entry })
  }

  const windowStart = Math.max(...droppers.map((d) => d.entry))
  const losersWindowPositions = losersChronology(graph).filter((p) => p <= windowStart)

  const slots: WindowSlot[] = []

  for (const p of semiPositions) {
    const [a, b] = pairOf(graph.matches.get(p)!)
    slots.push({
      position: p,
      side: "winners",
      role: "winners-semifinal",
      label: LABELS["winners-semifinal"],
      a: { kind: "given", robot: a },
      b: { kind: "given", robot: b },
    })
  }

  {
    const [a, b] = pairOf(graph.matches.get(winnersFinalPosition)!)
    slots.push({
      position: winnersFinalPosition,
      side: "winners",
      role: "winners-final",
      label: LABELS["winners-final"],
      a: winnerOfRobot(a, semiPositions) ?? { kind: "given", robot: a },
      b: winnerOfRobot(b, semiPositions) ?? { kind: "given", robot: b },
    })
  }

  const sourceForParticipant = (matchPos: number, name: string): ParticipantSource => {
    const dropper = droppers.find((d) => d.entry === matchPos && namesMatch(d.name, name))
    if (dropper) return { kind: "loser-of", position: dropper.from }
    const feeder = losersWindowPositions
      .filter((q) => q > matchPos && namesMatch(resolveWinner(graph, q), name))
      .sort((x, y) => x - y)[0]
    if (feeder != null) return { kind: "winner-of", position: feeder }
    return { kind: "given", robot: name }
  }

  // A semifinal da losers é a partida imediatamente anterior à losers final
  // na corrente da janela — não toda partida vencida pelo campeão da losers.
  const finalIndex = losersWindowPositions.indexOf(losersFinalPosition)
  const losersSemiPosition = finalIndex > 0 ? losersWindowPositions[finalIndex - 1] : undefined

  for (const p of losersWindowPositions) {
    const [a, b] = pairOf(graph.matches.get(p)!)
    let role: WindowRole = "losers-entry"
    if (p === losersFinalPosition) role = "losers-final"
    else if (p === losersSemiPosition) role = "losers-semifinal"
    slots.push({
      position: p,
      side: "losers",
      role,
      label: LABELS[role],
      a: sourceForParticipant(p, a),
      b: sourceForParticipant(p, b),
    })
  }

  const gfSourceFor = (name: string): ParticipantSource => {
    if (namesMatch(name, graph.winnersChampion))
      return { kind: "winner-of", position: winnersFinalPosition }
    if (namesMatch(name, graph.losersChampion))
      return { kind: "winner-of", position: losersFinalPosition }
    return { kind: "given", robot: name }
  }

  const grandFinalPosition = graph.grandFinals[0] ?? null
  const resetPosition = graph.grandFinals[1] ?? null
  if (grandFinalPosition != null) {
    const [a, b] = pairOf(graph.matches.get(grandFinalPosition)!)
    slots.push({
      position: grandFinalPosition,
      side: "losers",
      role: "grand-final",
      label: LABELS["grand-final"],
      a: gfSourceFor(a),
      b: gfSourceFor(b),
    })
    if (resetPosition != null) {
      const [ra, rb] = pairOf(graph.matches.get(resetPosition)!)
      slots.push({
        position: resetPosition,
        side: "winners",
        role: "grand-final-reset",
        label: LABELS["grand-final-reset"],
        a: gfSourceFor(ra),
        b: gfSourceFor(rb),
        conditional: true,
      })
    }
  }

  return {
    slots,
    positions: slots.map((s) => s.position),
    winnersFinalPosition,
    losersFinalPosition,
    grandFinalPosition,
    resetPosition,
  }
}

type Picks = ReadonlyMap<number, string>

export interface PropagatedSlot {
  position: number
  a: string | null
  b: string | null
  fillable: boolean
  active: boolean
}

interface Propagation {
  slots: PropagatedSlot[]
  orphanedPicks: number[]
  resetActive: boolean
}

function resetActiveFrom(win: BracketWindow, picks: Picks): boolean {
  if (win.grandFinalPosition == null) return false
  const gfPick = picks.get(win.grandFinalPosition)
  const losersRobot = picks.get(win.losersFinalPosition)
  return !!gfPick && !!losersRobot && namesMatch(gfPick, losersRobot)
}

function computeDetermined(
  win: BracketWindow,
  picks: Picks,
): Map<number, { a: string | null; b: string | null }> {
  const det = new Map<number, { a: string | null; b: string | null }>()
  for (const s of win.slots) det.set(s.position, { a: null, b: null })

  const resolve = (src: ParticipantSource): string | null => {
    if (src.kind === "given") return src.robot
    if (src.kind === "winner-of") return picks.get(src.position) ?? null
    const pick = picks.get(src.position)
    const parts = det.get(src.position)
    if (!pick || !parts) return null
    if (parts.a && namesMatch(parts.a, pick)) return parts.b
    if (parts.b && namesMatch(parts.b, pick)) return parts.a
    return null
  }

  for (let i = 0; i < win.slots.length + 2; i++) {
    for (const s of win.slots) {
      det.set(s.position, { a: resolve(s.a), b: resolve(s.b) })
    }
  }
  return det
}

function computePossible(win: BracketWindow, picks: Picks): Map<number, string[]> {
  const possible = new Map<number, string[]>()
  for (const s of win.slots) possible.set(s.position, [])

  const resolve = (src: ParticipantSource): string[] => {
    if (src.kind === "given") return [src.robot]
    if (src.kind === "winner-of") {
      const pick = picks.get(src.position)
      if (pick != null) return [pick]
      return possible.get(src.position) ?? []
    }
    const parentPoss = possible.get(src.position) ?? []
    const pick = picks.get(src.position)
    if (pick != null) {
      const others = parentPoss.filter((x) => !namesMatch(x, pick))
      return others.length ? others : parentPoss
    }
    return parentPoss
  }

  for (let i = 0; i < win.slots.length + 2; i++) {
    for (const s of win.slots) {
      possible.set(s.position, dedupe([...resolve(s.a), ...resolve(s.b)]))
    }
  }
  return possible
}

/**
 * Project the player's picks through the window: derive each slot's
 * participants from upstream picks (not reality), flag which slots are ready to
 * fill, whether the conditional reset slot is live, and which existing picks
 * became impossible after an upstream edit so the caller can clear them.
 */
export function propagatePicks(win: BracketWindow, picks: Picks): Propagation {
  const effective = new Map<number, string>()
  for (const [k, v] of picks) effective.set(k, v)
  const orphaned = new Set<number>()

  for (let iter = 0; iter < win.slots.length + 2; iter++) {
    const possible = computePossible(win, effective)
    let changed = false
    for (const s of win.slots) {
      const pick = effective.get(s.position)
      if (pick == null) continue
      if (s.role === "grand-final-reset" && !resetActiveFrom(win, effective)) {
        orphaned.add(s.position)
        effective.delete(s.position)
        changed = true
        continue
      }
      const poss = possible.get(s.position) ?? []
      if (poss.length > 0 && !poss.some((p) => namesMatch(p, pick))) {
        orphaned.add(s.position)
        effective.delete(s.position)
        changed = true
      }
    }
    if (!changed) break
  }

  const resetActive = resetActiveFrom(win, effective)
  const det = computeDetermined(win, effective)
  const slots: PropagatedSlot[] = win.slots.map((s) => {
    const parts = det.get(s.position) ?? { a: null, b: null }
    const active = s.role === "grand-final-reset" ? resetActive : true
    return {
      position: s.position,
      a: parts.a,
      b: parts.b,
      fillable: active && parts.a != null && parts.b != null,
      active,
    }
  })

  return { slots, orphanedPicks: [...orphaned], resetActive }
}

interface Score {
  correctCount: number
  total: number
  championCorrect: boolean
}

/**
 * Pool-style scoring: each slot is compared against the real winner. A
 * predicted reset that never happened (and a real reset the player did not
 * predict) both count against the score.
 */
export function scorePicks(win: BracketWindow, picks: Picks, graph: BracketGraph): Score {
  const prop = propagatePicks(win, picks)
  let correctCount = 0
  let total = 0

  for (const s of win.slots) {
    if (s.role === "grand-final-reset") {
      const predicted = prop.resetActive
      if (!graph.isBracketReset && !predicted) continue
      total++
      if (graph.isBracketReset && predicted) {
        const real = resolveWinner(graph, s.position)
        const pick = picks.get(s.position)
        if (real && pick && namesMatch(pick, real)) correctCount++
      }
      continue
    }
    total++
    const real = resolveWinner(graph, s.position)
    const pick = picks.get(s.position)
    if (real && pick && namesMatch(pick, real)) correctCount++
  }

  const predictedChampion =
    prop.resetActive && win.resetPosition != null
      ? picks.get(win.resetPosition)
      : win.grandFinalPosition != null
        ? picks.get(win.grandFinalPosition)
        : undefined
  const championCorrect =
    !!graph.champion && !!predictedChampion && namesMatch(predictedChampion, graph.champion)

  return { correctCount, total, championCorrect }
}
