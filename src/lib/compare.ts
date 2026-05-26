import gameConfig from "@/config/game.json" with { type: "json" }
import { getTodayStr } from "@/lib/daily-robot"
import { formatAttributeValue } from "@/lib/format"
import { getNestedValue } from "@/lib/nested-value"
import type { Robot, CellResult, GuessResult } from "@/types"

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

export function compareGuess(guess: Robot, answer: Robot, dateStr?: string): GuessResult {
  const isFuture = dateStr ? dateStr > getTodayStr() : false
  const attributes = gameConfig.attributes
  const cells: CellResult[] = Object.entries(attributes).map(([key, config]) => {
    const guessVal = getNestedValue(guess, key)
    const answerVal = getNestedValue(answer, key)
    const { status, direction } = isFuture
      ? { status: "wrong" as const, direction: undefined }
      : compareAttribute(guessVal, answerVal, config.type)

    return { attribute: key, value: formatAttributeValue(guessVal), status, direction }
  })

  const isCorrect = !isFuture && cells.every((c) => c.status === "correct")
  return {
    robotName: guess.name,
    imageUrl: guess.imageUrl,
    typographyUrl: guess.typographyUrl,
    cells,
    isCorrect,
  }
}
