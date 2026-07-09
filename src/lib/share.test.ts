import { describe, expect, test } from "bun:test"

import {
  copyToClipboard,
  generateBracketShareText,
  generateCombinedBracketShareText,
  generateImageShareText,
  generateShareText,
} from "@/lib/share"
import type { GuessResult } from "@/types"

function imageShare(overrides: Partial<Parameters<typeof generateImageShareText>[0]> = {}) {
  return generateImageShareText({
    puzzleNumber: 5,
    guessCount: 3,
    won: true,
    isToday: true,
    path: "desfoque",
    label: "Desfoque",
    streak: 0,
    ...overrides,
  })
}

function row(statuses: Array<"correct" | "partial" | "wrong">, dir?: "up" | "down"): GuessResult {
  return {
    robotName: "Test",
    imageUrl: "",
    cells: statuses.map((s) => ({
      attribute: "year",
      value: 2020,
      status: s,
      direction: s === "partial" ? dir : undefined,
    })),
    isCorrect: statuses.every((s) => s === "correct"),
  }
}

describe("generateShareText", () => {
  test("win adds correct score and pads number", () => {
    const text = generateShareText(5, [row(["correct", "correct"])], false, true, 0, true)
    expect(text).toContain("#005")
    expect(text).toContain("1/10")
    expect(text).toContain("🟩🟩")
  })

  test("loss uses X/10", () => {
    const text = generateShareText(10, [row(["wrong"])], false, false, 0, true)
    expect(text).toContain("X/10")
  })

  test("hint marker appears only when usedHint=true", () => {
    const withHint = generateShareText(1, [row(["wrong"])], true, true, 0, true)
    const without = generateShareText(1, [row(["wrong"])], false, true, 0, true)
    expect(withHint).toContain("💡")
    expect(without).not.toContain("💡")
  })

  test("streak marker only on win with streak > 0", () => {
    expect(generateShareText(1, [row(["correct"])], false, true, 4, true)).toContain("🔥 4")
    expect(generateShareText(1, [row(["correct"])], false, true, 0, true)).not.toContain("🔥")
    expect(generateShareText(1, [row(["wrong"])], false, false, 5, true)).not.toContain("🔥")
  })

  test("future loss marker (clown) only when isFuture true and loss", () => {
    expect(generateShareText(1, [row(["wrong"])], false, false, 0, true, true)).toContain("🤡")
    expect(generateShareText(1, [row(["wrong"])], false, false, 0, true, false)).not.toContain("🤡")
  })

  test("URL omits ?p when today, includes when not today", () => {
    const today = generateShareText(7, [row(["correct"])], false, true, 0, true)
    const past = generateShareText(7, [row(["correct"])], false, true, 0, false)
    expect(today.startsWith("thundle.io ")).toBe(true)
    expect(past).toContain("thundle.io?p=7")
  })

  test("emoji direction maps for partial", () => {
    const up = generateShareText(1, [row(["partial"], "up")], false, true, 0, true)
    const down = generateShareText(1, [row(["partial"], "down")], false, true, 0, true)
    expect(up).toContain("⬆️")
    expect(down).toContain("⬇️")
  })

  test("includes header, blank line, then result rows", () => {
    const text = generateShareText(2, [row(["correct"]), row(["wrong"])], false, false, 0, true)
    const lines = text.split("\n")
    expect(lines[1]).toBe("")
    expect(lines.length).toBe(4)
  })
})

describe("generateImageShareText", () => {
  test("win uses guessCount/9 and the mode path + label", () => {
    const text = imageShare({ guessCount: 3, won: true })
    expect(text).toContain("thundle.io/desfoque")
    expect(text).toContain("#005")
    expect(text).toContain("Desfoque 3/9")
  })

  test("loss uses X/9", () => {
    expect(imageShare({ won: false })).toContain("X/9")
  })

  test("URL includes ?p when not today", () => {
    expect(imageShare({ isToday: false, puzzleNumber: 7 })).toContain("thundle.io/desfoque?p=7")
  })

  test("win renders 9 tiles across three rows ending on the green guess", () => {
    const lines = imageShare({ guessCount: 3, won: true }).split("\n")
    expect(lines[1]).toBe("")
    const grid = lines.slice(2).join("")
    expect([...grid].filter((c) => c === "🟥")).toHaveLength(2)
    expect([...grid].filter((c) => c === "🟩")).toHaveLength(1)
    expect(lines.slice(2)).toHaveLength(3)
  })

  test("loss renders nine red tiles and no green", () => {
    const grid = imageShare({ won: false }).split("\n").slice(2).join("")
    expect([...grid].filter((c) => c === "🟥")).toHaveLength(9)
    expect(grid).not.toContain("🟩")
  })

  test("streak marker only on win with streak > 0", () => {
    expect(imageShare({ won: true, streak: 4 })).toContain("🔥 4")
    expect(imageShare({ won: true, streak: 0 })).not.toContain("🔥")
    expect(imageShare({ won: false, streak: 5 })).not.toContain("🔥")
  })
})

describe("copyToClipboard", () => {
  test("returns false when clipboard write rejects", async () => {
    const original = globalThis.navigator
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: { writeText: () => Promise.reject(new Error("denied")) } },
      configurable: true,
    })
    try {
      expect(await copyToClipboard("x")).toBe(false)
    } finally {
      Object.defineProperty(globalThis, "navigator", { value: original, configurable: true })
    }
  })

  test("returns true on successful clipboard write", async () => {
    let captured = ""
    const original = globalThis.navigator
    Object.defineProperty(globalThis, "navigator", {
      value: {
        clipboard: {
          writeText: (t: string) => {
            captured = t
            return Promise.resolve()
          },
        },
      },
      configurable: true,
    })
    try {
      expect(await copyToClipboard("hello")).toBe(true)
      expect(captured).toBe("hello")
    } finally {
      Object.defineProperty(globalThis, "navigator", { value: original, configurable: true })
    }
  })
})

function bracketShare(overrides: Partial<Parameters<typeof generateBracketShareText>[0]> = {}) {
  return generateBracketShareText({
    puzzleNumber: 76,
    trackParam: "combate",
    trackLabel: "Combate",
    rounds: [[true, true], [true, false], [true]],
    championCorrect: true,
    won: true,
    isToday: true,
    streak: 0,
    ...overrides,
  })
}

describe("generateBracketShareText", () => {
  test("today omits puzzle param and shows score with champion mark", () => {
    const text = bracketShare()
    expect(text).toContain("thundle.io/bracket?t=combate #076")
    expect(text).toContain("4/5")
    expect(text).toContain("🏆")
    expect(text).toContain("🟩🟩 · 🟩🟥 · 🟩")
  })

  test("archive puzzle keeps t and adds p param", () => {
    const text = bracketShare({ isToday: false })
    expect(text).toContain("thundle.io/bracket?t=combate&p=76")
  })

  test("missed champion drops trophy and win streak shows fire", () => {
    const text = bracketShare({ championCorrect: false, streak: 3 })
    expect(text).not.toContain("🏆")
    expect(text).toContain("🔥 3")
  })
})

describe("generateCombinedBracketShareText", () => {
  test("lists both tracks with scores", () => {
    const text = generateCombinedBracketShareText(76, true, [
      { trackLabel: "Combate", correctCount: 2, total: 3, championCorrect: true },
      { trackLabel: "Sumô", correctCount: 2, total: 2, championCorrect: false },
    ])
    expect(text).toContain("thundle.io/bracket #076")
    expect(text).toContain("Combate 2/3 🏆")
    expect(text).toContain("Sumô 2/2")
    expect(text.split("\n")[2]).toBe("Combate 2/3 🏆")
  })
})
