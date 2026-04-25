import type { Robot } from "@/types"

const EPOCH = "2026-04-25"
const SEED = 105

function mulberry32(seed: number): () => number {
  let s = seed
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleWithSeed(arr: readonly string[], seed: number): string[] {
  const shuffled = [...arr]
  const rng = mulberry32(seed)
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
  }
  return shuffled
}

export function getDailyRobot(robots: Robot[], dateStr: string): Robot {
  const names = robots.map((r) => r.name).sort()
  const shuffled = shuffleWithSeed(names, SEED)
  const dayIndex = getPuzzleNumber(dateStr) - 1
  const cycleIndex = ((dayIndex % shuffled.length) + shuffled.length) % shuffled.length
  const name = shuffled[cycleIndex]!
  return robots.find((r) => r.name === name)!
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
  epoch.setDate(epoch.getDate() + puzzleNumber)
  const y = epoch.getFullYear()
  const m = String(epoch.getMonth() + 1).padStart(2, "0")
  const d = String(epoch.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
