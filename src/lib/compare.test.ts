import { describe, expect, test } from "bun:test"

import { compareGuess } from "@/lib/compare"
import type { Robot } from "@/types"

function makeRobot(overrides: Partial<Robot>): Robot {
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

describe("compareGuess", () => {
  test("identical robot marks every cell correct and isCorrect=true", () => {
    const robot = makeRobot({ name: "A", year: 2021 })
    const result = compareGuess(robot, robot)
    expect(result.isCorrect).toBe(true)
    for (const cell of result.cells) {
      expect(cell.status).toBe("correct")
    }
  })

  test("year too low → partial with direction 'up'", () => {
    const guess = makeRobot({ year: 2019 })
    const answer = makeRobot({ year: 2024 })
    const result = compareGuess(guess, answer)
    const yearCell = result.cells.find((c) => c.attribute === "year")
    expect(yearCell?.status).toBe("partial")
    expect(yearCell?.direction).toBe("up")
  })

  test("year too high → partial with direction 'down'", () => {
    const guess = makeRobot({ year: 2030 })
    const answer = makeRobot({ year: 2024 })
    const result = compareGuess(guess, answer)
    const yearCell = result.cells.find((c) => c.attribute === "year")
    expect(yearCell?.status).toBe("partial")
    expect(yearCell?.direction).toBe("down")
  })

  test("trophy attribute uses numeric direction", () => {
    const guess = makeRobot({ trophies: { gold: 0, silver: 0, bronze: 0 } })
    const answer = makeRobot({ trophies: { gold: 5, silver: 0, bronze: 0 } })
    const result = compareGuess(guess, answer)
    const goldCell = result.cells.find((c) => c.attribute === "trophies.gold")
    expect(goldCell?.status).toBe("partial")
    expect(goldCell?.direction).toBe("up")
  })

  test("categorical mismatch is 'wrong' (no direction)", () => {
    const guess = makeRobot({ superCategory: "Sumo" })
    const answer = makeRobot({ superCategory: "Combate" })
    const result = compareGuess(guess, answer)
    const cell = result.cells.find((c) => c.attribute === "superCategory")
    expect(cell?.status).toBe("wrong")
    expect(cell?.direction).toBeUndefined()
  })

  test("boolean active=true displays as 'Sim', false as 'Não'", () => {
    const guessTrue = makeRobot({ active: true })
    const guessFalse = makeRobot({ active: false })
    const answer = makeRobot({ active: true })
    const yesCell = compareGuess(guessTrue, answer).cells.find((c) => c.attribute === "active")
    const noCell = compareGuess(guessFalse, answer).cells.find((c) => c.attribute === "active")
    expect(yesCell?.value).toBe("Sim")
    expect(noCell?.value).toBe("Não")
  })

  test("future date forces every cell to 'wrong' and isCorrect=false even on identical robot", () => {
    const robot = makeRobot({})
    const future = "9999-12-31"
    const result = compareGuess(robot, robot, future)
    expect(result.isCorrect).toBe(false)
    for (const cell of result.cells) {
      expect(cell.status).toBe("wrong")
    }
  })

  test("result attaches guess imageUrl and typographyUrl", () => {
    const guess = makeRobot({ name: "G", imageUrl: "img.png", typographyUrl: "type.svg" })
    const answer = makeRobot({ name: "A" })
    const result = compareGuess(guess, answer)
    expect(result.robotName).toBe("G")
    expect(result.imageUrl).toBe("img.png")
    expect(result.typographyUrl).toBe("type.svg")
  })
})
