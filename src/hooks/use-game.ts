import { useState, useCallback, useMemo } from "react"

import gameConfig from "@/config/game.json" with { type: "json" }
import robotsData from "@/config/robots.json" with { type: "json" }
import { compareGuess } from "@/lib/compare"
import { getDailyRobot, getTodayStr, getPuzzleNumber } from "@/lib/daily-robot"
import { loadGame, saveGame, recordGameEnd } from "@/lib/storage"
import type { Robot, GuessResult, GameState } from "@/types"

const robots = robotsData as Robot[]
const MAX_GUESSES = 10

function pickRandomHint(): string | undefined {
  const eligible: string[] = []
  for (const [key, cfg] of Object.entries(gameConfig.attributes)) {
    if (cfg.hintEligible) eligible.push(key)
  }
  if (eligible.length === 0) return undefined
  return eligible[Math.floor(Math.random() * eligible.length)]
}

type InitialGameState = Pick<GameState, "guesses" | "usedHint" | "hintAttribute" | "completed"> & {
  lost: boolean
}

function initialGameState(date: string, disablePersistence: boolean): InitialGameState {
  const saved = disablePersistence ? undefined : loadGame(date)
  if (!saved)
    return { guesses: [], usedHint: false, hintAttribute: undefined, completed: false, lost: false }
  const lost = !saved.completed && saved.guesses.length >= MAX_GUESSES
  return {
    guesses: saved.guesses,
    usedHint: saved.usedHint,
    hintAttribute: saved.hintAttribute,
    completed: saved.completed,
    lost,
  }
}

type UseGameOptions = {
  answerOverride?: Robot
  disablePersistence?: boolean
}

export function useGame(dateStr?: string, options: UseGameOptions = {}) {
  const date = dateStr ?? getTodayStr()
  const puzzleNumber = getPuzzleNumber(date)
  const isFuture = date > getTodayStr()
  const disablePersistence = Boolean(options.disablePersistence)
  const answer = useMemo(
    () => options.answerOverride ?? getDailyRobot(robots, date),
    [date, options.answerOverride],
  )

  const [state, setState] = useState<InitialGameState>(() =>
    initialGameState(date, disablePersistence),
  )
  const { guesses: guessNames, usedHint, hintAttribute, completed, lost } = state

  const results: GuessResult[] = useMemo(
    () =>
      guessNames.map((name) => {
        const robot = robots.find((r) => r.name === name)
        if (!robot) throw new Error(`Robot not found: ${name}`)
        return compareGuess(robot, answer, date)
      }),
    [guessNames, answer, date],
  )

  const guessedNames = useMemo(() => new Set(guessNames), [guessNames])

  const submitGuess = useCallback(
    (robotName: string) => {
      if (completed || lost || guessedNames.has(robotName)) return
      const robot = robots.find((r) => r.name === robotName)
      if (!robot) return

      const newGuesses = [...guessNames, robotName]
      const result = compareGuess(robot, answer, date)
      const isWin = result.isCorrect
      const isLoss = !isWin && newGuesses.length >= MAX_GUESSES

      setState((prev) => ({
        ...prev,
        guesses: newGuesses,
        completed: isWin || prev.completed,
        lost: isLoss || prev.lost,
      }))

      if (disablePersistence) return

      saveGame(date, {
        guesses: newGuesses,
        usedHint,
        hintAttribute,
        completed: isWin,
      })

      if (isWin || isLoss) {
        recordGameEnd(date, { won: isWin, guessCount: newGuesses.length })
      }
    },
    [
      completed,
      lost,
      guessedNames,
      guessNames,
      answer,
      date,
      usedHint,
      hintAttribute,
      disablePersistence,
    ],
  )

  const requestHint = useCallback(() => {
    if (usedHint) return
    const picked = pickRandomHint()
    if (!picked) return

    setState((prev) => ({ ...prev, usedHint: true, hintAttribute: picked }))

    if (disablePersistence) return
    saveGame(date, {
      guesses: guessNames,
      usedHint: true,
      hintAttribute: picked,
      completed,
    })
  }, [usedHint, date, guessNames, completed, disablePersistence])

  const remainingGuesses = MAX_GUESSES - guessNames.length

  return {
    date,
    puzzleNumber,
    answer,
    robots,
    results,
    guessedNames,
    completed,
    lost,
    isFuture,
    usedHint,
    hintAttribute,
    remainingGuesses,
    submitGuess,
    requestHint,
  }
}
