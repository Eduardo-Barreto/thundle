import { useState, useCallback, useMemo } from "react"

import gameConfig from "@/config/game.json" with { type: "json" }
import robotsData from "@/config/robots.json" with { type: "json" }
import { compareGuess } from "@/lib/compare"
import { getDailyRobot, getTodayStr, getPuzzleNumber } from "@/lib/daily-robot"
import { loadGame, saveGame, recordWin } from "@/lib/storage"
import type { Robot, GuessResult } from "@/types"

const robots = robotsData as Robot[]

export function useGame(dateStr?: string) {
  const date = dateStr ?? getTodayStr()
  const puzzleNumber = getPuzzleNumber(date)
  const answer = useMemo(() => getDailyRobot(robots, date), [date])

  const saved = loadGame(date)

  const [guessNames, setGuessNames] = useState<string[]>(saved?.guesses ?? [])
  const [usedHint, setUsedHint] = useState(saved?.usedHint ?? false)
  const [hintAttribute, setHintAttribute] = useState<string | undefined>(saved?.hintAttribute)
  const [completed, setCompleted] = useState(saved?.completed ?? false)

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
      if (completed || guessedNames.has(robotName)) return

      const newGuesses = [...guessNames, robotName]
      setGuessNames(newGuesses)

      const robot = robots.find((r) => r.name === robotName)
      if (!robot) return

      const result = compareGuess(robot, answer)
      const isWin = result.isCorrect

      if (isWin) {
        setCompleted(true)
        recordWin(date, newGuesses.length)
      }

      saveGame(date, {
        guesses: newGuesses,
        usedHint,
        hintAttribute,
        completed: isWin,
      })
    },
    [completed, guessedNames, guessNames, answer, date, usedHint, hintAttribute],
  )

  const requestHint = useCallback(() => {
    if (usedHint) return

    const eligible = Object.entries(gameConfig.attributes)
      .filter(([_, cfg]) => cfg.hintEligible)
      .map(([key]) => key)

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

  return {
    date,
    puzzleNumber,
    answer,
    robots,
    results,
    guessedNames,
    completed,
    usedHint,
    hintAttribute,
    submitGuess,
    requestHint,
  }
}
