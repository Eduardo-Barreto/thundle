export const API_BASE = "https://app-api.tapout.gg"

interface MatchSide {
  robot: string | null
  team: string | null
  country: string | null
  score: number | null
}

interface MatchDetail {
  category_id: number
  position: number
  winner: string | null
  win_reason: string
  year: number
  class_name: string
  left: MatchSide
  right: MatchSide
}

export interface ApiBracketMatch {
  position: number
  side: "winners" | "losers"
  cell_robot_a: string | null
  cell_robot_b: string | null
  cell_winner: string | null
  cell_loser_dropped: string | null
  detail: MatchDetail | null
}

export interface BracketResponse {
  event_slug: string
  category_id: number
  has_double_elimination: boolean
  matches: ApiBracketMatch[]
}

export interface CategoryRobot {
  name: string
  team: string
  team_id: number
  image_url: string
  rank: number
}

function cacheKey(kind: string, eventSlug: string, categoryRef: string): string {
  return `thundle:bracket:${kind}:${eventSlug}:${categoryRef}`
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Historical brackets are immutable and re-fetchable; a full quota or a
    // disabled localStorage is not worth failing the request over.
  }
}

export async function fetchBracket(
  eventSlug: string,
  categoryRef: string,
): Promise<BracketResponse> {
  const key = cacheKey("bracket", eventSlug, categoryRef)
  const cached = readCache<BracketResponse>(key)
  if (cached) return cached

  const res = await fetch(
    `${API_BASE}/v1/events/${encodeURIComponent(eventSlug)}/categories/${encodeURIComponent(categoryRef)}/bracket`,
  )
  if (!res.ok) throw new Error(`bracket fetch failed: ${res.status}`)
  const data = (await res.json()) as BracketResponse
  writeCache(key, data)
  return data
}

export async function fetchCategoryRobots(
  eventSlug: string,
  categoryRef: string,
): Promise<CategoryRobot[]> {
  const key = cacheKey("robots", eventSlug, categoryRef)
  const cached = readCache<CategoryRobot[]>(key)
  if (cached) return cached

  const res = await fetch(
    `${API_BASE}/v1/events/${encodeURIComponent(eventSlug)}/categories/${encodeURIComponent(categoryRef)}/robots`,
  )
  if (!res.ok) throw new Error(`robots fetch failed: ${res.status}`)
  const body = (await res.json()) as { data: CategoryRobot[] }
  writeCache(key, body.data)
  return body.data
}

export function proxiedImageUrl(src: string): string {
  return `${API_BASE}/img?src=${encodeURIComponent(src)}`
}
