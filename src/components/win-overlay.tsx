import { useState } from "react"

import { generateShareText, copyToClipboard } from "@/lib/share"
import { loadStats } from "@/lib/storage"
import type { Robot, GuessResult } from "@/types"

type WinOverlayProps = {
  answer: Robot
  puzzleNumber: number
  results: GuessResult[]
  usedHint: boolean
}

export function WinOverlay({ answer, puzzleNumber, results, usedHint }: WinOverlayProps) {
  const stats = loadStats()
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const text = generateShareText(puzzleNumber, results, usedHint)
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-surface mt-10 flex flex-col items-center gap-6 rounded-xl border border-white/6 p-8">
      {answer.typographyUrl && (
        <img
          src={answer.typographyUrl}
          alt={`${answer.name} tipografia`}
          className="h-12 object-contain"
        />
      )}
      {answer.logoUrl && (
        <img src={answer.logoUrl} alt={`${answer.name} logo`} className="size-24 object-contain" />
      )}
      {!answer.logoUrl && !answer.typographyUrl && (
        <h2 className="font-mono text-3xl font-bold">{answer.name}</h2>
      )}
      {answer.imageUrl && (
        <img src={answer.imageUrl} alt={answer.name} className="max-h-48 rounded-lg object-cover" />
      )}
      {answer.description && (
        <p className="text-t2 max-w-sm text-center text-sm">{answer.description}</p>
      )}
      <div className="text-t3 flex gap-6 font-mono text-xs tracking-wider uppercase">
        <div className="text-center">
          <p className="text-t1 text-lg font-bold">{stats.currentStreak}</p>
          <p>Streak</p>
        </div>
        <div className="text-center">
          <p className="text-t1 text-lg font-bold">{stats.averageGuesses}</p>
          <p>Média</p>
        </div>
        <div className="text-center">
          <p className="text-t1 text-lg font-bold">{stats.gamesPlayed}</p>
          <p>Jogos</p>
        </div>
      </div>
      <button
        onClick={handleShare}
        className="bg-thunder-navy text-thunder-yellow focus-visible:outline-thunder-yellow cursor-pointer rounded-lg px-6 py-3 font-mono text-xs font-bold tracking-wider uppercase transition-all duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-97"
      >
        {copied ? "Copiado!" : "Compartilhar"}
      </button>
    </div>
  )
}
