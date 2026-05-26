import { getTodayStr } from "@/lib/daily-robot"
import { loadGame } from "@/lib/storage"

type PuzzlePickerModalProps = {
  onClose: () => void
  onSelectDate: (dateStr: string) => void
}

export function PuzzlePickerModal({ onClose, onSelectDate }: PuzzlePickerModalProps) {
  const today = getTodayStr()
  const days: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }

  return (
    <div
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="bg-surface mx-4 w-full max-w-sm rounded-xl border border-white/6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-t1 font-mono text-sm font-bold tracking-wider uppercase">
            Puzzles anteriores
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
        <div className="grid grid-cols-7 gap-1">
          {days.map((dateStr) => {
            const game = loadGame(dateStr)
            const isToday = dateStr === today
            const isDone = game?.completed
            const dayNum = new Date(dateStr).getDate()

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => {
                  onSelectDate(dateStr)
                  onClose()
                }}
                className={`flex size-9 cursor-pointer items-center justify-center rounded-md font-mono text-[11px] font-bold transition-all duration-160 active:scale-93 ${
                  isToday
                    ? "bg-thunder-navy text-thunder-yellow shadow-[0_0_12px_rgba(27,27,75,0.5)]"
                    : isDone
                      ? "border-ok-border bg-ok-bg text-ok border"
                      : "text-t3 hover:text-t2 border border-white/6 hover:border-white/10"
                }`}
              >
                {dayNum}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
