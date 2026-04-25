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
      <div className="sticky left-0 z-20 overflow-hidden rounded-lg bg-[#0A0A0A] pr-[5px] shadow-[8px_0_16px_rgba(0,0,0,0.7)]">
        <div className="relative flex min-h-[72px] items-end justify-center overflow-hidden rounded-lg md:min-h-[100px]">
          <img
            src={result.imageUrl}
            alt=""
            className="absolute inset-0 size-full object-cover brightness-50"
          />
          {result.typographyUrl ? (
            <img
              src={result.typographyUrl}
              alt={result.robotName}
              className="relative z-10 mb-1.5 h-5 max-w-[90%] object-contain drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] md:mb-2 md:h-7"
            />
          ) : (
            <span className="relative z-10 mb-1.5 truncate px-1 text-center font-mono text-[11px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] md:mb-2 md:text-xs">
              {result.robotName}
            </span>
          )}
        </div>
      </div>
      {result.cells.map((cell, i) => (
        <Tile key={cell.attribute} cell={cell} delay={rowDelay + (i + 1) * 60} />
      ))}
    </div>
  )
}
