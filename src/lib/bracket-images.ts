import { type CategoryRobot, proxiedImageUrl } from "@/lib/bracket-api"
import { namesMatch, normalizeName } from "@/lib/bracket-logic"
import type { Robot } from "@/types"

type ImageSource = "thundle-photo" | "thundle-typography" | "api" | "none"

function sameRobot(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b)
}

/**
 * Resolve a robot picture, preferring thundle's own roster over the API:
 * thundle photo → thundle typography → proxied API image → nothing.
 *
 * O nome pode chegar truncado (variante de célula da API), então primeiro é
 * canonicalizado contra o roster da categoria (exato antes de prefixo). Contra
 * o roster do thundle o match é sempre exato: "Adam" e "Adam Jr" são robôs
 * diferentes, prefixo aqui trocaria a foto.
 */
export function resolveRobotImage(
  name: string,
  thundleRobots: Robot[],
  apiRobots: CategoryRobot[],
): { src: string | null; source: ImageSource } {
  const api =
    apiRobots.find((r) => sameRobot(r.name, name)) ??
    apiRobots.find((r) => namesMatch(r.name, name))
  const canonical = api?.name ?? name

  const local = thundleRobots.find((r) => sameRobot(r.name, canonical) || sameRobot(r.name, name))
  if (local?.imageUrl.trim()) return { src: local.imageUrl, source: "thundle-photo" }
  if (local?.typographyUrl?.trim()) {
    return { src: local.typographyUrl, source: "thundle-typography" }
  }

  if (api?.image_url) return { src: proxiedImageUrl(api.image_url), source: "api" }

  return { src: null, source: "none" }
}
