import { useCallback, useMemo, useState } from "react"

import robotsData from "@/config/robots.json" with { type: "json" }
import { getDailyImageRobot, getPuzzleNumber, getTodayStr } from "@/lib/daily-robot"
import { MAX_IMAGE_GUESSES } from "@/lib/image-modes"
import { loadImageGame, recordImageGameEnd, saveImageGame } from "@/lib/storage"
import type { ImageGameState, ImageGameVariant, Robot } from "@/types"

const robots = robotsData as Robot[]

type UseImageGameOptions = {
  answerOverride?: Robot
  disablePersistence?: boolean
}

type ImageGameSnapshot = { guesses: string[]; completed: boolean; lost: boolean }

function initialSnapshot(
  variant: ImageGameVariant,
  date: string,
  disablePersistence: boolean,
): ImageGameSnapshot {
  const saved = disablePersistence ? undefined : loadImageGame(variant, date)
  if (!saved) return { guesses: [], completed: false, lost: false }
  return {
    guesses: saved.guesses,
    completed: saved.completed,
    lost: saved.lost || (!saved.completed && saved.guesses.length >= MAX_IMAGE_GUESSES),
  }
}

export function useImageGame(
  dateStr: string | undefined,
  variant: ImageGameVariant,
  options: UseImageGameOptions = {},
) {
  const date = dateStr ?? getTodayStr()
  const puzzleNumber = getPuzzleNumber(date)
  const disablePersistence = Boolean(options.disablePersistence)
  const answer = useMemo(
    () => options.answerOverride ?? getDailyImageRobot(robots, date, variant),
    [date, options.answerOverride, variant],
  )

  const [state, setState] = useState<ImageGameSnapshot>(() =>
    initialSnapshot(variant, date, disablePersistence),
  )
  const { guesses: guessNames, completed, lost } = state
  const guessedNames = useMemo(() => new Set(guessNames), [guessNames])

  const submitGuess = useCallback(
    (robotName: string) => {
      if (completed || lost || guessedNames.has(robotName)) return

      const newGuesses = [...guessNames, robotName]
      const isWin = robotName === answer.name
      const isLoss = !isWin && newGuesses.length >= MAX_IMAGE_GUESSES

      setState((prev) => ({
        guesses: newGuesses,
        completed: isWin || prev.completed,
        lost: isLoss || prev.lost,
      }))

      if (disablePersistence) return

      const next: ImageGameState = { guesses: newGuesses, completed: isWin, lost: isLoss }
      saveImageGame(variant, date, next)
      if (isWin || isLoss) {
        recordImageGameEnd(variant, date, { won: isWin, guessCount: newGuesses.length })
      }
    },
    [answer.name, completed, date, disablePersistence, guessedNames, guessNames, lost, variant],
  )

  const isComplete = completed || lost
  const revealed = isComplete ? MAX_IMAGE_GUESSES : guessNames.length
  const remainingGuesses = MAX_IMAGE_GUESSES - guessNames.length

  return {
    date,
    puzzleNumber,
    answer,
    robots,
    guessNames,
    guessedNames,
    completed,
    lost,
    revealed,
    remainingGuesses,
    maxGuesses: MAX_IMAGE_GUESSES,
    submitGuess,
  }
}
