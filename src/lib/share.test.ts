import { describe, expect, test } from "bun:test"

import { copyToClipboard, generateShareText } from "@/lib/share"
import type { GuessResult } from "@/types"

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
