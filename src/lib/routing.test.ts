import { describe, expect, test } from "bun:test"

import { getModeFromPath } from "@/lib/routing"

describe("getModeFromPath", () => {
  test("maps known mode paths, ignoring trailing slashes", () => {
    expect(getModeFromPath("/")).toBe("classic")
    expect(getModeFromPath("/desfoque")).toBe("blur")
    expect(getModeFromPath("/zoom")).toBe("zoom")
    expect(getModeFromPath("/zoom/")).toBe("zoom")
  })

  test("unknown paths fall back to classic", () => {
    expect(getModeFromPath("/team")).toBe("classic")
    expect(getModeFromPath("/nope")).toBe("classic")
  })
})
