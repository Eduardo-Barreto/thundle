import { describe, expect, test } from "bun:test"

import {
  getDailyImageRobot,
  getDailyRobot,
  getDateFromPuzzleNumber,
  getPreviousDateStr,
  getPuzzleNumber,
  getRecentDateStrs,
  getTodayStr,
} from "@/lib/daily-robot"
import type { Robot } from "@/types"

const sampleRobots: Robot[] = [
  {
    name: "Alpha",
    slug: "alpha",
    year: 2020,
    superCategory: "Combate",
    category: "Beetle",
    active: true,
    trophies: { gold: 0, silver: 0, bronze: 0 },
    imageUrl: "",
  },
  {
    name: "Bravo",
    slug: "bravo",
    year: 2021,
    superCategory: "Combate",
    category: "Hobby",
    active: false,
    trophies: { gold: 1, silver: 0, bronze: 0 },
    imageUrl: "",
  },
  {
    name: "Charlie",
    slug: "charlie",
    year: 2022,
    superCategory: "Sumo",
    category: "3kg",
    active: true,
    trophies: { gold: 0, silver: 2, bronze: 1 },
    imageUrl: "",
  },
]

describe("getTodayStr", () => {
  test("returns ISO local date in YYYY-MM-DD shape", () => {
    expect(getTodayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe("getPuzzleNumber", () => {
  test("epoch date is puzzle 1", () => {
    expect(getPuzzleNumber("2026-04-25")).toBe(1)
  })

  test("day after epoch is puzzle 2", () => {
    expect(getPuzzleNumber("2026-04-26")).toBe(2)
  })

  test("crosses month boundaries correctly", () => {
    expect(getPuzzleNumber("2026-05-01")).toBe(7)
    expect(getPuzzleNumber("2026-05-25")).toBe(31)
  })

  test("dates before epoch produce non-positive numbers", () => {
    expect(getPuzzleNumber("2026-04-24")).toBe(0)
    expect(getPuzzleNumber("2026-04-20")).toBe(-4)
  })
})

describe("getDateFromPuzzleNumber", () => {
  test("puzzle 1 is epoch date", () => {
    expect(getDateFromPuzzleNumber(1)).toBe("2026-04-25")
  })

  test("round-trips with getPuzzleNumber", () => {
    for (const n of [1, 5, 30, 100, 365]) {
      const date = getDateFromPuzzleNumber(n)
      expect(getPuzzleNumber(date)).toBe(n)
    }
  })
})

describe("getPreviousDateStr", () => {
  test("subtracts one day", () => {
    expect(getPreviousDateStr("2026-04-25")).toBe("2026-04-24")
  })

  test("crosses month boundary", () => {
    expect(getPreviousDateStr("2026-05-01")).toBe("2026-04-30")
  })

  test("crosses year boundary", () => {
    expect(getPreviousDateStr("2026-01-01")).toBe("2025-12-31")
  })
})

describe("getRecentDateStrs", () => {
  test("returns N entries with today as the last one", () => {
    const days = getRecentDateStrs(5)
    expect(days).toHaveLength(5)
    expect(days[days.length - 1]).toBe(getTodayStr())
  })

  test("entries are consecutive descending then ascending order", () => {
    const days = getRecentDateStrs(3)
    for (let i = 1; i < days.length; i++) {
      expect(getPreviousDateStr(days[i]!)).toBe(days[i - 1])
    }
  })

  test("zero-count returns empty array", () => {
    expect(getRecentDateStrs(0)).toEqual([])
  })
})

describe("getDailyRobot", () => {
  test("returns the same robot for the same date", () => {
    const a = getDailyRobot(sampleRobots, "2026-04-25")
    const b = getDailyRobot(sampleRobots, "2026-04-25")
    expect(a.name).toBe(b.name)
  })

  test("eventually covers every robot over a full cycle", () => {
    const seen = new Set<string>()
    for (let n = 1; n <= sampleRobots.length * 3; n++) {
      seen.add(getDailyRobot(sampleRobots, getDateFromPuzzleNumber(n)).name)
    }
    expect(seen.size).toBe(sampleRobots.length)
  })

  test("throws on empty robot list", () => {
    expect(() => getDailyRobot([], "2026-04-25")).toThrow()
  })
})

const imageRobots: Robot[] = [
  { ...sampleRobots[0]!, name: "Alpha", imageUrl: "https://example.com/alpha.jpg" },
  { ...sampleRobots[1]!, name: "Bravo", imageUrl: "https://example.com/bravo.jpg" },
  { ...sampleRobots[2]!, name: "Charlie", imageUrl: "https://example.com/charlie.jpg" },
  { ...sampleRobots[0]!, name: "Delta", imageUrl: "https://example.com/delta.jpg" },
  { ...sampleRobots[0]!, name: "NoImage", imageUrl: "   " },
]
const POOL_SIZE = imageRobots.filter((r) => r.imageUrl.trim().length > 0).length

describe("getDailyImageRobot", () => {
  test("is deterministic for the same date and variant", () => {
    const a = getDailyImageRobot(imageRobots, "2026-04-25", "blur")
    const b = getDailyImageRobot(imageRobots, "2026-04-25", "blur")
    expect(a.name).toBe(b.name)
  })

  test("only ever returns a robot with an image, never a blank one", () => {
    for (let n = 1; n <= 20; n++) {
      const date = getDateFromPuzzleNumber(n)
      for (const variant of ["blur", "zoom"] as const) {
        expect(getDailyImageRobot(imageRobots, date, variant).imageUrl.trim()).not.toBe("")
      }
    }
  })

  test("blur and zoom diverge across the schedule", () => {
    let divergences = 0
    for (let n = 1; n <= 12; n++) {
      const date = getDateFromPuzzleNumber(n)
      if (
        getDailyImageRobot(imageRobots, date, "blur").name !==
        getDailyImageRobot(imageRobots, date, "zoom").name
      ) {
        divergences++
      }
    }
    expect(divergences).toBeGreaterThan(0)
  })

  test("covers every pooled robot over a full cycle", () => {
    const seen = new Set<string>()
    for (let n = 1; n <= POOL_SIZE * 4; n++) {
      seen.add(getDailyImageRobot(imageRobots, getDateFromPuzzleNumber(n), "blur").name)
    }
    expect(seen.size).toBe(POOL_SIZE)
  })

  test("throws when no robot has an image", () => {
    const imageless = sampleRobots.map((r) => ({ ...r, imageUrl: "" }))
    expect(() => getDailyImageRobot(imageless, "2026-04-25", "blur")).toThrow()
  })
})
