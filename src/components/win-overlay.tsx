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
  const totalTrophies = answer.trophies.gold + answer.trophies.silver + answer.trophies.bronze

  async function handleShare() {
    const text = generateShareText(puzzleNumber, results, usedHint)
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
    >
      {/* Team background image — blurred atmosphere like mcdle */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-[0.07]"
        style={{
          backgroundImage: "url(https://static.thunderatz.org/teamassets/equipe.jpg)",
          filter: "blur(8px) saturate(0.3)",
        }}
      />

      <div
        className="relative mx-auto flex w-full max-w-md flex-col items-center gap-8 rounded-2xl border border-white/6 bg-[#0A0A0A]/95 p-8 shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
        style={{ animation: "win-card 500ms cubic-bezier(0.23,1,0.32,1) 100ms both" }}
      >
        {/* Typography — hero moment, reveals first */}
        {answer.typographyUrl ? (
          <img
            src={answer.typographyUrl}
            alt={`${answer.name} tipografia`}
            className="h-14 object-contain drop-shadow-[0_0_20px_rgba(255,229,0,0.15)]"
            style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 200ms both" }}
          />
        ) : (
          <h2
            className="font-mono text-3xl font-bold"
            style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 200ms both" }}
          >
            {answer.name}
            <span className="text-thunder-yellow">.</span>
          </h2>
        )}

        {/* Robot image */}
        {answer.imageUrl && (
          <img
            src={answer.imageUrl}
            alt={answer.name}
            className="max-h-44 w-full rounded-xl object-cover"
            style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 300ms both" }}
          />
        )}

        {/* Robot specs — technical label grid */}
        <div
          className="grid w-full grid-cols-3 gap-3"
          style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 400ms both" }}
        >
          <Stat label="Estreia" value={String(answer.year)} />
          <Stat label="Categoria" value={answer.superCategory} />
          <Stat label="Classe" value={answer.category} />
        </div>

        {/* Trophies */}
        {totalTrophies > 0 && (
          <div
            className="flex items-center gap-4 font-mono text-sm"
            style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 450ms both" }}
          >
            {answer.trophies.gold > 0 && (
              <span className="text-[#FFD700]">🥇 {answer.trophies.gold}</span>
            )}
            {answer.trophies.silver > 0 && (
              <span className="text-[#C0C0C0]">🥈 {answer.trophies.silver}</span>
            )}
            {answer.trophies.bronze > 0 && (
              <span className="text-[#CD7F32]">🥉 {answer.trophies.bronze}</span>
            )}
          </div>
        )}

        {/* Description */}
        {answer.description && (
          <p
            className="text-t2 max-w-sm text-center text-sm leading-relaxed"
            style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 500ms both" }}
          >
            {answer.description}
          </p>
        )}

        {/* Divider */}
        <div
          className="h-px w-full bg-white/6"
          style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 550ms both" }}
        />

        {/* Player stats */}
        <div
          className="flex w-full items-center justify-between"
          style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 600ms both" }}
        >
          <div className="text-t3 flex gap-5 font-mono text-xs tracking-wider uppercase">
            <div className="text-center">
              <p className="text-t1 text-base font-bold">{results.length}</p>
              <p>Tentativas</p>
            </div>
            <div className="text-center">
              <p className="text-t1 text-base font-bold">{stats.currentStreak}</p>
              <p>Streak</p>
            </div>
            <div className="text-center">
              <p className="text-t1 text-base font-bold">{stats.gamesPlayed}</p>
              <p>Jogos</p>
            </div>
          </div>
          <button
            onClick={handleShare}
            className="bg-thunder-navy text-thunder-yellow focus-visible:outline-thunder-yellow cursor-pointer rounded-lg px-5 py-2.5 font-mono text-xs font-bold tracking-wider uppercase transition-all duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-97"
          >
            {copied ? "Copiado!" : "Compartilhar"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-elevated rounded-lg border border-white/6 px-3 py-2.5 text-center">
      <p className="text-t3 font-mono text-[9px] font-bold tracking-widest uppercase">{label}</p>
      <p className="text-t1 mt-1 font-mono text-sm font-bold">{value}</p>
    </div>
  )
}
