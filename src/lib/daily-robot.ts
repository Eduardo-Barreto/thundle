import type { Robot } from "@/types"

const EPOCH = "2026-04-25"

function djb2(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  return hash >>> 0
}

export function getDailyRobot(robots: Robot[], dateStr: string): Robot {
  const sorted = [...robots].sort((a, b) => a.name.localeCompare(b.name))
  const index = djb2(dateStr) % sorted.length
  return sorted[index]!
}

export function getTodayStr(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function getPuzzleNumber(dateStr: string): number {
  const epoch = new Date(EPOCH)
  const current = new Date(dateStr)
  const diffDays = Math.floor((current.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays + 1
}

export function getDateFromPuzzleNumber(puzzleNumber: number): string {
  const epoch = new Date(EPOCH)
  epoch.setDate(epoch.getDate() + puzzleNumber - 1)
  const y = epoch.getFullYear()
  const m = String(epoch.getMonth() + 1).padStart(2, "0")
  const d = String(epoch.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
