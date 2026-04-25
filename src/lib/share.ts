import type { GuessResult } from "@/types"

const EMOJI = {
  correct: "🟩",
  partial: "🟨",
  wrong: "🟥",
} as const

export function generateShareText(
  puzzleNumber: number,
  results: GuessResult[],
  usedHint: boolean,
  won: boolean,
  streak: number,
  isFuture?: boolean,
): string {
  const num = puzzleNumber >= 0 ? String(puzzleNumber).padStart(3, "0") : String(puzzleNumber)
  const score = won ? `${results.length}/10` : "X/10"
  const hintMark = usedHint ? " 💡" : ""
  const streakMark = won && streak > 0 ? ` 🔥 ${streak}` : ""
  const futureMark = !won && isFuture ? " 🤡" : ""

  const url = puzzleNumber === 1 ? "thundle.io" : `thundle.io?p=${puzzleNumber}`
  const header = `${url} #${num}${hintMark} ${score}${streakMark}${futureMark}`

  const rows = results.map((r) => r.cells.map((c) => EMOJI[c.status]).join(""))

  return [header, "", ...rows].join("\n")
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
