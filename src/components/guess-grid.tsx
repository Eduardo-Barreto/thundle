import { GuessRow } from "@/components/guess-row"
import gameConfig from "@/config/game.json" with { type: "json" }
import type { GuessResult } from "@/types"

type GuessGridProps = {
  results: GuessResult[]
}

const COLUMN_LABELS = ["Robô", ...Object.values(gameConfig.attributes).map((a) => a.label)]

export function GuessGrid({ results }: GuessGridProps) {
  return (
    <section aria-label="Tentativas">
      <div className="flex flex-col gap-3 overflow-x-auto md:gap-4">
        {results.length > 0 && (
          <div
            className="grid grid-cols-[100px_repeat(7,minmax(80px,1fr))] gap-[5px] pb-0.5 md:grid-cols-[120px_repeat(7,minmax(100px,1fr))]"
            aria-hidden="true"
          >
            {COLUMN_LABELS.map((label, i) => (
              <span
                key={label}
                className={`text-t3 text-center font-mono text-[11px] font-bold tracking-widest uppercase md:text-xs ${i === 0 ? "sticky left-0 z-10 bg-[#0A0A0A] text-left" : ""}`}
              >
                {label}
              </span>
            ))}
          </div>
        )}
        {results.map((result, i) => (
          <GuessRow key={result.robotName} result={result} rowDelay={i * 60} />
        ))}
      </div>
    </section>
  )
}
