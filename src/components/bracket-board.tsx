import type { CategoryRobot } from "@/lib/bracket-api"
import { resolveRobotImage } from "@/lib/bracket-images"
import {
  matchParticipants,
  namesMatch,
  resolveWinner,
  type BracketGraph,
  type BracketWindow,
  type PropagatedSlot,
  type WindowSlot,
} from "@/lib/bracket-logic"
import type { Robot } from "@/types"

const COL_W = 236
const CARD_W = 208
const CARD_H = 96
const V_GAP = 32
const LANE_GAP = 88

type LaidSlot = { windowSlot: WindowSlot; x: number; y: number }

type Layout = {
  slots: LaidSlot[]
  edges: { from: number; to: number }[]
  width: number
  height: number
  losersLabelY: number
}

/**
 * Posiciona a janela como uma chave de verdade: winners em colunas
 * (semis empilhadas → final centralizada → grand final), losers como a
 * corrente da reta final numa lane abaixo, e a losers final subindo para a
 * grand final — mesma convenção visual dos brackets da RoboCore.
 */
function layoutWindow(win: BracketWindow): Layout {
  const semis = win.slots.filter((s) => s.role === "winners-semifinal")
  const winnersFinal = win.slots.find((s) => s.role === "winners-final")
  const grandFinal = win.slots.find((s) => s.role === "grand-final")
  const reset = win.slots.find((s) => s.role === "grand-final-reset")
  const losers = win.slots
    .filter((s) => s.side === "losers")
    .filter((s) => s.role !== "grand-final" && s.role !== "grand-final-reset")
    .sort((a, b) => b.position - a.position)

  const slots: LaidSlot[] = []
  const edges: Layout["edges"] = []

  semis.forEach((windowSlot, index) => {
    slots.push({ windowSlot, x: 0, y: index * (CARD_H + V_GAP) })
  })
  const semiMidY = semis.length > 1 ? (CARD_H + V_GAP) / 2 : semis.length === 1 ? 0 : 0

  let gfX = COL_W
  if (winnersFinal) {
    slots.push({ windowSlot: winnersFinal, x: COL_W, y: semiMidY })
    for (const s of semis) edges.push({ from: s.position, to: winnersFinal.position })
    gfX = COL_W * 2
  }

  const winnersBottom = Math.max(semis.length * (CARD_H + V_GAP) - V_GAP, semiMidY + CARD_H)
  const losersLabelY = winnersBottom + LANE_GAP - 24
  const losersY = winnersBottom + LANE_GAP

  // A losers NÃO é uma corrente linear: partidas paralelas convergem (duas
  // entries alimentando a semifinal, como num bracket de verdade). As colunas
  // vêm da profundidade de dependência real (winner-of dentro da lane) e o y
  // de cada partida centraliza entre as que a alimentam.
  const losersSet = new Set(losers.map((s) => s.position))
  const feedersOf = (slot: WindowSlot): number[] =>
    [slot.a, slot.b]
      .filter((src) => src.kind === "winner-of" && losersSet.has(src.position))
      .map((src) => (src as { position: number }).position)

  const depths = new Map<number, number>()
  const depthOf = (slot: WindowSlot): number => {
    const known = depths.get(slot.position)
    if (known !== undefined) return known
    const feeders = feedersOf(slot)
    const depth =
      feeders.length === 0
        ? 0
        : 1 + Math.max(...feeders.map((p) => depthOf(losers.find((l) => l.position === p)!)))
    depths.set(slot.position, depth)
    return depth
  }
  for (const slot of losers) depthOf(slot)

  const losersPos = new Map<number, { x: number; y: number }>()
  const columnBottom = new Map<number, number>()
  const maxDepth = Math.max(0, ...losers.map((s) => depths.get(s.position) ?? 0))
  for (let depth = 0; depth <= maxDepth; depth++) {
    for (const slot of losers) {
      if (depths.get(slot.position) !== depth) continue
      const feeders = feedersOf(slot)
      let y: number
      if (feeders.length === 0) {
        y = (columnBottom.get(depth) ?? losersY - CARD_H - V_GAP) + CARD_H + V_GAP
      } else {
        const ys = feeders.map((p) => losersPos.get(p)!.y)
        y = ys.reduce((a, b) => a + b, 0) / ys.length
        const bottom = columnBottom.get(depth)
        if (bottom !== undefined && y < bottom + CARD_H + 12) y = bottom + CARD_H + V_GAP
      }
      losersPos.set(slot.position, { x: depth * COL_W, y })
      columnBottom.set(depth, y)
      slots.push({ windowSlot: slot, x: depth * COL_W, y })
      for (const from of feeders) edges.push({ from, to: slot.position })
    }
  }

  const losersFinal = losers.find((s) => s.role === "losers-final") ?? losers.at(-1)

  if (grandFinal) {
    const losersEndX = losers.length > 0 ? Math.max(...[...losersPos.values()].map((v) => v.x)) : 0
    const x = Math.max(gfX, losersEndX + COL_W)
    // A grand final senta entre a winners final e a losers final.
    const losersFinalY = losersFinal ? losersPos.get(losersFinal.position)!.y : losersY
    const y = losers.length > 0 ? (semiMidY + losersFinalY) / 2 : semiMidY
    slots.push({ windowSlot: grandFinal, x, y })
    if (winnersFinal) edges.push({ from: winnersFinal.position, to: grandFinal.position })
    if (losersFinal) edges.push({ from: losersFinal.position, to: grandFinal.position })
    if (reset) {
      slots.push({ windowSlot: reset, x: x + COL_W, y })
      edges.push({ from: grandFinal.position, to: reset.position })
    }
  }

  const width = Math.max(...slots.map((s) => s.x)) + CARD_W + 8
  const height = Math.max(...slots.map((s) => s.y)) + CARD_H + 8
  return { slots, edges, width, height, losersLabelY }
}

type RowView = {
  name: string | null
  picked: boolean
  clickable: boolean
  isRealWinner: boolean
  isWrongPick: boolean
  image: string | null
}

function Connectors({ layout }: { layout: Layout }) {
  const at = new Map(layout.slots.map((s) => [s.windowSlot.position, s]))
  return (
    <svg
      width={layout.width}
      height={layout.height}
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      {layout.edges.map(({ from, to }) => {
        const a = at.get(from)
        const b = at.get(to)
        if (!a || !b) return null
        const x1 = a.x + CARD_W
        const y1 = a.y + CARD_H / 2
        const x2 = b.x
        const y2 = b.y + CARD_H / 2
        const midX = x2 - (COL_W - CARD_W) / 2
        return (
          <path
            key={`${from}-${to}`}
            d={`M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`}
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="1.5"
          />
        )
      })}
    </svg>
  )
}

function RobotRow({ row, onClick }: { row: RowView; onClick: () => void }) {
  const stateClasses = row.isRealWinner
    ? "border-ok/60 bg-ok/10"
    : row.isWrongPick
      ? "border-wrong/60 bg-wrong/10"
      : row.picked
        ? "border-thunder-yellow/70 bg-thunder-yellow/8"
        : "border-transparent"

  if (!row.name) {
    return (
      <div className="flex h-8 items-center gap-2 rounded-md border border-transparent px-2">
        <div className="size-5 shrink-0 rounded-sm bg-white/6" />
        <span className="text-t3 truncate font-mono text-xs">???</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      disabled={!row.clickable}
      onClick={onClick}
      aria-pressed={row.picked}
      className={`flex h-8 w-full items-center gap-2 rounded-md border px-2 text-left transition-all duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] ${stateClasses} ${
        row.clickable ? "cursor-pointer hover:bg-white/6" : "cursor-default"
      }`}
    >
      {row.image ? (
        <img
          src={row.image}
          alt=""
          loading="lazy"
          className="size-5 shrink-0 rounded-sm object-cover"
        />
      ) : (
        <div className="size-5 shrink-0 rounded-sm bg-white/6" />
      )}
      <span
        className={`truncate font-mono text-[11px] ${row.picked || row.isRealWinner || row.isWrongPick ? "text-t1 font-bold" : "text-t2"}`}
      >
        {row.name}
      </span>
      {row.isRealWinner && <span className="text-ok ml-auto text-[10px]">✓</span>}
      {row.isWrongPick && <span className="text-wrong ml-auto text-[10px]">✗</span>}
    </button>
  )
}

type BoardProps = {
  window: BracketWindow
  graph: BracketGraph
  slots: PropagatedSlot[]
  picks: ReadonlyMap<number, string>
  confirmed: boolean
  thundleRobots: Robot[]
  apiRobots: CategoryRobot[]
  onPick: (position: number, robotName: string) => void
}

export function BracketBoard({
  window: win,
  graph,
  slots,
  picks,
  confirmed,
  thundleRobots,
  apiRobots,
  onPick,
}: BoardProps) {
  const layout = layoutWindow(win)
  const propagated = new Map(slots.map((s) => [s.position, s]))
  const image = (name: string | null) =>
    name ? resolveRobotImage(name, thundleRobots, apiRobots).src : null

  return (
    <section aria-label="Chave da competição" className="mb-6 overflow-x-auto pb-2">
      <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }}>
        <Connectors layout={layout} />
        <p
          className="text-t3 absolute font-mono text-[9px] font-bold tracking-widest uppercase"
          style={{ left: 0, top: layout.losersLabelY }}
        >
          Losers
        </p>
        {layout.slots.map(({ windowSlot, x, y }) => {
          const slot = propagated.get(windowSlot.position)
          if (!slot || !slot.active) return null
          const pick = picks.get(slot.position)
          const clickable = !confirmed && slot.fillable

          // Antes de confirmar o card mostra a previsão do jogador; depois,
          // a chave real preenchida, com o palpite errado apontado embaixo.
          const realWinner = confirmed ? resolveWinner(graph, slot.position) : null
          const [realA, realB] = confirmed
            ? matchParticipants(graph, slot.position)
            : [slot.a, slot.b]
          const pickWrong =
            confirmed && realWinner !== null && !(pick && namesMatch(pick, realWinner))

          const rows: RowView[] = [realA, realB].map((name) => ({
            name,
            picked: Boolean(!confirmed && name && pick === name),
            clickable: Boolean(clickable && name),
            isRealWinner: Boolean(confirmed && name && namesMatch(realWinner, name)),
            // O palpite perdedor fica vermelho no próprio card — só o verde no
            // vencedor parece vitória.
            isWrongPick: Boolean(pickWrong && name && pick && namesMatch(pick, name)),
            image: image(name),
          }))

          const pickVisible = rows.some((row) => row.isWrongPick)

          return (
            <div
              key={windowSlot.position}
              data-position={slot.position}
              className={`bg-surface absolute flex flex-col gap-1 rounded-lg border p-1.5 ${
                clickable && !pick ? "border-thunder-yellow/40" : "border-white/6"
              }`}
              style={{ left: x, top: y, width: CARD_W, height: CARD_H }}
            >
              <p className="text-t3 truncate px-1 font-mono text-[8px] tracking-widest uppercase">
                {windowSlot.label}
              </p>
              {rows.map((row, index) => (
                <RobotRow
                  key={row.name ?? index}
                  row={row}
                  onClick={() => row.name && onPick(slot.position, row.name)}
                />
              ))}
              {pickWrong && !pickVisible && (
                <p className="text-wrong absolute top-full left-1.5 pt-0.5 font-mono text-[9px] tracking-wider">
                  ✗ seu palpite: {pick ?? "—"}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
