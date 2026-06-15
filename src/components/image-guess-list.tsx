type ImageGuessListProps = {
  guesses: string[]
  correctName?: string
}

export function ImageGuessList({ guesses, correctName }: ImageGuessListProps) {
  if (guesses.length === 0) {
    return (
      <p className="text-t3 mx-auto mt-2 max-w-[620px] text-center font-mono text-[10px] tracking-wider uppercase">
        A cada erro, a imagem se revela um pouco mais
      </p>
    )
  }

  return (
    <section className="mx-auto mt-2 w-full max-w-[620px]" aria-label="Chutes anteriores">
      <div className="flex flex-col-reverse gap-2">
        {guesses.map((guess, index) => {
          const isCorrect = guess === correctName
          return (
            <div
              key={guess}
              className="bg-surface text-t2 flex items-center justify-between rounded-lg border border-white/6 px-4 py-3 font-mono text-sm"
              style={{ animation: `row-in 220ms cubic-bezier(0.23,1,0.32,1) ${index * 20}ms both` }}
            >
              <span className="truncate">{guess}</span>
              <span className={`text-xs font-bold ${isCorrect ? "text-ok" : "text-wrong"}`}>
                {isCorrect ? "acerto" : "erro"}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
