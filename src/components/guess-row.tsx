import { Tile } from "@/components/tile"
import type { GuessResult } from "@/types"

type GuessRowProps = {
  result: GuessResult
  isLatest: boolean
}

export function GuessRow({ result, isLatest }: GuessRowProps) {
  const hasImage = Boolean(result.imageUrl)

  return (
    <div
      className="grid grid-cols-[100px_repeat(7,minmax(80px,1fr))] gap-2 md:grid-cols-[160px_repeat(7,minmax(120px,1fr))]"
      style={isLatest ? { animation: "row-in 300ms cubic-bezier(0.23,1,0.32,1) both" } : undefined}
    >
      <div className="sticky left-0 z-20 overflow-visible bg-[#0A0A0A]">
        <div className="relative flex min-h-[72px] items-center justify-center overflow-hidden rounded-[10px] md:min-h-[120px]">
          {hasImage ? (
            <>
              <img
                src={result.imageUrl}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50" />
            </>
          ) : (
            <div className="bg-surface absolute inset-0" />
          )}
          {result.typographyUrl ? (
            <img
              src={result.typographyUrl}
              alt={result.robotName}
              className="relative z-10 max-h-[60%] max-w-[80%] object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
            />
          ) : (
            <span className="relative z-10 px-2 text-center font-mono text-[11px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] md:text-sm">
              {result.robotName}
            </span>
          )}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 left-full z-[5]"
          style={{
            width: "14px",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            maskImage: "linear-gradient(to right, rgba(0,0,0,0.9), transparent)",
            WebkitMaskImage: "linear-gradient(to right, rgba(0,0,0,0.9), transparent)",
            background: "linear-gradient(to right, rgba(10,10,10,0.5), transparent)",
          }}
        />
      </div>
      {result.cells.map((cell, i) => (
        <Tile key={cell.attribute} cell={cell} delay={isLatest ? (i + 1) * 60 : 0} />
      ))}
    </div>
  )
}
