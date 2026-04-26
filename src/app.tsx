import { useState } from "react"

import { Background } from "@/components/background"
import { GuessGrid } from "@/components/guess-grid"
import { Header } from "@/components/header"
import { HintBar } from "@/components/hint-bar"
import { LoseOverlay } from "@/components/lose-overlay"
import { PuzzlePickerModal } from "@/components/puzzle-picker-modal"
import { SearchInput } from "@/components/search-input"
import { StatsModal } from "@/components/stats-modal"
import { WinOverlay } from "@/components/win-overlay"
import { useGame } from "@/hooks/use-game"
import { getDateFromPuzzleNumber, getPuzzleNumber, getTodayStr } from "@/lib/daily-robot"

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

function updateUrl(dateStr: string) {
  const todayStr = getTodayStr()
  const puzzleNumber = getPuzzleNumber(dateStr)
  const url = new URL(window.location.href)
  if (dateStr === todayStr) {
    url.searchParams.delete("p")
  } else {
    url.searchParams.set("p", String(puzzleNumber))
  }
  window.history.replaceState(null, "", url)
}

export function App() {
  const [initial] = useState(getInitialDate)
  const [showStats, setShowStats] = useState(false)
  const [showPuzzles, setShowPuzzles] = useState(false)
  const [showTimeTraveler, setShowTimeTraveler] = useState(initial.wasFuture)
  const [selectedDate, setSelectedDate] = useState(initial.date)

  function handleSelectDate(d: string) {
    setSelectedDate(d)
    setShowPuzzles(false)
    updateUrl(d)
  }

  return (
    <div className="text-t1 min-h-dvh bg-[#0A0A0A] font-sans">
      <Background />
      <GameScreen
        key={selectedDate}
        dateStr={selectedDate}
        onOpenPuzzles={() => setShowPuzzles(true)}
        onOpenStats={() => setShowStats(true)}
      />
      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
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
  onOpenPuzzles,
  onOpenStats,
}: {
  dateStr: string
  onOpenPuzzles: () => void
  onOpenStats: () => void
}) {
  const game = useGame(dateStr)
  const [showOverlay, setShowOverlay] = useState(true)
  const gameOver = game.completed || game.lost
  const isToday = dateStr === getTodayStr()

  return (
    <div className="relative mx-auto max-w-6xl px-4 pb-12 md:px-6">
      <Header
        puzzleNumber={game.puzzleNumber}
        onOpenPuzzles={onOpenPuzzles}
        onOpenStats={onOpenStats}
      />
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
      {gameOver && !showOverlay && (
        <div className="fixed right-4 bottom-4 z-30 md:right-6 md:bottom-6">
          <button
            onClick={() => setShowOverlay(true)}
            className="bg-thunder-navy text-thunder-yellow focus-visible:outline-thunder-yellow cursor-pointer rounded-lg px-4 py-2.5 font-mono text-xs font-bold tracking-wider uppercase shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-97 md:px-5 md:text-sm"
          >
            Ver resultado
          </button>
        </div>
      )}
    </div>
  )
}
