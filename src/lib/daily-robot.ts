import type { Robot } from "@/types"

const EPOCH = "2026-04-25"
const SEED = 105
const MS_PER_DAY = 1000 * 60 * 60 * 24

function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  if (!y || !m || !d) throw new Error(`Invalid date: ${dateStr}`)
  return new Date(y, m - 1, d)
}

function formatDateLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

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
  if (robots.length === 0) throw new Error("No robots configured")
  const names = robots.map((r) => r.name).sort()
  const shuffled = shuffleWithSeed(names, SEED)
  const dayIndex = getPuzzleNumber(dateStr) - 1
  const cycleIndex = ((dayIndex % shuffled.length) + shuffled.length) % shuffled.length
  const name = shuffled[cycleIndex]!
  const robot = robots.find((r) => r.name === name)
  if (!robot) throw new Error(`Robot not found for daily slot: ${name}`)
  return robot
}

export function getTodayStr(): string {
  return formatDateLocal(new Date())
}

export function getPuzzleNumber(dateStr: string): number {
  const epoch = parseDateLocal(EPOCH)
  const current = parseDateLocal(dateStr)
  const diffDays = Math.round((current.getTime() - epoch.getTime()) / MS_PER_DAY)
  return diffDays + 1
}

export function getDateFromPuzzleNumber(puzzleNumber: number): string {
  const epoch = parseDateLocal(EPOCH)
  epoch.setDate(epoch.getDate() + puzzleNumber - 1)
  return formatDateLocal(epoch)
}

export function getPreviousDateStr(dateStr: string): string {
  const date = parseDateLocal(dateStr)
  date.setDate(date.getDate() - 1)
  return formatDateLocal(date)
}

export function getRecentDateStrs(count: number): string[] {
  const today = new Date()
  const out: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    out.push(formatDateLocal(d))
  }
  return out
}
