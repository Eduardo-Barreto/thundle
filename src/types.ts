export type Trophies = {
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

export type SuperCategoryConfig = {
  label: string
  categories: string[]
}

export type AttributeConfig = {
  label: string
  type: "number" | "boolean" | "superCategory" | "category" | "trophies"
  hintEligible: boolean
}

export type GameConfig = {
  superCategories: Record<string, SuperCategoryConfig>
  attributes: Record<string, AttributeConfig>
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
  cells: CellResult[]
  isCorrect: boolean
}

export type GameState = {
  guesses: string[]
  usedHint: boolean
  hintAttribute?: string
  completed: boolean
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
  stats: Stats
}
