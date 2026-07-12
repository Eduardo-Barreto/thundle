import { useState } from "react"

import { BRACKET_TRACK_META, BRACKET_TRACKS } from "@/lib/bracket-modes"
import { IMAGE_MODE_META } from "@/lib/image-modes"
import type { GameMode } from "@/lib/routing"
import { loadBracketStats, loadImageStats, loadStats } from "@/lib/storage"
import type { BracketTrack, ImageGameVariant, Stats } from "@/types"

type StatsTabKey = "classic" | ImageGameVariant | `bracket-${BracketTrack}`

type StatsModalProps = {
  mode: GameMode
  track?: BracketTrack
  onClose: () => void
}

const TABS: { key: StatsTabKey; label: string }[] = [
  { key: "classic", label: "Clássico" },
  { key: "blur", label: IMAGE_MODE_META.blur.label },
  { key: "zoom", label: IMAGE_MODE_META.zoom.label },
  ...BRACKET_TRACKS.map((track) => ({
    key: `bracket-${track}` as const,
    label: BRACKET_TRACK_META[track].label,
  })),
]

const BUCKETS = ["1", "2-3", "4-6", "7-10", "11+"]

function statsForTab(key: StatsTabKey): Stats {
  if (key === "classic") return loadStats()
  if (key.startsWith("bracket-")) {
    return loadBracketStats(key.slice("bracket-".length) as BracketTrack)
  }
  return loadImageStats(key as ImageGameVariant)
}

function initialTab(mode: GameMode, track: BracketTrack | undefined): StatsTabKey {
  if (mode === "bracket") return `bracket-${track ?? "combate"}`
  return mode
}

export function StatsModal({ mode, track, onClose }: StatsModalProps) {
  const [selectedTab, setSelectedTab] = useState<StatsTabKey | null>(null)
  const activeTab = selectedTab ?? initialTab(mode, track)
  const stats = statsForTab(activeTab)
  const maxBucket = Math.max(1, ...Object.values(stats.guessDistribution))
  const distributionLabel = activeTab.startsWith("bracket-") ? "Acertos" : "Distribuição"

  return (
    <div
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="bg-surface mx-4 w-full max-w-sm rounded-xl border border-white/6 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-t1 font-mono text-sm font-bold tracking-wider uppercase">
            Estatísticas
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-t3 hover:text-t2 cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div className="mb-6 grid grid-cols-3 gap-1 rounded-lg border border-white/6 bg-black/20 p-1 font-mono text-[10px] font-bold tracking-wider uppercase">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedTab(tab.key)}
              aria-pressed={activeTab === tab.key}
              className={`cursor-pointer rounded-md px-3 py-2 transition-all duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                activeTab === tab.key ? "bg-thunder-yellow text-black" : "text-t3 hover:text-t2"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="mb-6 grid grid-cols-4 gap-4 text-center">
          {[
            { value: stats.gamesPlayed, label: "Jogos" },
            { value: stats.gamesWon, label: "Vitórias" },
            { value: stats.currentStreak, label: "Streak" },
            { value: stats.maxStreak, label: "Max" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-t1 font-mono text-xl font-bold">{s.value}</p>
              <p className="text-t3 font-mono text-[9px] tracking-wider uppercase">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-t3 font-mono text-[9px] tracking-wider uppercase">
            {distributionLabel}
          </p>
          {BUCKETS.map((bucket) => {
            const count = stats.guessDistribution[bucket] ?? 0
            const pct = (count / maxBucket) * 100
            return (
              <div key={bucket} className="flex items-center gap-2">
                <span className="text-t3 w-8 text-right font-mono text-xs">{bucket}</span>
                <div className="flex-1">
                  <div
                    className="bg-thunder-navy text-thunder-yellow rounded-sm px-2 py-0.5 text-right font-mono text-xs font-bold"
                    style={{ width: `${Math.max(pct, 8)}%` }}
                  >
                    {count}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
