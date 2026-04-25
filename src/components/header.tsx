type HeaderProps = {
  puzzleNumber: number
  onOpenPuzzles: () => void
  onOpenStats: () => void
}

export function Header({ puzzleNumber, onOpenPuzzles, onOpenStats }: HeaderProps) {
  const num = String(puzzleNumber).padStart(3, "0")
  return (
    <header className="relative flex items-baseline justify-center gap-4 px-6 pt-6 pb-7">
      <h1 className="font-mono text-3xl font-bold tracking-tight md:text-[44px]">
        thundle
        <span className="text-thunder-yellow drop-shadow-[0_0_6px_rgba(255,229,0,0.25)]">.</span>
      </h1>
      <p className="text-t3 font-mono text-xs tracking-wider uppercase md:text-base">
        <span className="text-thunder-yellow/20">#{num}</span>
      </p>
      <div className="absolute right-6 flex gap-2">
        <IconButton label="Puzzles anteriores" onClick={onOpenPuzzles}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </IconButton>
        <IconButton label="Estatísticas" onClick={onOpenStats}>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </IconButton>
      </div>
    </header>
  )
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className="text-t3 hover:text-t2 focus-visible:outline-thunder-yellow flex size-9 cursor-pointer items-center justify-center rounded-md border border-white/6 transition-all duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-93 md:size-10"
    >
      <svg
        className="size-4 md:size-[18px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        {children}
      </svg>
    </button>
  )
}
