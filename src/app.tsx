import { useState, type ComponentType } from "react"

import { Background } from "@/components/background"
import { GuessGrid } from "@/components/guess-grid"
import { Header } from "@/components/header"
import { HintBar } from "@/components/hint-bar"
import { ImageGuessList } from "@/components/image-guess-list"
import { ImageResultOverlay } from "@/components/image-result-overlay"
import { LoseOverlay } from "@/components/lose-overlay"
import { ProgressiveBlurBoard } from "@/components/progressive-blur-board"
import { ProgressiveZoomBoard } from "@/components/progressive-zoom-board"
import { PuzzlePickerModal } from "@/components/puzzle-picker-modal"
import { SearchInput } from "@/components/search-input"
import { StatsModal } from "@/components/stats-modal"
import { TeamMode } from "@/components/team-mode"
import { WinOverlay } from "@/components/win-overlay"
import robotsData from "@/config/robots.json" with { type: "json" }
import { useGame } from "@/hooks/use-game"
import { useImageGame } from "@/hooks/use-image-game"
import { getDateFromPuzzleNumber, getPuzzleNumber, getTodayStr } from "@/lib/daily-robot"
import { IMAGE_MODE_META } from "@/lib/image-modes"
import { getModeFromPath, TEAM_PATH, updateUrlState, type GameMode } from "@/lib/routing"
import { loadImageStats } from "@/lib/storage"
import type { ImageGameVariant, Robot } from "@/types"

type BoardProps = {
  answer: Robot
  progress: number
  maxProgress: number
  isComplete: boolean
}

const IMAGE_BOARDS: Record<ImageGameVariant, ComponentType<BoardProps>> = {
  blur: ProgressiveBlurBoard,
  zoom: ProgressiveZoomBoard,
}

const MODE_TABS: { mode: GameMode; label: string }[] = [
  { mode: "classic", label: "Clássico" },
  { mode: "blur", label: IMAGE_MODE_META.blur.label },
  { mode: "zoom", label: IMAGE_MODE_META.zoom.label },
]

function getInitialDate(): { date: string; wasFuture: boolean } {
  const params = new URLSearchParams(window.location.search)
  const puzzleParam = params.get("p")
  if (puzzleParam) {
    const num = Number(puzzleParam)
    if (!Number.isNaN(num)) {
      const dateStr = getDateFromPuzzleNumber(num)
      if (dateStr > getTodayStr()) {
        return { date: getTodayStr(), wasFuture: true }
      }
      return { date: dateStr, wasFuture: false }
    }
  }
  return { date: getTodayStr(), wasFuture: false }
}

// Dev-only answer override (`?answer=Name`) for deterministic end-to-end tests.
// `import.meta.env.DEV` is statically false in production builds, so this branch
// is dead-code-eliminated and never ships.
function getAnswerOverride(): Robot | undefined {
  if (!import.meta.env.DEV) return undefined
  const name = new URLSearchParams(window.location.search).get("answer")
  if (!name) return undefined
  return (robotsData as Robot[]).find((r) => r.name === name)
}

export function App() {
  if (window.location.pathname.replace(/\/+$/, "") === TEAM_PATH) {
    return (
      <div className="text-t1 min-h-dvh bg-[#0A0A0A] font-sans">
        <Background />
        <TeamMode />
      </div>
    )
  }
  return <NormalApp />
}

function NormalApp() {
  const [initial] = useState(getInitialDate)
  const [showStats, setShowStats] = useState(false)
  const [showPuzzles, setShowPuzzles] = useState(false)
  const [showTimeTraveler, setShowTimeTraveler] = useState(initial.wasFuture)
  // Date and mode together form the current route, so they live in one cohesive
  // state value that maps directly onto the URL.
  const [route, setRoute] = useState<{ date: string; mode: GameMode }>(() => ({
    date: initial.date,
    mode: getModeFromPath(window.location.pathname),
  }))

  function handleSelectDate(date: string) {
    setRoute((prev) => ({ ...prev, date }))
    setShowPuzzles(false)
    updateUrlState(date, route.mode)
  }

  function handleSelectMode(mode: GameMode) {
    setRoute((prev) => ({ ...prev, mode }))
    updateUrlState(route.date, mode)
  }

  return (
    <div className="text-t1 min-h-dvh bg-[#0A0A0A] font-sans">
      <Background />
      {!showTimeTraveler && (
        <GameScreen
          dateStr={route.date}
          mode={route.mode}
          onSelectMode={handleSelectMode}
          onOpenPuzzles={() => setShowPuzzles(true)}
          onOpenStats={() => setShowStats(true)}
        />
      )}
      {showTimeTraveler && (
        <div className="relative mx-auto max-w-6xl px-4 pb-12 md:px-6">
          <Header
            puzzleNumber={0}
            onOpenPuzzles={() => {
              setShowTimeTraveler(false)
              setShowPuzzles(true)
            }}
            onOpenStats={() => setShowStats(true)}
          />
        </div>
      )}
      {showStats && <StatsModal mode={route.mode} onClose={() => setShowStats(false)} />}
      {showPuzzles && (
        <PuzzlePickerModal onClose={() => setShowPuzzles(false)} onSelectDate={handleSelectDate} />
      )}
      {showTimeTraveler && (
        <TimeTravelerModal
          onOpenPuzzles={() => {
            setShowTimeTraveler(false)
            setShowPuzzles(true)
          }}
        />
      )}
    </div>
  )
}

function TimeTravelerModal({ onOpenPuzzles }: { onOpenPuzzles: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div
        className="bg-surface flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-white/6 p-8"
        style={{ animation: "win-card 500ms cubic-bezier(0.23,1,0.32,1) both" }}
      >
        <p className="text-center text-4xl">🕰️</p>
        <h2 className="text-center font-mono text-xl font-bold">Viajante do tempo?</h2>
        <p className="text-t2 text-center text-sm leading-relaxed">
          Esse puzzle ainda não existe. Volte quando chegar o dia certo!
        </p>
        <button
          type="button"
          onClick={onOpenPuzzles}
          className="bg-thunder-navy text-thunder-yellow focus-visible:outline-thunder-yellow w-full cursor-pointer rounded-lg px-5 py-3 font-mono text-xs font-bold tracking-wider uppercase transition-all duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-97"
        >
          Ver puzzles anteriores
        </button>
      </div>
    </div>
  )
}

function GameScreen({
  dateStr,
  mode,
  onSelectMode,
  onOpenPuzzles,
  onOpenStats,
}: {
  dateStr: string
  mode: GameMode
  onSelectMode: (mode: GameMode) => void
  onOpenPuzzles: () => void
  onOpenStats: () => void
}) {
  return (
    <div className="relative mx-auto max-w-6xl px-4 pb-12 md:px-6">
      <Header
        puzzleNumber={getPuzzleNumber(dateStr)}
        onOpenPuzzles={onOpenPuzzles}
        onOpenStats={onOpenStats}
      />
      <ModeSwitch mode={mode} onSelectMode={onSelectMode} />
      {mode === "classic" ? (
        <ClassicGameContent key={`classic-${dateStr}`} dateStr={dateStr} />
      ) : (
        <ImageGameContent key={`${mode}-${dateStr}`} dateStr={dateStr} variant={mode} />
      )}
    </div>
  )
}

function ModeSwitch({
  mode,
  onSelectMode,
}: {
  mode: GameMode
  onSelectMode: (mode: GameMode) => void
}) {
  return (
    <div className="mx-auto mb-6 grid w-full max-w-[560px] grid-cols-3 rounded-lg border border-white/6 bg-black/20 p-1 font-mono text-[10px] font-bold tracking-wider uppercase md:mb-8">
      {MODE_TABS.map((tab) => (
        <button
          key={tab.mode}
          type="button"
          onClick={() => onSelectMode(tab.mode)}
          aria-pressed={mode === tab.mode}
          className={`cursor-pointer rounded-md px-3 py-2 transition-all duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            mode === tab.mode ? "bg-thunder-yellow text-black" : "text-t3 hover:text-t2"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function ReopenResultButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="fixed right-4 bottom-4 z-30 md:right-6 md:bottom-6">
      <button
        type="button"
        onClick={onClick}
        className="bg-thunder-navy text-thunder-yellow focus-visible:outline-thunder-yellow cursor-pointer rounded-lg px-4 py-2.5 font-mono text-xs font-bold tracking-wider uppercase shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-97 md:px-5 md:text-sm"
      >
        Ver resultado
      </button>
    </div>
  )
}

function ClassicGameContent({ dateStr }: { dateStr: string }) {
  const game = useGame(dateStr)
  const [showOverlay, setShowOverlay] = useState(true)
  const gameOver = game.completed || game.lost
  const isToday = dateStr === getTodayStr()

  return (
    <>
      <SearchInput
        robots={game.robots}
        guessedNames={game.guessedNames}
        disabled={gameOver}
        onSelect={game.submitGuess}
      />
      <HintBar
        usedHint={game.usedHint}
        hintAttribute={game.hintAttribute}
        answer={game.answer}
        onRequestHint={game.requestHint}
      />
      {!gameOver && (
        <p className="text-t3 mb-4 text-center font-mono text-[10px] tracking-wider uppercase">
          {game.remainingGuesses} tentativas restantes
        </p>
      )}
      <GuessGrid results={game.results} />
      {game.completed && showOverlay && (
        <WinOverlay
          answer={game.answer}
          puzzleNumber={game.puzzleNumber}
          results={game.results}
          usedHint={game.usedHint}
          isToday={isToday}
          onClose={() => setShowOverlay(false)}
        />
      )}
      {game.lost && showOverlay && (
        <LoseOverlay
          answer={game.answer}
          puzzleNumber={game.puzzleNumber}
          results={game.results}
          usedHint={game.usedHint}
          isFuture={false}
          isToday={isToday}
          onClose={() => setShowOverlay(false)}
        />
      )}
      {gameOver && !showOverlay && <ReopenResultButton onClick={() => setShowOverlay(true)} />}
    </>
  )
}

function ImageGameContent({ dateStr, variant }: { dateStr: string; variant: ImageGameVariant }) {
  const override = getAnswerOverride()
  const game = useImageGame(dateStr, variant, override ? { answerOverride: override } : {})
  const [showOverlay, setShowOverlay] = useState(true)
  const gameOver = game.completed || game.lost
  const isToday = dateStr === getTodayStr()
  const meta = IMAGE_MODE_META[variant]
  const Board = IMAGE_BOARDS[variant]

  return (
    <>
      <Board
        answer={game.answer}
        progress={game.revealed}
        maxProgress={game.maxGuesses}
        isComplete={gameOver}
      />
      <SearchInput
        robots={game.robots}
        guessedNames={game.guessedNames}
        disabled={gameOver}
        onSelect={game.submitGuess}
      />
      {!gameOver && (
        <div className="text-t3 mb-4 flex items-center justify-center gap-3 font-mono text-[10px] tracking-wider uppercase">
          <span>
            {game.remainingGuesses} {game.remainingGuesses === 1 ? "tentativa" : "tentativas"}
          </span>
          <span className="size-1 rounded-full bg-white/12" />
          <span>
            {game.revealed}/{game.maxGuesses} {meta.unitLabel}
          </span>
        </div>
      )}
      <ImageGuessList
        guesses={game.guessNames}
        correctName={game.completed ? game.answer.name : undefined}
      />
      {gameOver && (
        <p className="text-t3 mt-4 text-center font-mono text-[10px] tracking-wider uppercase">
          {game.completed ? "Imagem revelada por acerto" : meta.lossMessage}
        </p>
      )}
      {gameOver && showOverlay && (
        <ImageResultOverlay
          answer={game.answer}
          puzzleNumber={game.puzzleNumber}
          guessCount={game.guessNames.length}
          won={game.completed}
          isToday={isToday}
          streak={loadImageStats(variant).currentStreak}
          sharePath={meta.path}
          shareLabel={meta.label}
          onClose={() => setShowOverlay(false)}
        />
      )}
      {gameOver && !showOverlay && <ReopenResultButton onClick={() => setShowOverlay(true)} />}
    </>
  )
}
