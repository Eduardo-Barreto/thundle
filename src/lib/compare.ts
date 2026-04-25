import gameConfig from "@/config/game.json" with { type: "json" }
import type { Robot, CellResult, GuessResult } from "@/types"

function getNestedValue(obj: Robot, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

function compareAttribute(
  guessVal: unknown,
  answerVal: unknown,
  type: string,
): Pick<CellResult, "status" | "direction"> {
  if (guessVal === answerVal) {
    return { status: "correct" }
  }

  if (type === "number" || type === "trophies") {
    const g = Number(guessVal)
    const a = Number(answerVal)
    return {
      status: "partial",
      direction: g < a ? "up" : "down",
    }
  }

  return { status: "wrong" }
}

export function compareGuess(guess: Robot, answer: Robot): GuessResult {
  const attributes = gameConfig.attributes
  const cells: CellResult[] = Object.entries(attributes).map(([key, config]) => {
    const guessVal = getNestedValue(guess, key)
    const answerVal = getNestedValue(answer, key)
    const { status, direction } = compareAttribute(guessVal, answerVal, config.type)

    let displayValue: string | number | boolean
    if (typeof guessVal === "boolean") {
      displayValue = guessVal ? "Sim" : "Não"
    } else {
      displayValue = guessVal as string | number
    }

    return { attribute: key, value: displayValue, status, direction }
  })

  const isCorrect = cells.every((c) => c.status === "correct")
  return { robotName: guess.name, imageUrl: guess.imageUrl, cells, isCorrect }
}
