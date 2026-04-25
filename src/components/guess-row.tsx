import { Tile } from "@/components/tile"
import type { GuessResult } from "@/types"

type GuessRowProps = {
  result: GuessResult
  rowDelay: number
}

export function GuessRow({ result, rowDelay }: GuessRowProps) {
  return (
    <div
      className="grid grid-cols-[100px_repeat(7,minmax(80px,1fr))] gap-[5px] md:grid-cols-[120px_repeat(7,minmax(100px,1fr))]"
      style={{
        animation: `row-in 300ms cubic-bezier(0.23,1,0.32,1) ${rowDelay}ms both`,
      }}
    >
      <div className="sticky left-0 z-10 flex min-h-[72px] flex-col items-center justify-center gap-1.5 bg-[#0A0A0A] px-1 md:min-h-[100px]">
        <span className="text-t1 w-full truncate text-center font-mono text-[11px] leading-tight font-bold md:text-xs">
          {result.robotName}
        </span>
        <img
          src={result.imageUrl}
          alt={result.robotName}
          className="size-10 shrink-0 rounded-lg object-cover md:size-14"
        />
      </div>
      {result.cells.map((cell, i) => (
        <Tile key={cell.attribute} cell={cell} delay={rowDelay + (i + 1) * 60} />
      ))}
    </div>
  )
}
