import { describe, expect, test } from "bun:test"

import { getNestedValue } from "@/lib/nested-value"

describe("getNestedValue", () => {
  test("returns top-level value", () => {
    expect(getNestedValue({ a: 1 }, "a")).toBe(1)
  })

  test("returns nested value via dot path", () => {
    expect(getNestedValue({ a: { b: { c: "x" } } }, "a.b.c")).toBe("x")
  })

  test("returns undefined for missing path", () => {
    expect(getNestedValue({ a: 1 }, "b")).toBeUndefined()
    expect(getNestedValue({ a: { b: 1 } }, "a.c")).toBeUndefined()
  })

  test("returns undefined when traversing into non-object", () => {
    expect(getNestedValue({ a: 1 }, "a.b")).toBeUndefined()
  })

  test("returns false correctly (not collapsed to undefined)", () => {
    expect(getNestedValue({ a: false }, "a")).toBe(false)
  })

  test("returns 0 correctly", () => {
    expect(getNestedValue({ a: 0 }, "a")).toBe(0)
  })
})
