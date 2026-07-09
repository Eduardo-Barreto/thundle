import type { CategoryRobot } from "@/lib/bracket-api"
import { resolveRobotImage } from "@/lib/bracket-images"
import {
  namesMatch,
  resolveWinner,
  type BracketGraph,
  type BracketWindow,
  type PropagatedSlot,
  type WindowSlot,
} from "@/lib/bracket-logic"
import type { Robot } from "@/types"

type PickResult = "correct" | "wrong"

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

function slotResult(
  windowSlot: WindowSlot,
  graph: BracketGraph,
  picks: ReadonlyMap<number, string>,
): PickResult | undefined {
  const pick = picks.get(windowSlot.position)
  if (!pick) return "wrong"
  const real = resolveWinner(graph, windowSlot.position)
  // namesMatch, não ===: o vencedor real pode vir de outro campo da API com o
  // nome truncado ("Raijū R" vs "Raijū RC") — o scoring já compara assim.
  return namesMatch(real, pick) ? "correct" : "wrong"
}

function RobotRow({
  name,
  picked,
  clickable,
  result,
  image,
  onClick,
}: {
  name: string | null
  picked: boolean
  clickable: boolean
  result?: PickResult
  image: string | null
  onClick: () => void
}) {
  const resultClasses =
    result === "correct"
      ? "border-ok/60 bg-ok/10"
      : result === "wrong"
        ? "border-wrong/60 bg-wrong/10"
        : picked
          ? "border-thunder-yellow/70 bg-thunder-yellow/8"
          : "border-transparent"

  if (!name) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5">
        <div className="size-6 shrink-0 rounded-sm bg-white/6" />
        <span className="text-t3 truncate font-mono text-xs">???</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onClick}
      aria-pressed={picked}
      className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-all duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] ${resultClasses} ${
        clickable ? "cursor-pointer hover:bg-white/6" : "cursor-default"
      }`}
    >
      {image ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          className="size-6 shrink-0 rounded-sm object-cover"
        />
      ) : (
        <div className="size-6 shrink-0 rounded-sm bg-white/6" />
      )}
      <span className={`truncate font-mono text-xs ${picked ? "text-t1 font-bold" : "text-t2"}`}>
        {name}
      </span>
      {result === "correct" && picked && <span className="text-ok ml-auto text-xs">✓</span>}
      {result === "wrong" && picked && <span className="text-wrong ml-auto text-xs">✗</span>}
    </button>
  )
}

function MatchCard({
  windowSlot,
  slot,
  graph,
  picks,
  confirmed,
  thundleRobots,
  apiRobots,
  onPick,
}: {
  windowSlot: WindowSlot
  slot: PropagatedSlot
  graph: BracketGraph
  picks: ReadonlyMap<number, string>
  confirmed: boolean
  thundleRobots: Robot[]
  apiRobots: CategoryRobot[]
  onPick: (position: number, robotName: string) => void
}) {
  if (!slot.active) return null
  const pick = picks.get(slot.position)
  const clickable = !confirmed && slot.fillable
  const result = confirmed ? slotResult(windowSlot, graph, picks) : undefined
  const realWinner = confirmed ? resolveWinner(graph, slot.position) : null

  return (
    <div
      data-position={slot.position}
      className={`bg-surface flex flex-col gap-1 rounded-lg border p-1.5 ${
        clickable && !pick ? "border-thunder-yellow/40" : "border-white/6"
      }`}
    >
      {[slot.a, slot.b].map((name, index) => (
        <RobotRow
          key={name ?? index}
          name={name}
          picked={Boolean(name && pick === name)}
          clickable={Boolean(clickable && name)}
          result={name && (pick === name || namesMatch(realWinner, name)) ? result : undefined}
          image={name ? resolveRobotImage(name, thundleRobots, apiRobots).src : null}
          onClick={() => name && onPick(slot.position, name)}
        />
      ))}
      {confirmed && realWinner && !namesMatch(pick, realWinner) && (
        <p className="text-t3 px-2 pb-1 font-mono text-[9px] tracking-wider uppercase">
          venceu: {realWinner}
        </p>
      )}
    </div>
  )
}

function Column({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-[180px] flex-1 flex-col justify-center gap-3">
      <p className="text-t3 text-center font-mono text-[9px] font-bold tracking-widest uppercase">
        {label}
      </p>
      {children}
    </div>
  )
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
  const byPosition = new Map(slots.map((s) => [s.position, s]))
  const cardFor = (windowSlot: WindowSlot) => {
    const slot = byPosition.get(windowSlot.position)
    if (!slot) return null
    return (
      <MatchCard
        key={windowSlot.position}
        windowSlot={windowSlot}
        slot={slot}
        graph={graph}
        picks={picks}
        confirmed={confirmed}
        thundleRobots={thundleRobots}
        apiRobots={apiRobots}
        onPick={onPick}
      />
    )
  }

  const semis: WindowSlot[] = []
  const winnersFinal: WindowSlot[] = []
  const grandFinals: WindowSlot[] = []
  const losers: WindowSlot[] = []
  for (const slot of win.slots) {
    if (slot.role === "winners-semifinal") semis.push(slot)
    else if (slot.role === "winners-final") winnersFinal.push(slot)
    else if (slot.role === "grand-final" || slot.role === "grand-final-reset")
      grandFinals.push(slot)
    else if (slot.side === "losers") losers.push(slot)
  }
  losers.sort((a, b) => b.position - a.position)

  return (
    <section aria-label="Chave da competição" className="mb-6 flex flex-col gap-6">
      <div className="flex gap-4 overflow-x-auto pb-2">
        <Column label="Semifinais">{semis.map(cardFor)}</Column>
        <Column label="Final · Winners">{winnersFinal.map(cardFor)}</Column>
        <Column label="Grand Final">{grandFinals.map(cardFor)}</Column>
      </div>
      {losers.length > 0 && (
        <div>
          <p className="text-t3 mb-3 font-mono text-[9px] font-bold tracking-widest uppercase">
            Losers
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {losers.map((windowSlot) => (
              <div key={windowSlot.position} className="min-w-[180px] flex-1">
                {cardFor(windowSlot)}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
