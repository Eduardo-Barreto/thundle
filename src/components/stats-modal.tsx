import { loadStats } from "@/lib/storage"

type StatsModalProps = {
  onClose: () => void
}

export function StatsModal({ onClose }: StatsModalProps) {
  const stats = loadStats()

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
          <p className="text-t3 font-mono text-[9px] tracking-wider uppercase">Distribuição</p>
          {["1", "2-3", "4-6", "7-10", "11+"].map((bucket) => {
            const count = stats.guessDistribution[bucket] ?? 0
            const max = Math.max(1, ...Object.values(stats.guessDistribution))
            const pct = (count / max) * 100
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
