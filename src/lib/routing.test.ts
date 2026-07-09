import { describe, expect, test } from "bun:test"

import { getModeFromPath, getTrackFromSearch } from "@/lib/routing"

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

describe("bracket routing", () => {
  test("getModeFromPath resolves /bracket with and without trailing slash", () => {
    expect(getModeFromPath("/bracket")).toBe("bracket")
    expect(getModeFromPath("/bracket/")).toBe("bracket")
  })

  test("getTrackFromSearch accepts only known tracks", () => {
    expect(getTrackFromSearch("?t=sumo")).toBe("sumo")
    expect(getTrackFromSearch("?t=combate")).toBe("combate")
    expect(getTrackFromSearch("?t=xadrez")).toBeUndefined()
    expect(getTrackFromSearch("")).toBeUndefined()
  })
})
