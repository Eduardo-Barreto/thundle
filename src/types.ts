type Trophies = {
  gold: number
  silver: number
  bronze: number
}

export type Robot = {
  name: string
  slug: string
  year: number
  superCategory: string
  category: string
  active: boolean
  trophies: Trophies
  imageUrl: string
  logoUrl?: string
  typographyUrl?: string
  description?: string
}

export type CellResult = {
  attribute: string
  value: string | number | boolean
  status: "correct" | "partial" | "wrong"
  direction?: "up" | "down"
}

export type GuessResult = {
  robotName: string
  imageUrl: string
  typographyUrl?: string
  cells: CellResult[]
  isCorrect: boolean
}

export type GameState = {
  guesses: string[]
  usedHint: boolean
  hintAttribute?: string
  completed: boolean
}

export type ImageGameVariant = "blur" | "zoom"

export type ImageGameState = {
  guesses: string[]
  completed: boolean
  lost: boolean
}

export type BracketTrack = "combate" | "sumo"

export type BracketResult = {
  won: boolean
  correctCount: number
  total: number
}

export type BracketGameState = {
  picks: Record<string, string>
  confirmed: boolean
  result?: BracketResult
}

export type Stats = {
  gamesPlayed: number
  gamesWon: number
  currentStreak: number
  maxStreak: number
  averageGuesses: number
  guessDistribution: Record<string, number>
}

export type LocalState = {
  games: Record<string, GameState>
  imageGames: Record<ImageGameVariant, Record<string, ImageGameState>>
  bracketGames: Record<BracketTrack, Record<string, BracketGameState>>
  stats: Stats
  imageStats: Record<ImageGameVariant, Stats>
  bracketStats: Record<BracketTrack, Stats>
}
