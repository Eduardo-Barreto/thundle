import { MAX_IMAGE_GUESSES } from "@/lib/image-modes"
import type { GuessResult } from "@/types"

const EMOJI = {
  correct: "🟩",
  wrong: "🟥",
  blank: "⬛",
  up: "⬆️",
  down: "⬇️",
} as const

function formatPuzzleNumber(puzzleNumber: number): string {
  return puzzleNumber >= 0 ? String(puzzleNumber).padStart(3, "0") : String(puzzleNumber)
}

function streakMarker(won: boolean, streak: number): string {
  return won && streak > 0 ? ` 🔥 ${streak}` : ""
}

export function generateShareText(
  puzzleNumber: number,
  results: GuessResult[],
  usedHint: boolean,
  won: boolean,
  streak: number,
  isToday: boolean,
  isFuture?: boolean,
): string {
  const score = won ? `${results.length}/10` : "X/10"
  const hintMark = usedHint ? " 💡" : ""
  const futureMark = !won && isFuture ? " 🤡" : ""

  const url = isToday ? "thundle.io" : `thundle.io?p=${puzzleNumber}`
  const header = `${url} #${formatPuzzleNumber(puzzleNumber)}${hintMark} ${score}${streakMarker(won, streak)}${futureMark}`

  const rows = results.map((r) =>
    r.cells
      .map((c) => {
        if (c.status === "correct") return EMOJI.correct
        if (c.status === "partial" && c.direction === "up") return EMOJI.up
        if (c.status === "partial" && c.direction === "down") return EMOJI.down
        return EMOJI.wrong
      })
      .join(""),
  )

  return [header, "", ...rows].join("\n")
}

type ImageShareInput = {
  puzzleNumber: number
  guessCount: number
  won: boolean
  isToday: boolean
  path: string
  label: string
  streak: number
}

export function generateImageShareText({
  puzzleNumber,
  guessCount,
  won,
  isToday,
  path,
  label,
  streak,
}: ImageShareInput): string {
  const score = won ? `${guessCount}/${MAX_IMAGE_GUESSES}` : `X/${MAX_IMAGE_GUESSES}`
  const url = isToday ? `thundle.io/${path}` : `thundle.io/${path}?p=${puzzleNumber}`
  const header = `${url} #${formatPuzzleNumber(puzzleNumber)} ${label} ${score}${streakMarker(won, streak)}`

  const tiles = Array.from({ length: MAX_IMAGE_GUESSES }, (_, i) => {
    if (!won) return EMOJI.wrong
    if (i < guessCount - 1) return EMOJI.wrong
    if (i === guessCount - 1) return EMOJI.correct
    return EMOJI.blank
  })

  const rows: string[] = []
  for (let i = 0; i < tiles.length; i += 3) {
    rows.push(tiles.slice(i, i + 3).join(""))
  }

  return [header, "", ...rows].join("\n")
}

type BracketShareInput = {
  puzzleNumber: number
  trackParam: string
  trackLabel: string
  rounds: boolean[][]
  championCorrect: boolean
  won: boolean
  isToday: boolean
  streak: number
}

function bracketScore(rounds: boolean[][]): { correct: number; total: number } {
  const flat = rounds.flat()
  return { correct: flat.filter(Boolean).length, total: flat.length }
}

export function generateBracketShareText({
  puzzleNumber,
  trackParam,
  trackLabel,
  rounds,
  championCorrect,
  won,
  isToday,
  streak,
}: BracketShareInput): string {
  const { correct, total } = bracketScore(rounds)
  const base = `thundle.io/bracket?t=${trackParam}`
  const url = isToday ? base : `${base}&p=${puzzleNumber}`
  const championMark = championCorrect ? " 🏆" : ""
  const header = `${url} #${formatPuzzleNumber(puzzleNumber)} ${trackLabel} ${correct}/${total}${championMark}${streakMarker(won, streak)}`

  const grid = rounds
    .map((round) => round.map((ok) => (ok ? EMOJI.correct : EMOJI.wrong)).join(""))
    .join(" · ")

  return [header, "", grid].join("\n")
}

type CombinedBracketEntry = {
  trackLabel: string
  correctCount: number
  total: number
  championCorrect: boolean
}

export function generateCombinedBracketShareText(
  puzzleNumber: number,
  isToday: boolean,
  entries: CombinedBracketEntry[],
): string {
  const url = isToday ? "thundle.io/bracket" : `thundle.io/bracket?p=${puzzleNumber}`
  const header = `${url} #${formatPuzzleNumber(puzzleNumber)}`
  const lines = entries.map(
    (entry) =>
      `${entry.trackLabel} ${entry.correctCount}/${entry.total}${entry.championCorrect ? " 🏆" : ""}`,
  )
  return [header, "", ...lines].join("\n")
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
