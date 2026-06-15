import { ImageBoardShell } from "@/components/image-board-shell"
import { revealRatio } from "@/lib/image-modes"
import type { Robot } from "@/types"

type ProgressiveBlurBoardProps = {
  answer: Robot
  progress: number
  maxProgress: number
  isComplete: boolean
}

const MAX_BLUR = 34

export function ProgressiveBlurBoard({
  answer,
  progress,
  maxProgress,
  isComplete,
}: ProgressiveBlurBoardProps) {
  const ratio = revealRatio(progress, maxProgress)
  const blur = isComplete ? 0 : Math.round(MAX_BLUR * (1 - ratio))
  const scale = isComplete ? 1 : 1 + blur / 170

  return (
    <ImageBoardShell answer={answer} isComplete={isComplete}>
      <img
        src={answer.imageUrl}
        alt={answer.name}
        className="size-full object-cover transition-[filter,transform] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{ filter: `blur(${blur}px)`, transform: `scale(${scale})` }}
      />
    </ImageBoardShell>
  )
}
