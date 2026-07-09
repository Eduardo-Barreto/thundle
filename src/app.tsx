import { useState, type ComponentType } from "react"

import { Background } from "@/components/background"
import { BracketBoard } from "@/components/bracket-board"
import { BracketResultOverlay } from "@/components/bracket-result-overlay"
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
import { useBracketGame } from "@/hooks/use-bracket-game"
import { useGame } from "@/hooks/use-game"
import { useImageGame } from "@/hooks/use-image-game"
import { BRACKET_TRACK_META, BRACKET_TRACKS } from "@/lib/bracket-modes"
import { shareRoundsFor } from "@/lib/bracket-share"
import type { BracketManifestEntry } from "@/lib/daily-bracket"
import { getDateFromPuzzleNumber, getPuzzleNumber, getTodayStr } from "@/lib/daily-robot"
import { IMAGE_MODE_META } from "@/lib/image-modes"
import {
  getModeFromPath,
  getTrackFromSearch,
  TEAM_PATH,
  updateUrlState,
  type GameMode,
} from "@/lib/routing"
import { loadBracketGame, loadBracketStats, loadImageStats } from "@/lib/storage"
import type { BracketTrack, ImageGameVariant, Robot } from "@/types"

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
  { mode: "bracket", label: "Bracket" },
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

// Dev-only bracket override (`?bracket=eventSlug/categoryRef`), same contract as
// `?answer` above: pins the daily pick so e2e runs against a mocked bracket.
function getBracketOverride(): BracketManifestEntry | undefined {
  if (!import.meta.env.DEV) return undefined
  const raw = new URLSearchParams(window.location.search).get("bracket")
  if (!raw) return undefined
  const [eventSlug, categoryRef] = raw.split("/")
  if (!eventSlug || !categoryRef) return undefined
  return {
    eventSlug,
    eventName: eventSlug,
    categoryRef,
    categoryName: categoryRef,
    matchCount: 0,
    hasDoubleElim: true,
  }
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
  // Date, mode and bracket track together form the current route, so they live
  // in one cohesive state value that maps directly onto the URL.
  const [route, setRoute] = useState<{ date: string; mode: GameMode; track: BracketTrack }>(() => ({
    date: initial.date,
    mode: getModeFromPath(window.location.pathname),
    track: getTrackFromSearch(window.location.search) ?? "combate",
  }))

  function handleSelectDate(date: string) {
    setRoute((prev) => ({ ...prev, date }))
    setShowPuzzles(false)
    updateUrlState(date, route.mode, route.track)
  }

  function handleSelectMode(mode: GameMode) {
    setRoute((prev) => ({ ...prev, mode }))
    updateUrlState(route.date, mode, route.track)
  }

  function handleSelectTrack(track: BracketTrack) {
    setRoute((prev) => ({ ...prev, track }))
    updateUrlState(route.date, route.mode, track)
  }

  return (
    <div className="text-t1 min-h-dvh bg-[#0A0A0A] font-sans">
      <Background />
      {!showTimeTraveler && (
        <GameScreen
          dateStr={route.date}
          mode={route.mode}
          track={route.track}
          onSelectMode={handleSelectMode}
          onSelectTrack={handleSelectTrack}
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
      {showStats && (
        <StatsModal mode={route.mode} track={route.track} onClose={() => setShowStats(false)} />
      )}
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
  track,
  onSelectMode,
  onSelectTrack,
  onOpenPuzzles,
  onOpenStats,
}: {
  dateStr: string
  mode: GameMode
  track: BracketTrack
  onSelectMode: (mode: GameMode) => void
  onSelectTrack: (track: BracketTrack) => void
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
      {mode === "classic" && <ClassicGameContent key={`classic-${dateStr}`} dateStr={dateStr} />}
      {(mode === "blur" || mode === "zoom") && (
        <ImageGameContent key={`${mode}-${dateStr}`} dateStr={dateStr} variant={mode} />
      )}
      {mode === "bracket" && (
        <BracketGameContent
          key={`bracket-${track}-${dateStr}`}
          dateStr={dateStr}
          track={track}
          onSelectTrack={onSelectTrack}
        />
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
    <div className="mx-auto mb-6 grid w-full max-w-[560px] grid-cols-4 rounded-lg border border-white/6 bg-black/20 p-1 font-mono text-[10px] font-bold tracking-wider uppercase md:mb-8">
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

function trackStatus(track: BracketTrack, dateStr: string): "todo" | "playing" | "done" {
  const saved = loadBracketGame(track, dateStr)
  if (!saved) return "todo"
  if (saved.confirmed) return "done"
  return Object.keys(saved.picks).length > 0 ? "playing" : "todo"
}

const TRACK_STATUS_LABEL = { todo: "", playing: "…", done: "✓" } as const

function combinedEntriesFor(dateStr: string) {
  const entries = BRACKET_TRACKS.map((t) => {
    const result = loadBracketGame(t, dateStr)?.result
    if (!result) return undefined
    return {
      trackLabel: BRACKET_TRACK_META[t].label,
      correctCount: result.correctCount,
      total: result.total,
      championCorrect: result.won,
    }
  })
  return entries.every(Boolean) ? (entries as NonNullable<(typeof entries)[number]>[]) : undefined
}

function TrackSwitch({
  track,
  dateStr,
  onSelectTrack,
}: {
  track: BracketTrack
  dateStr: string
  onSelectTrack: (track: BracketTrack) => void
}) {
  return (
    <div className="mx-auto mb-6 grid w-full max-w-[360px] grid-cols-2 rounded-lg border border-white/6 bg-black/20 p-1 font-mono text-[10px] font-bold tracking-wider uppercase">
      {BRACKET_TRACKS.map((t) => {
        const status = TRACK_STATUS_LABEL[trackStatus(t, dateStr)]
        return (
          <button
            key={t}
            type="button"
            onClick={() => onSelectTrack(t)}
            aria-pressed={track === t}
            className={`cursor-pointer rounded-md px-3 py-2 transition-all duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] ${
              track === t ? "bg-thunder-yellow text-black" : "text-t3 hover:text-t2"
            }`}
          >
            {BRACKET_TRACK_META[t].label}
            {status && <span className="ml-1">{status}</span>}
          </button>
        )
      })}
    </div>
  )
}

function BracketGameContent({
  dateStr,
  track,
  onSelectTrack,
}: {
  dateStr: string
  track: BracketTrack
  onSelectTrack: (track: BracketTrack) => void
}) {
  // Estável entre renders: um objeto novo por render refaria o fetch em loop.
  const [override] = useState(getBracketOverride)
  const [options] = useState(() => (override ? { entryOverride: override } : {}))
  const game = useBracketGame(dateStr, track, options)
  const [showOverlay, setShowOverlay] = useState(true)
  const isToday = dateStr === getTodayStr()
  const otherTrack: BracketTrack = track === "combate" ? "sumo" : "combate"

  return (
    <>
      <TrackSwitch track={track} dateStr={dateStr} onSelectTrack={onSelectTrack} />
      <div className="mb-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <p className="text-t1 font-mono text-sm font-bold">
          {game.entry.eventName} · {game.entry.categoryName}
        </p>
        <p className="text-t3 font-mono text-[10px] tracking-wider uppercase">
          das semifinais em diante · dupla eliminação
        </p>
      </div>

      {game.remote.status === "loading" && (
        <div aria-label="Carregando chave" className="mb-6 flex flex-col gap-4">
          <div className="flex gap-4">
            {[0, 1, 2].map((column) => (
              <div key={column} className="flex flex-1 flex-col justify-center gap-3">
                <div className="h-16 animate-pulse rounded-lg bg-white/6" />
                {column === 0 && <div className="h-16 animate-pulse rounded-lg bg-white/6" />}
              </div>
            ))}
          </div>
          <div className="h-16 animate-pulse rounded-lg bg-white/6" />
        </div>
      )}

      {game.remote.status === "error" && (
        <div className="mb-6 flex flex-col items-center gap-4 py-8">
          <p className="text-t2 text-center font-mono text-sm">
            Não deu pra carregar a chave. Verifique sua conexão.
          </p>
          <button
            type="button"
            onClick={game.retry}
            className="bg-thunder-navy text-thunder-yellow cursor-pointer rounded-lg px-5 py-3 font-mono text-xs font-bold tracking-wider uppercase transition-all duration-160 hover:brightness-110 active:scale-97"
          >
            Tentar de novo
          </button>
        </div>
      )}

      {game.remote.status === "ready" && game.propagation && (
        <>
          <BracketBoard
            window={game.remote.window}
            graph={game.remote.graph}
            slots={game.propagation.slots}
            picks={game.picks}
            confirmed={game.confirmed}
            thundleRobots={game.thundleRobots}
            apiRobots={game.remote.apiRobots}
            onPick={game.setPick}
          />
          {!game.confirmed && (
            <div className="mx-auto mb-6 flex w-full max-w-[560px] items-center gap-3 rounded-lg border border-white/6 bg-black/20 p-3">
              <p className="text-t3 font-mono text-[10px] tracking-wider uppercase">
                {game.pendingCount > 0
                  ? `${game.pendingCount} ${game.pendingCount === 1 ? "previsão faltando" : "previsões faltando"}`
                  : "Tudo preenchido — revise e confirme"}
              </p>
              <div className="flex-1" />
              <button
                type="button"
                onClick={game.clearPicks}
                disabled={game.picks.size === 0}
                className="text-t3 hover:text-t2 cursor-pointer rounded-lg border border-white/10 px-3 py-2 font-mono text-[10px] font-bold tracking-wider uppercase disabled:cursor-default disabled:opacity-40"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={game.confirm}
                disabled={!game.canConfirm}
                className="bg-thunder-yellow cursor-pointer rounded-lg px-4 py-2 font-mono text-[10px] font-bold tracking-wider text-black uppercase transition-all duration-160 hover:brightness-110 active:scale-97 disabled:cursor-default disabled:opacity-40"
              >
                Confirmar
              </button>
            </div>
          )}
          {game.confirmed && game.result && showOverlay && (
            <BracketResultOverlay
              track={track}
              eventName={game.entry.eventName}
              categoryName={game.entry.categoryName}
              champion={game.remote.graph.champion}
              result={game.result}
              shareRounds={shareRoundsFor(
                game.remote.window,
                game.picks,
                game.remote.graph,
                game.propagation.resetActive,
              )}
              championCorrect={game.result.won}
              puzzleNumber={game.puzzleNumber}
              isToday={isToday}
              streak={loadBracketStats(track).currentStreak}
              thundleRobots={game.thundleRobots}
              apiRobots={game.remote.apiRobots}
              otherTrackDone={trackStatus(otherTrack, dateStr) === "done"}
              combinedEntries={combinedEntriesFor(dateStr)}
              onSwitchTrack={() => onSelectTrack(otherTrack)}
              onClose={() => setShowOverlay(false)}
            />
          )}
          {game.confirmed && !showOverlay && (
            <ReopenResultButton onClick={() => setShowOverlay(true)} />
          )}
        </>
      )}
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
