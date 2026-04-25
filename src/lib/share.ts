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
): string {
  const num = puzzleNumber >= 0 ? String(puzzleNumber).padStart(3, "0") : String(puzzleNumber)
  const header = `thundle. #${num}${usedHint ? " 💡" : ""}`

  const rows = results.map((r) => r.cells.map((c) => EMOJI[c.status]).join(""))

  const url = puzzleNumber === 1 ? "thundle.io" : `thundle.io?p=${puzzleNumber}`

  return [header, ...rows, url].join("\n")
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
