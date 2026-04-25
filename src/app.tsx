import { Background } from "@/components/background"
import { GuessGrid } from "@/components/guess-grid"
import { Header } from "@/components/header"
import { HintBar } from "@/components/hint-bar"
import { SearchInput } from "@/components/search-input"
import { WinOverlay } from "@/components/win-overlay"
import { useGame } from "@/hooks/use-game"

export function App() {
  const game = useGame()

  return (
    <div className="text-t1 min-h-dvh bg-[#0A0A0A] font-sans">
      <Background />
      <div className="relative mx-auto max-w-[820px] px-5 pb-12">
        <Header puzzleNumber={game.puzzleNumber} onOpenPuzzles={() => {}} onOpenStats={() => {}} />
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
        {game.completed && (
          <WinOverlay
            answer={game.answer}
            puzzleNumber={game.puzzleNumber}
            results={game.results}
            usedHint={game.usedHint}
          />
        )}
      </div>
    </div>
  )
}
