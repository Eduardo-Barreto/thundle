import { useState, useCallback, useMemo } from "react"

import gameConfig from "@/config/game.json" with { type: "json" }
import robotsData from "@/config/robots.json" with { type: "json" }
import { compareGuess } from "@/lib/compare"
import { getDailyRobot, getTodayStr, getPuzzleNumber } from "@/lib/daily-robot"
import { loadGame, saveGame, recordWin } from "@/lib/storage"
import type { Robot, GuessResult } from "@/types"

const robots = robotsData as Robot[]
const MAX_GUESSES = 10

export function useGame(dateStr?: string) {
  const date = dateStr ?? getTodayStr()
  const puzzleNumber = getPuzzleNumber(date)
  const isFuture = date > getTodayStr()
  const answer = useMemo(() => getDailyRobot(robots, date), [date])

  const saved = loadGame(date)

  const [guessNames, setGuessNames] = useState<string[]>(saved?.guesses ?? [])
  const [usedHint, setUsedHint] = useState(saved?.usedHint ?? false)
  const [hintAttribute, setHintAttribute] = useState<string | undefined>(saved?.hintAttribute)
  const [completed, setCompleted] = useState(saved?.completed ?? false)
  const [lost, setLost] = useState(
    saved?.completed === false && (saved?.guesses.length ?? 0) >= MAX_GUESSES,
  )

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

      const newGuesses = [...guessNames, robotName]
      setGuessNames(newGuesses)

      const robot = robots.find((r) => r.name === robotName)
      if (!robot) return

      const result = compareGuess(robot, answer, date)
      const isWin = result.isCorrect
      const isLoss = !isWin && newGuesses.length >= MAX_GUESSES

      if (isWin) {
        setCompleted(true)
        recordWin(date, newGuesses.length)
      }

      if (isLoss) {
        setLost(true)
      }

      saveGame(date, {
        guesses: newGuesses,
        usedHint,
        hintAttribute,
        completed: isWin,
      })
    },
    [completed, lost, guessedNames, guessNames, answer, date, usedHint, hintAttribute],
  )

  const requestHint = useCallback(() => {
    if (usedHint) return

    const eligible: string[] = []
    for (const [key, cfg] of Object.entries(gameConfig.attributes)) {
      if (cfg.hintEligible) eligible.push(key)
    }

    const picked = eligible[Math.floor(Math.random() * eligible.length)]
    if (!picked) return

    setUsedHint(true)
    setHintAttribute(picked)

    saveGame(date, {
      guesses: guessNames,
      usedHint: true,
      hintAttribute: picked,
      completed,
    })
  }, [usedHint, date, guessNames, completed])

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
