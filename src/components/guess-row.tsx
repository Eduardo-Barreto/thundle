import { Tile } from "@/components/tile"
import type { GuessResult } from "@/types"

type GuessRowProps = {
  result: GuessResult
  rowDelay: number
}

export function GuessRow({ result, rowDelay }: GuessRowProps) {
  return (
    <div
      className="grid grid-cols-[140px_repeat(7,minmax(90px,1fr))] gap-[5px] md:grid-cols-[180px_repeat(7,minmax(110px,1fr))]"
      style={{
        animation: `row-in 300ms cubic-bezier(0.23,1,0.32,1) ${rowDelay}ms both`,
      }}
    >
      <div className="sticky left-0 z-10 flex min-h-[72px] items-center gap-2 bg-[#0A0A0A] px-1 md:min-h-[100px] md:gap-3">
        <img
          src={result.imageUrl}
          alt={result.robotName}
          className="size-9 shrink-0 rounded-full object-cover md:size-12"
        />
        <span className="text-t1 font-mono text-xs leading-tight font-bold md:text-sm">
          {result.robotName}
        </span>
      </div>
      {result.cells.map((cell, i) => (
        <Tile key={cell.attribute} cell={cell} delay={rowDelay + (i + 1) * 60} />
      ))}
    </div>
  )
}
