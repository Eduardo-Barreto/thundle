import { describe, expect, test } from "bun:test"

import { formatAttributeValue } from "@/lib/format"

describe("formatAttributeValue", () => {
  test("true → 'Sim'", () => {
    expect(formatAttributeValue(true)).toBe("Sim")
  })

  test("false → 'Não'", () => {
    expect(formatAttributeValue(false)).toBe("Não")
  })

  test("numbers pass through unchanged", () => {
    expect(formatAttributeValue(0)).toBe(0)
    expect(formatAttributeValue(42)).toBe(42)
    expect(formatAttributeValue(-3.5)).toBe(-3.5)
  })

  test("strings pass through", () => {
    expect(formatAttributeValue("Combate")).toBe("Combate")
  })

  test("null and undefined collapse to empty string", () => {
    expect(formatAttributeValue(null)).toBe("")
    expect(formatAttributeValue(undefined)).toBe("")
  })

  test("objects are stringified", () => {
    expect(formatAttributeValue({ a: 1 })).toBe("[object Object]")
  })
})
