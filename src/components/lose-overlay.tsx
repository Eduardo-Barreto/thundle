import { useState } from "react"

import { generateShareText, copyToClipboard } from "@/lib/share"
import type { Robot, GuessResult } from "@/types"

type LoseOverlayProps = {
  answer: Robot
  puzzleNumber: number
  results: GuessResult[]
  usedHint: boolean
  isFuture: boolean
  isToday: boolean
  onClose: () => void
}

export function LoseOverlay({
  answer,
  puzzleNumber,
  results,
  usedHint,
  isFuture,
  isToday,
  onClose,
}: LoseOverlayProps) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const text = generateShareText(puzzleNumber, results, usedHint, false, 0, isToday, isFuture)
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
          onClick={onClose}
          aria-label="Fechar"
          className="text-t3 hover:text-t2 absolute top-4 right-4 cursor-pointer transition-colors"
        >
          ✕
        </button>

        {isFuture ? (
          <>
            <p
              className="text-wrong text-center font-mono text-2xl font-bold"
              style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 200ms both" }}
            >
              Viajante do tempo?
            </p>
            <p
              className="text-t2 max-w-sm text-center text-sm leading-relaxed"
              style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 300ms both" }}
            >
              Calma pai, esse puzzle ainda não existe. Volta quando chegar o dia certo.
            </p>
          </>
        ) : (
          <>
            <p
              className="text-wrong text-center font-mono text-lg font-bold"
              style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 200ms both" }}
            >
              10/10 tentativas
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
                className="max-h-36 w-full rounded-xl object-cover"
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
          </>
        )}

        <div
          className="h-px w-full bg-white/6"
          style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 550ms both" }}
        />

        <div
          className="flex w-full flex-col items-center gap-4"
          style={{ animation: "win-element 400ms cubic-bezier(0.23,1,0.32,1) 600ms both" }}
        >
          <p className="text-t3 max-w-xs text-center font-mono text-[10px] leading-relaxed">
            Para continuar chutando, faça um PIX de R$100,00 para{" "}
            <span className="text-thunder-yellow">pix@thunderatz.org</span>
          </p>

          {!isFuture && (
            <button
              onClick={handleShare}
              className="bg-thunder-navy text-thunder-yellow focus-visible:outline-thunder-yellow w-full cursor-pointer rounded-lg px-5 py-3 font-mono text-xs font-bold tracking-wider uppercase transition-all duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-97"
            >
              {copied ? "Copiado!" : "Compartilhar derrota"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
