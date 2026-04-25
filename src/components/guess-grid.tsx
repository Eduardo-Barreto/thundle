import { GuessRow } from "@/components/guess-row"
import gameConfig from "@/config/game.json" with { type: "json" }
import type { GuessResult } from "@/types"

type GuessGridProps = {
  results: GuessResult[]
}

const COLUMN_LABELS = ["Rob\u00f4", ...Object.values(gameConfig.attributes).map((a) => a.label)]

export function GuessGrid({ results }: GuessGridProps) {
  return (
    <section aria-label="Tentativas" className="flex flex-col gap-[5px]">
      {results.length > 0 && (
        <div className="grid grid-cols-[110px_repeat(7,1fr)] gap-[5px] pb-0.5" aria-hidden="true">
          {COLUMN_LABELS.map((label) => (
            <span
              key={label}
              className="text-t3 text-center font-mono text-[9px] font-bold tracking-widest uppercase first:text-left"
            >
              {label}
            </span>
          ))}
        </div>
      )}
      {results.map((result, i) => (
        <GuessRow key={result.robotName} result={result} rowDelay={i * 60} />
      ))}
    </section>
  )
}
