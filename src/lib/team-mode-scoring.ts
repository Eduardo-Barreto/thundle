const TEAM_ANSWER = "THUNDERATZ"
export const TEAM_WORD_LENGTH = TEAM_ANSWER.length
export const TEAM_MAX_ATTEMPTS = 6

export type LetterStatus = "correct" | "partial" | "wrong"
export type ScoredGuess = { letters: string[]; statuses: LetterStatus[] }

export function scoreGuess(guess: string, answer: string = TEAM_ANSWER): ScoredGuess {
  if (guess.length !== answer.length) {
    throw new Error(`Guess length ${guess.length} does not match answer length ${answer.length}`)
  }
  const length = answer.length
  const statuses: LetterStatus[] = Array.from({ length }, () => "wrong")
  const consumed = Array.from({ length }, () => false)

  for (let i = 0; i < length; i++) {
    if (guess[i] === answer[i]) {
      statuses[i] = "correct"
      consumed[i] = true
    }
  }

  for (let i = 0; i < length; i++) {
    if (statuses[i] === "correct") continue
    for (let j = 0; j < length; j++) {
      if (!consumed[j] && guess[i] === answer[j]) {
        statuses[i] = "partial"
        consumed[j] = true
        break
      }
    }
  }

  return { letters: guess.split(""), statuses }
}

export function isWinningGuess(g: ScoredGuess): boolean {
  return g.statuses.every((s) => s === "correct")
}

const STATUS_RANK: Record<LetterStatus, number> = { correct: 3, partial: 2, wrong: 1 }

export function computeKeyStatuses(guesses: ScoredGuess[]): Record<string, LetterStatus> {
  const out: Record<string, LetterStatus> = {}
  for (const g of guesses) {
    for (let i = 0; i < g.letters.length; i++) {
      const letter = g.letters[i]!.toUpperCase()
      const status = g.statuses[i]!
      const current = out[letter]
      if (!current || STATUS_RANK[status] > STATUS_RANK[current]) {
        out[letter] = status
      }
    }
  }
  return out
}
