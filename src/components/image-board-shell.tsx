import type { ReactNode } from "react"

import { useImageLoad } from "@/hooks/use-image-load"
import type { Robot } from "@/types"

type ImageBoardShellProps = {
  answer: Robot
  isComplete: boolean
  children: ReactNode
}

export function ImageBoardShell({ answer, isComplete, children }: ImageBoardShellProps) {
  const isLoaded = useImageLoad(answer.imageUrl)

  return (
    <section className="mx-auto mb-6 w-full max-w-[620px]" aria-label="Imagem do robô">
      <div className="border-thunder-yellow/10 bg-surface relative aspect-[4/3] overflow-hidden rounded-xl border shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
        {!answer.imageUrl ? (
          <div className="text-t3 flex size-full items-center justify-center font-mono text-sm">
            sem foto disponível
          </div>
        ) : !isLoaded ? (
          <div className="bg-elevated text-t3 absolute inset-0 flex items-center justify-center font-mono text-[10px] tracking-wider uppercase">
            Carregando imagem
          </div>
        ) : (
          <>
            {children}
            {!isComplete && <div className="absolute inset-0 bg-black/15" />}
          </>
        )}
      </div>
    </section>
  )
}
