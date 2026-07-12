import { useState } from "react"

import type { CategoryRobot } from "@/lib/bracket-api"
import { resolveRobotImage } from "@/lib/bracket-images"
import { BRACKET_TRACK_META } from "@/lib/bracket-modes"
import {
  copyToClipboard,
  generateBracketShareText,
  generateCombinedBracketShareText,
  type CombinedBracketEntry,
} from "@/lib/share"
import type { BracketResult, BracketTrack, Robot } from "@/types"

type BracketResultPanelProps = {
  track: BracketTrack
  competition: string
  champion: string | null
  result: BracketResult
  shareRounds: boolean[][]
  puzzleNumber: number
  isToday: boolean
  streak: number
  thundleRobots: Robot[]
  apiRobots: CategoryRobot[]
  otherTrackDone: boolean
  combinedEntries?: CombinedBracketEntry[]
  onSwitchTrack: () => void
}

export function BracketResultPanel({
  track,
  competition,
  champion,
  result,
  shareRounds,
  puzzleNumber,
  isToday,
  streak,
  thundleRobots,
  apiRobots,
  otherTrackDone,
  combinedEntries,
  onSwitchTrack,
}: BracketResultPanelProps) {
  const [copied, setCopied] = useState(false)
  const [copiedCombined, setCopiedCombined] = useState(false)
  const championImage = champion ? resolveRobotImage(champion, thundleRobots, apiRobots).src : null
  const otherTrack: BracketTrack = track === "combate" ? "sumo" : "combate"

  async function copy(text: string, mark: (v: boolean) => void) {
    if (await copyToClipboard(text)) {
      mark(true)
      setTimeout(() => mark(false), 2000)
    }
  }

  return (
    <div className="bg-surface mx-auto mb-6 flex w-full max-w-[560px] flex-col gap-4 rounded-xl border border-white/6 p-4">
      <div className="flex items-center gap-3">
        {championImage ? (
          <img src={championImage} alt="" className="size-10 rounded-lg object-cover" />
        ) : (
          <div className="bg-thunder-navy size-10 rounded-lg" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-t3 font-mono text-[9px] font-bold tracking-widest uppercase">
            Campeão real
          </p>
          <p className="text-t1 truncate font-mono text-base font-bold">{champion ?? "—"}</p>
        </div>
        <p
          className={`text-right font-mono text-sm font-bold ${result.won ? "text-ok" : "text-wrong"}`}
        >
          {result.correctCount}/{result.total} previsões
          {result.won && <span className="block text-[10px]">campeão ✓</span>}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            copy(
              generateBracketShareText({
                puzzleNumber,
                trackParam: track,
                trackLabel: BRACKET_TRACK_META[track].label,
                competition,
                rounds: shareRounds,
                won: result.won,
                isToday,
                streak,
              }),
              setCopied,
            )
          }
          className="bg-thunder-navy text-thunder-yellow flex-1 cursor-pointer rounded-lg px-4 py-2.5 font-mono text-[10px] font-bold tracking-wider uppercase transition-all duration-160 hover:brightness-110 active:scale-97"
        >
          {copied ? "Copiado!" : "Compartilhar"}
        </button>
        {otherTrackDone && combinedEntries && combinedEntries.length === 2 && (
          <button
            type="button"
            onClick={() =>
              copy(
                generateCombinedBracketShareText(puzzleNumber, isToday, combinedEntries),
                setCopiedCombined,
              )
            }
            className="text-t2 hover:text-t1 flex-1 cursor-pointer rounded-lg border border-white/10 px-4 py-2.5 font-mono text-[10px] font-bold tracking-wider uppercase transition-colors"
          >
            {copiedCombined ? "Copiado!" : "Compartilhar o dia"}
          </button>
        )}
        {!otherTrackDone && (
          <button
            type="button"
            onClick={onSwitchTrack}
            className="text-t2 hover:text-t1 flex-1 cursor-pointer rounded-lg border border-white/10 px-4 py-2.5 font-mono text-[10px] font-bold tracking-wider uppercase transition-colors"
          >
            Jogar o {BRACKET_TRACK_META[otherTrack].label} →
          </button>
        )}
      </div>
    </div>
  )
}
