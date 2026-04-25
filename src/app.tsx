import { useState } from "react"

import { Background } from "@/components/background"
import { GuessGrid } from "@/components/guess-grid"
import { Header } from "@/components/header"
import { HintBar } from "@/components/hint-bar"
import { PuzzlePickerModal } from "@/components/puzzle-picker-modal"
import { SearchInput } from "@/components/search-input"
import { StatsModal } from "@/components/stats-modal"
import { WinOverlay } from "@/components/win-overlay"
import { useGame } from "@/hooks/use-game"
import { getDateFromPuzzleNumber, getPuzzleNumber, getTodayStr } from "@/lib/daily-robot"

function getInitialDate(): string {
  const params = new URLSearchParams(window.location.search)
  const puzzleParam = params.get("p")
  if (puzzleParam) {
    const num = Number(puzzleParam)
    if (!Number.isNaN(num)) {
      return getDateFromPuzzleNumber(num)
    }
  }
  return getTodayStr()
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
  const [showStats, setShowStats] = useState(false)
  const [showPuzzles, setShowPuzzles] = useState(false)
  const [selectedDate, setSelectedDate] = useState(getInitialDate)

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
  const [showWin, setShowWin] = useState(true)

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
        disabled={game.completed}
        onSelect={game.submitGuess}
      />
      <HintBar
        usedHint={game.usedHint}
        hintAttribute={game.hintAttribute}
        answer={game.answer}
        onRequestHint={game.requestHint}
      />
      <GuessGrid results={game.results} />
      {game.completed && showWin && (
        <WinOverlay
          answer={game.answer}
          puzzleNumber={game.puzzleNumber}
          results={game.results}
          usedHint={game.usedHint}
          onClose={() => setShowWin(false)}
        />
      )}
      {game.completed && !showWin && (
        <div className="fixed right-4 bottom-4 z-30 md:right-6 md:bottom-6">
          <button
            onClick={() => setShowWin(true)}
            className="bg-thunder-navy text-thunder-yellow focus-visible:outline-thunder-yellow cursor-pointer rounded-lg px-4 py-2.5 font-mono text-xs font-bold tracking-wider uppercase shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-97 md:px-5 md:text-sm"
          >
            Ver resultado
          </button>
        </div>
      )}
    </div>
  )
}
