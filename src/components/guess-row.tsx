import { Tile } from "@/components/tile"
import type { GuessResult } from "@/types"

type GuessRowProps = {
  result: GuessResult
  rowDelay: number
}

export function GuessRow({ result, rowDelay }: GuessRowProps) {
  return (
    <div
      className="grid grid-cols-[110px_repeat(7,1fr)] gap-[5px]"
      style={{
        animation: `row-in 300ms cubic-bezier(0.23,1,0.32,1) ${rowDelay}ms both`,
      }}
    >
      <div className="text-t1 flex min-h-[84px] items-center px-1 font-mono text-sm font-bold">
        {result.robotName}
      </div>
      {result.cells.map((cell, i) => (
        <Tile key={cell.attribute} cell={cell} delay={rowDelay + (i + 1) * 60} />
      ))}
    </div>
  )
}
