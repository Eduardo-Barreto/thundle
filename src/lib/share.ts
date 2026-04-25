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
  const header = `thundle. #${String(puzzleNumber).padStart(3, "0")}${usedHint ? " 💡" : ""}`

  const rows = results.map((r) => r.cells.map((c) => EMOJI[c.status]).join(""))

  return [header, ...rows, "thundle.io"].join("\n")
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
