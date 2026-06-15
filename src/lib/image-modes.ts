import type { ImageGameVariant } from "@/types"

export const MAX_IMAGE_GUESSES = 9

export function revealRatio(progress: number, max: number): number {
  if (max <= 0) return 1
  return Math.min(Math.max(progress, 0), max) / max
}

type ImageModeMeta = {
  label: string
  path: string
  unitLabel: string
  lossMessage: string
}

export const IMAGE_MODE_META: Record<ImageGameVariant, ImageModeMeta> = {
  blur: {
    label: "Desfoque",
    path: "desfoque",
    unitLabel: "nitidez",
    lossMessage: "Imagem perdeu todo o desfoque",
  },
  zoom: {
    label: "Zoom",
    path: "zoom",
    unitLabel: "zoom",
    lossMessage: "Imagem perdeu todo o zoom",
  },
}
