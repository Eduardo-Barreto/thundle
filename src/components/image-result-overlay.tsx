import { useState } from "react"

import { MAX_IMAGE_GUESSES } from "@/lib/image-modes"
import { copyToClipboard, generateImageShareText } from "@/lib/share"
import type { Robot } from "@/types"

type ImageResultOverlayProps = {
  answer: Robot
  puzzleNumber: number
  guessCount: number
  won: boolean
  isToday: boolean
  streak: number
  sharePath: string
  shareLabel: string
  onClose: () => void
}

export function ImageResultOverlay({
  answer,
  puzzleNumber,
  guessCount,
  won,
  isToday,
  streak,
  sharePath,
  shareLabel,
  onClose,
}: ImageResultOverlayProps) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const text = generateImageShareText({
      puzzleNumber,
      guessCount,
      won,
      isToday,
      streak,
      path: sharePath,
      label: shareLabel,
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
          className={`text-center font-mono text-lg font-bold ${won ? "text-ok" : "text-wrong"}`}
          style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 200ms both" }}
        >
          {won ? `${guessCount}/${MAX_IMAGE_GUESSES} tentativas` : "Imagem revelada"}
        </p>

        <div style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 300ms both" }}>
          <p className="text-t3 mb-2 text-center font-mono text-[9px] font-bold tracking-widest uppercase">
            O robô era
          </p>
          {answer.typographyUrl ? (
            <img
              src={answer.typographyUrl}
              alt={answer.name}
              className="mx-auto h-10 object-contain"
            />
          ) : (
            <p className="text-center font-mono text-2xl font-bold">
              {answer.name}
              <span className="text-thunder-yellow">.</span>
            </p>
          )}
        </div>

        {answer.imageUrl ? (
          <img
            src={answer.imageUrl}
            alt={answer.name}
            className="max-h-40 w-full rounded-xl object-cover"
            style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 400ms both" }}
          />
        ) : (
          <div
            className="bg-surface text-t3 flex h-28 w-full items-center justify-center rounded-xl font-mono text-sm"
            style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 400ms both" }}
          >
            sem foto disponível
          </div>
        )}

        {answer.description && (
          <p
            className="text-t2 max-w-sm text-center text-sm leading-relaxed"
            style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 500ms both" }}
          >
            {answer.description}
          </p>
        )}

        <div
          className="h-px w-full bg-white/6"
          style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 550ms both" }}
        />

        <button
          type="button"
          onClick={handleShare}
          className="bg-thunder-navy text-thunder-yellow focus-visible:outline-thunder-yellow w-full cursor-pointer rounded-lg px-5 py-3 font-mono text-xs font-bold tracking-wider uppercase transition-all duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-97"
          style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 600ms both" }}
        >
          {copied ? "Copiado!" : won ? "Compartilhar" : "Compartilhar derrota"}
        </button>
      </div>
    </div>
  )
}
