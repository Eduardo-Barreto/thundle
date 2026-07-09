import { describe, expect, test } from "bun:test"

import { API_BASE, type CategoryRobot } from "@/lib/bracket-api"
import { resolveRobotImage } from "@/lib/bracket-images"
import type { Robot } from "@/types"

function robot(overrides: Partial<Robot>): Robot {
  return {
    name: "Default",
    slug: "default",
    year: 2020,
    superCategory: "Combate",
    category: "Beetle",
    active: true,
    trophies: { gold: 0, silver: 0, bronze: 0 },
    imageUrl: "",
    ...overrides,
  }
}

const apiRobots: CategoryRobot[] = [
  {
    name: "Raijū RC",
    team: "Raijū",
    team_id: 1275,
    image_url: "https://s3-sa-east-1.amazonaws.com/robocore-robos/4178/photo.jpg",
    rank: 9,
  },
]

describe("resolveRobotImage", () => {
  test("prefers the thundle photo", () => {
    const thundle = [robot({ name: "Raijū RC", imageUrl: "local.png", typographyUrl: "type.svg" })]
    expect(resolveRobotImage("Raijū RC", thundle, apiRobots)).toEqual({
      src: "local.png",
      source: "thundle-photo",
    })
  })

  test("falls back to thundle typography when no photo, matching truncated names", () => {
    const thundle = [robot({ name: "Raijū RC", imageUrl: "", typographyUrl: "type.svg" })]
    // The cell name arrives truncated but still resolves to the roster entry.
    expect(resolveRobotImage("Raijū R", thundle, apiRobots)).toEqual({
      src: "type.svg",
      source: "thundle-typography",
    })
  })

  test("falls back to the proxied API image", () => {
    const result = resolveRobotImage("Raijū RC", [], apiRobots)
    expect(result.source).toBe("api")
    expect(result.src).toBe(`${API_BASE}/img?src=${encodeURIComponent(apiRobots[0].image_url)}`)
  })

  test("returns none when nothing matches", () => {
    expect(resolveRobotImage("Unknown Bot", [], apiRobots)).toEqual({
      src: null,
      source: "none",
    })
  })
})
