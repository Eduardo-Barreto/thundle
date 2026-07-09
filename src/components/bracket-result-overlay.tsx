import { useState } from "react"

import type { CategoryRobot } from "@/lib/bracket-api"
import { resolveRobotImage } from "@/lib/bracket-images"
import { BRACKET_TRACK_META } from "@/lib/bracket-modes"
import {
  copyToClipboard,
  generateBracketShareText,
  generateCombinedBracketShareText,
} from "@/lib/share"
import type { BracketResult, BracketTrack, Robot } from "@/types"

type CombinedEntry = {
  trackLabel: string
  correctCount: number
  total: number
  championCorrect: boolean
}

type BracketResultOverlayProps = {
  track: BracketTrack
  eventName: string
  categoryName: string
  champion: string | null
  result: BracketResult
  shareRounds: boolean[][]
  championCorrect: boolean
  puzzleNumber: number
  isToday: boolean
  streak: number
  thundleRobots: Robot[]
  apiRobots: CategoryRobot[]
  otherTrackDone: boolean
  combinedEntries?: CombinedEntry[]
  onSwitchTrack: () => void
  onClose: () => void
}

export function BracketResultOverlay({
  track,
  eventName,
  categoryName,
  champion,
  result,
  shareRounds,
  championCorrect,
  puzzleNumber,
  isToday,
  streak,
  thundleRobots,
  apiRobots,
  otherTrackDone,
  combinedEntries,
  onSwitchTrack,
  onClose,
}: BracketResultOverlayProps) {
  const [copied, setCopied] = useState(false)
  const [copiedCombined, setCopiedCombined] = useState(false)
  const championImage = champion ? resolveRobotImage(champion, thundleRobots, apiRobots).src : null
  const otherTrack: BracketTrack = track === "combate" ? "sumo" : "combate"

  async function handleShare() {
    const text = generateBracketShareText({
      puzzleNumber,
      trackParam: track,
      trackLabel: BRACKET_TRACK_META[track].label,
      rounds: shareRounds,
      championCorrect,
      won: result.won,
      isToday,
      streak,
    })
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm"
      style={{ animation: "win-backdrop 400ms cubic-bezier(0.23,1,0.32,1) forwards" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="dialog"
      tabIndex={-1}
    >
      <div
        className="relative mx-auto flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-white/6 bg-[#0A0A0A]/95 p-6 shadow-[0_32px_80px_rgba(0,0,0,0.6)] md:max-w-lg md:p-10"
        style={{ animation: "win-card 500ms cubic-bezier(0.23,1,0.32,1) 100ms both" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="text-t3 hover:text-t2 absolute top-4 right-4 cursor-pointer transition-colors"
        >
          ✕
        </button>

        <p
          className={`text-center font-mono text-lg font-bold ${result.won ? "text-ok" : "text-wrong"}`}
          style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 200ms both" }}
        >
          {result.correctCount}/{result.total} previsões{championCorrect ? " · campeão ✓" : ""}
        </p>

        <p className="text-t3 text-center font-mono text-[10px] tracking-wider uppercase">
          {eventName} · {categoryName}
        </p>

        <div
          className="bg-surface flex w-full items-center gap-3 rounded-xl border border-white/6 p-4"
          style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 300ms both" }}
        >
          {championImage ? (
            <img src={championImage} alt="" className="size-12 rounded-lg object-cover" />
          ) : (
            <div className="bg-thunder-navy size-12 rounded-lg" />
          )}
          <div className="min-w-0">
            <p className="text-t3 font-mono text-[9px] font-bold tracking-widest uppercase">
              Campeão real
            </p>
            <p className="text-t1 truncate font-mono text-lg font-bold">{champion ?? "—"}</p>
          </div>
        </div>

        <div
          className="h-px w-full bg-white/6"
          style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 450ms both" }}
        />

        <button
          type="button"
          onClick={handleShare}
          className="bg-thunder-navy text-thunder-yellow focus-visible:outline-thunder-yellow w-full cursor-pointer rounded-lg px-5 py-3 font-mono text-xs font-bold tracking-wider uppercase transition-all duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-97"
          style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 500ms both" }}
        >
          {copied ? "Copiado!" : "Compartilhar"}
        </button>

        {!otherTrackDone && (
          <button
            type="button"
            onClick={onSwitchTrack}
            className="text-t2 hover:text-t1 w-full cursor-pointer rounded-lg border border-white/10 px-5 py-3 font-mono text-xs font-bold tracking-wider uppercase transition-colors"
            style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 550ms both" }}
          >
            Jogar o {BRACKET_TRACK_META[otherTrack].label} de hoje →
          </button>
        )}

        {otherTrackDone && combinedEntries && combinedEntries.length === 2 && (
          <button
            type="button"
            onClick={async () => {
              const ok = await copyToClipboard(
                generateCombinedBracketShareText(puzzleNumber, isToday, combinedEntries),
              )
              if (ok) {
                setCopiedCombined(true)
                setTimeout(() => setCopiedCombined(false), 2000)
              }
            }}
            className="text-t2 hover:text-t1 w-full cursor-pointer rounded-lg border border-white/10 px-5 py-3 font-mono text-xs font-bold tracking-wider uppercase transition-colors"
            style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 550ms both" }}
          >
            {copiedCombined ? "Copiado!" : "Compartilhar o dia (2 chaves)"}
          </button>
        )}
      </div>
    </div>
  )
}
