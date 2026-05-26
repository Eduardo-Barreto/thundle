import { useCallback, useEffect, useState } from "react"

import { copyToClipboard } from "@/lib/share"

const ANSWER = "THUNDERATZ"
const WORD_LENGTH = ANSWER.length
const MAX_ATTEMPTS = 6

type LetterStatus = "correct" | "partial" | "wrong"
type ScoredGuess = { letters: string[]; statuses: LetterStatus[] }

const TILE_STYLES: Record<LetterStatus, string> = {
  correct: "bg-ok-bg text-ok",
  partial: "bg-partial-bg text-partial",
  wrong: "bg-wrong-bg text-wrong",
}

const SHARE_EMOJI: Record<LetterStatus, string> = {
  correct: "🟩",
  partial: "🟨",
  wrong: "⬛",
}

function buildShareText(guesses: ScoredGuess[], won: boolean): string {
  const score = won ? `${guesses.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`
  const header = `thundle.io/team ${score}`
  const rows = guesses.map((g) => g.statuses.map((s) => SHARE_EMOJI[s]).join(""))
  return [header, "", ...rows].join("\n")
}

function scoreGuess(guess: string): ScoredGuess {
  const statuses: LetterStatus[] = Array.from({ length: WORD_LENGTH }, () => "wrong")
  const consumed = Array.from({ length: WORD_LENGTH }, () => false)

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === ANSWER[i]) {
      statuses[i] = "correct"
      consumed[i] = true
    }
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (statuses[i] === "correct") continue
    for (let j = 0; j < WORD_LENGTH; j++) {
      if (!consumed[j] && guess[i] === ANSWER[j]) {
        statuses[i] = "partial"
        consumed[j] = true
        break
      }
    }
  }

  return { letters: guess.split(""), statuses }
}

export function TeamMode() {
  const [guesses, setGuesses] = useState<ScoredGuess[]>([])
  const [current, setCurrent] = useState("")
  const [shake, setShake] = useState(false)

  const won = guesses.some((g) => g.statuses.every((s) => s === "correct"))
  const lost = !won && guesses.length >= MAX_ATTEMPTS
  const finished = won || lost

  const handleKey = useCallback(
    (key: string) => {
      if (finished) return
      if (key === "ENTER") {
        if (current.length !== WORD_LENGTH) {
          setShake(true)
          setTimeout(() => setShake(false), 400)
          return
        }
        setGuesses((prev) => [...prev, scoreGuess(current)])
        setCurrent("")
        return
      }
      if (key === "BACKSPACE") {
        setCurrent((c) => c.slice(0, -1))
        return
      }
      if (/^[A-Z]$/.test(key) && current.length < WORD_LENGTH) {
        setCurrent((c) => c + key)
      }
    },
    [current, finished],
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") return
      const k = e.key.toUpperCase()
      if (k === "ENTER" || k === "BACKSPACE" || /^[A-Z]$/.test(k)) {
        e.preventDefault()
        handleKey(k)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handleKey])

  function resetGame() {
    setGuesses([])
    setCurrent("")
  }

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pt-6 pb-12 md:px-6 md:pt-10">
      <header className="mb-6 flex items-center justify-between md:mb-8">
        <a
          href="/"
          className="text-t3 hover:text-t2 font-mono text-xs tracking-wider uppercase transition-colors"
        >
          ← voltar
        </a>
        <h1 className="font-mono text-xl font-bold tracking-tight md:text-2xl">
          modo equipe
          <span className="text-thunder-yellow drop-shadow-[0_0_6px_rgba(255,229,0,0.25)]">.</span>
        </h1>
        <span className="text-t3 font-mono text-[10px] tracking-wider uppercase">
          {guesses.length}/{MAX_ATTEMPTS}
        </span>
      </header>

      <p className="text-t3 mb-6 text-center font-mono text-[10px] tracking-wider uppercase md:mb-8">
        adivinhe a equipe em 10 letras
      </p>

      <Grid guesses={guesses} current={current} shake={shake} />

      {finished && <Reveal won={won} guesses={guesses} onReset={resetGame} />}
    </div>
  )
}

type GridProps = { guesses: ScoredGuess[]; current: string; shake: boolean }

function Grid({ guesses, current, shake }: GridProps) {
  return (
    <div className="grid w-full gap-1 md:gap-1.5">
      {Array.from({ length: MAX_ATTEMPTS }).map((_, rowIdx) => {
        const guess = guesses[rowIdx]
        const isCurrent = !guess && rowIdx === guesses.length
        return (
          <div
            key={rowIdx}
            className={`grid grid-cols-10 gap-1 md:gap-1.5 ${
              shake && isCurrent ? "animate-[shake_400ms_ease-in-out]" : ""
            }`}
          >
            {Array.from({ length: WORD_LENGTH }).map((_, colIdx) => {
              if (guess) {
                return (
                  <ScoredTile
                    key={colIdx}
                    letter={guess.letters[colIdx]!}
                    status={guess.statuses[colIdx]!}
                    delay={colIdx * 80}
                  />
                )
              }
              return <PendingTile key={colIdx} letter={isCurrent ? (current[colIdx] ?? "") : ""} />
            })}
          </div>
        )
      })}
    </div>
  )
}

function ScoredTile({
  letter,
  status,
  delay,
}: {
  letter: string
  status: LetterStatus
  delay: number
}) {
  return (
    <div
      className={`flex aspect-square items-center justify-center rounded-md font-mono text-base font-bold uppercase md:text-xl ${TILE_STYLES[status]}`}
      style={{ animation: `tile-in 250ms cubic-bezier(0.23,1,0.32,1) ${delay}ms both` }}
    >
      {letter}
    </div>
  )
}

function PendingTile({ letter }: { letter: string }) {
  return (
    <div
      className={`flex aspect-square items-center justify-center rounded-md border font-mono text-base font-bold uppercase md:text-xl ${
        letter ? "bg-elevated text-t1 border-white/12" : "bg-surface text-t3 border-white/6"
      }`}
    >
      {letter}
    </div>
  )
}

function Reveal({
  won,
  guesses,
  onReset,
}: {
  won: boolean
  guesses: ScoredGuess[]
  onReset: () => void
}) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const ok = await copyToClipboard(buildShareText(guesses, won))
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      className="mt-8 flex flex-col items-center gap-5 rounded-2xl border border-white/6 bg-[#0A0A0A]/95 p-6 text-center"
      style={{ animation: "win-card 500ms cubic-bezier(0.23,1,0.32,1) both" }}
    >
      <p className="text-thunder-yellow font-mono text-[10px] tracking-widest uppercase">
        {won ? "boa!" : "fim de jogo"}
      </p>
      <h2 className="font-mono text-3xl font-bold md:text-4xl">
        ThundeRatz
        <span className="text-thunder-yellow">.</span>
      </h2>
      <p className="text-t2 max-w-xs text-sm leading-relaxed">
        {won
          ? `Acertou em ${guesses.length}/${MAX_ATTEMPTS} tentativas.`
          : "A resposta era ThundeRatz."}
      </p>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          onClick={handleShare}
          className="bg-thunder-navy text-thunder-yellow focus-visible:outline-thunder-yellow cursor-pointer rounded-lg px-5 py-3 font-mono text-xs font-bold tracking-wider uppercase transition-all duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-97"
        >
          {copied ? "Copiado!" : "Compartilhar"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="text-t3 hover:text-t2 focus-visible:outline-thunder-yellow cursor-pointer rounded-lg px-5 py-2 font-mono text-xs font-bold tracking-wider uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Jogar de novo
        </button>
      </div>
    </div>
  )
}
