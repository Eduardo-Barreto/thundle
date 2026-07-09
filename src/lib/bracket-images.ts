import { type CategoryRobot, proxiedImageUrl } from "@/lib/bracket-api"
import { namesMatch } from "@/lib/bracket-logic"
import type { Robot } from "@/types"

type ImageSource = "thundle-photo" | "thundle-typography" | "api" | "none"

/**
 * Resolve a robot picture, preferring thundle's own roster over the API:
 * thundle photo → thundle typography → proxied API image → nothing.
 */
export function resolveRobotImage(
  name: string,
  thundleRobots: Robot[],
  apiRobots: CategoryRobot[],
): { src: string | null; source: ImageSource } {
  const local = thundleRobots.find((r) => namesMatch(r.name, name))
  if (local?.imageUrl) return { src: local.imageUrl, source: "thundle-photo" }
  if (local?.typographyUrl) return { src: local.typographyUrl, source: "thundle-typography" }

  const api = apiRobots.find((r) => namesMatch(r.name, name))
  if (api?.image_url) return { src: proxiedImageUrl(api.image_url), source: "api" }

  return { src: null, source: "none" }
}
