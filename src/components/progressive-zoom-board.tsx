import { ImageBoardShell } from "@/components/image-board-shell"
import { revealRatio } from "@/lib/image-modes"
import type { Robot } from "@/types"

type ProgressiveZoomBoardProps = {
  answer: Robot
  progress: number
  maxProgress: number
  isComplete: boolean
}

const MAX_ZOOM = 6

export function ProgressiveZoomBoard({
  answer,
  progress,
  maxProgress,
  isComplete,
}: ProgressiveZoomBoardProps) {
  const ratio = revealRatio(progress, maxProgress)
  const zoom = isComplete ? 1 : 1 + (MAX_ZOOM - 1) * (1 - ratio)

  return (
    <ImageBoardShell answer={answer} isComplete={isComplete}>
      <img
        src={answer.imageUrl}
        alt={answer.name}
        className="size-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{ transform: `scale(${zoom})` }}
      />
    </ImageBoardShell>
  )
}
