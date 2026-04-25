import type { CellResult } from "@/types"

const STYLES = {
  correct: "bg-ok-bg border-ok-border text-ok",
  partial: "bg-partial-bg border-partial-border text-partial",
  wrong: "bg-wrong-bg border-wrong-border text-wrong",
} as const

const ARROWS = { up: "\u2191", down: "\u2193" } as const

type TileProps = {
  cell: CellResult
  delay: number
}

export function Tile({ cell, delay }: TileProps) {
  return (
    <div
      className={`flex min-h-[72px] min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border px-1 tabular-nums md:min-h-[120px] ${STYLES[cell.status]}`}
      style={{
        animation: `tile-in 250ms cubic-bezier(0.23,1,0.32,1) ${delay}ms both`,
      }}
    >
      {cell.direction && (
        <span className="text-lg leading-none opacity-85 md:text-2xl">
          {ARROWS[cell.direction]}
        </span>
      )}
      <span className="w-full truncate text-center font-mono text-[13px] leading-none font-bold md:text-base">
        {String(cell.value)}
      </span>
    </div>
  )
}
