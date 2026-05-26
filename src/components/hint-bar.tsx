import gameConfig from "@/config/game.json" with { type: "json" }
import type { Robot } from "@/types"

type HintBarProps = {
  usedHint: boolean
  hintAttribute?: string
  answer: Robot
  onRequestHint: () => void
}

function getNestedValue(obj: Robot, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

export function HintBar({ usedHint, hintAttribute, answer, onRequestHint }: HintBarProps) {
  const hintConfig = hintAttribute
    ? gameConfig.attributes[hintAttribute as keyof typeof gameConfig.attributes]
    : undefined

  const hintValue = hintAttribute ? getNestedValue(answer, hintAttribute) : undefined
  const displayValue =
    typeof hintValue === "boolean" ? (hintValue ? "Sim" : "N\u00e3o") : String(hintValue ?? "")

  return (
    <div className="mb-7 flex items-center justify-center gap-3 md:mb-10 md:gap-4">
      <button
        type="button"
        onClick={onRequestHint}
        disabled={usedHint}
        aria-label="Pedir dica"
        className="text-t3 hover:border-thunder-yellow/20 hover:text-t2 focus-visible:outline-thunder-yellow disabled:hover:text-t3 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-white/6 px-4 py-2 font-mono text-xs font-bold tracking-wider uppercase transition-all duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-97 disabled:cursor-default disabled:opacity-30 disabled:hover:border-white/6 md:text-sm"
      >
        <svg
          aria-hidden="true"
          className="size-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
        </svg>
        Dica
      </button>
      {usedHint && hintConfig && (
        <output className="border-thunder-navy/80 bg-thunder-navy text-t2 rounded-md border px-3 py-2 font-mono text-xs font-bold tracking-wider uppercase md:text-sm">
          {hintConfig.label} &rarr; <span className="text-t1">{displayValue}</span>
        </output>
      )}
    </div>
  )
}
