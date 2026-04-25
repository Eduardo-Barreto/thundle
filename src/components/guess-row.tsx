import { Tile } from "@/components/tile"
import type { GuessResult } from "@/types"

type GuessRowProps = {
  result: GuessResult
  rowDelay: number
}

export function GuessRow({ result, rowDelay }: GuessRowProps) {
  return (
    <div
      className="grid grid-cols-[100px_repeat(7,minmax(80px,1fr))] gap-2 md:grid-cols-[160px_repeat(7,minmax(120px,1fr))]"
      style={{
        animation: `row-in 300ms cubic-bezier(0.23,1,0.32,1) ${rowDelay}ms both`,
      }}
    >
      {/* Robot card — darkened photo bg + centered typography (like thunderatz.org) */}
      <div className="sticky left-0 z-20 bg-[#0A0A0A]/80 pr-2 backdrop-blur-md">
        <div className="relative flex min-h-[72px] items-center justify-center overflow-hidden rounded-lg md:min-h-[120px]">
          <img src={result.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
          {/* Dark overlay — 50% like thunderatz.org */}
          <div className="absolute inset-0 bg-black/50" />
          {/* Typography or name — centered, max-width 80% like thunderatz.org */}
          {result.typographyUrl ? (
            <img
              src={result.typographyUrl}
              alt={result.robotName}
              className="relative z-10 max-h-[60%] max-w-[80%] object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
            />
          ) : (
            <span className="relative z-10 px-1 text-center font-mono text-[11px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] md:text-xs">
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
