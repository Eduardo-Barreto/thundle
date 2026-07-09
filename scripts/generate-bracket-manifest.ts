/**
 * Gera src/config/brackets.json varrendo os eventos passados da
 * app-api.tapout.gg e validando cada chave candidata.
 *
 * Uso: bun run manifest:brackets
 *
 * Só entram pares (evento, categoria) que passem em todas as validações:
 * allowlist de categoria por track, todos os vencedores resolvíveis (na
 * losers o vencedor é inferido por conteúdo) e janela das semifinais
 * computável. O mapa `pinned` existente é preservado.
 */

import type { BracketResponse } from "../src/lib/bracket-api"
import { buildBracketGraph, computeWindow, resolveWinner } from "../src/lib/bracket-logic"
import type { BracketManifestEntry } from "../src/lib/daily-bracket"
import type { BracketTrack } from "../src/types"

const API_BASE = "https://app-api.tapout.gg"
const OUTPUT = new URL("../src/config/brackets.json", import.meta.url)

const COMBATE_NAMES =
  /^(Fairyweight|Antweight|Beetleweight|Hobbyweight|Featherweight|Lightweight)\b/
const SUMO_NAMES = /^(3kg|Mini - 500g) \((Auto|R\/C)\)$/

type ApiEvent = { slug: string; name: string }
type ApiCategory = { id: number; slug: string; name: string; group: string }

function trackFor(category: ApiCategory): BracketTrack | null {
  if (category.group === "Combate" && COMBATE_NAMES.test(category.name)) return "combate"
  if (category.group === "Sumô" && SUMO_NAMES.test(category.name)) return "sumo"
  return null
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { accept: "application/json" },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${path}`)
  return (await response.json()) as T
}

async function listPastEvents(): Promise<ApiEvent[]> {
  const events: ApiEvent[] = []
  let cursor = 0
  for (;;) {
    const page = await fetchJson<{ data: ApiEvent[]; next: string | null }>(
      `/v1/events?status=past&limit=100&cursor=${cursor}`,
    )
    events.push(...page.data)
    if (page.next === null) return events
    cursor = Number(page.next)
  }
}

function validate(bracket: BracketResponse): { matchCount: number } | { rejected: string } {
  if (bracket.matches.length < 6) return { rejected: "menos de 6 partidas" }
  const graph = buildBracketGraph(bracket.matches)
  for (const match of bracket.matches) {
    if (resolveWinner(graph, match.position) === null) {
      return { rejected: `vencedor irresolvível na posição ${match.position}` }
    }
  }
  const window = computeWindow(graph)
  if (window.slots.length < 4) return { rejected: "janela menor que 4 partidas" }
  return { matchCount: bracket.matches.length }
}

async function main() {
  const existing = JSON.parse(await Bun.file(OUTPUT).text()) as {
    pinned: Record<BracketTrack, Record<string, string>>
  }
  const pools: Record<BracketTrack, BracketManifestEntry[]> = { combate: [], sumo: [] }
  let rejected = 0

  const events = await listPastEvents()
  console.log(`${events.length} eventos passados`)

  for (const event of events) {
    let categories: ApiCategory[]
    try {
      const page = await fetchJson<{ data: ApiCategory[] }>(`/v1/events/${event.slug}/categories`)
      categories = page.data
    } catch (error) {
      console.warn(`! ${event.slug}: categorias indisponíveis (${error})`)
      continue
    }

    for (const category of categories) {
      const track = trackFor(category)
      if (!track) continue
      const id = `${event.slug}/${category.slug}`
      try {
        const bracket = await fetchJson<BracketResponse>(
          `/v1/events/${event.slug}/categories/${category.slug}/bracket`,
        )
        const result = validate(bracket)
        if ("rejected" in result) {
          rejected++
          console.warn(`- ${id}: ${result.rejected}`)
          continue
        }
        pools[track].push({
          eventSlug: event.slug,
          eventName: event.name,
          categoryRef: category.slug,
          categoryName: category.name,
          matchCount: result.matchCount,
          hasDoubleElim: bracket.has_double_elimination,
        })
        console.log(`+ ${id} (${track}, ${result.matchCount} partidas)`)
      } catch (error) {
        rejected++
        console.warn(`- ${id}: ${error}`)
      }
    }
  }

  const sortById = (a: BracketManifestEntry, b: BracketManifestEntry) =>
    `${a.eventSlug}/${a.categoryRef}`.localeCompare(`${b.eventSlug}/${b.categoryRef}`)
  pools.combate.sort(sortById)
  pools.sumo.sort(sortById)

  const manifest = { pinned: existing.pinned, combate: pools.combate, sumo: pools.sumo }
  await Bun.write(OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(
    `aceitos: ${pools.combate.length} combate + ${pools.sumo.length} sumo · rejeitados: ${rejected}`,
  )
}

await main()
