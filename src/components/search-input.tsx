import { useEffect, useRef } from "react"

import { useSearch } from "@/hooks/use-search"
import type { Robot } from "@/types"

type SearchInputProps = {
  robots: Robot[]
  guessedNames: Set<string>
  disabled: boolean
  onSelect: (name: string) => void
}

export function SearchInput({ robots, guessedNames, disabled, onSelect }: SearchInputProps) {
  const { query, results, activeIndex, isOpen, updateQuery, handleKeyDown, close, setActiveIndex } =
    useSearch(robots, guessedNames)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close()
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [close])

  return (
    <div
      ref={containerRef}
      className="relative mx-auto mb-8 w-full max-w-[540px] md:mb-10 md:max-w-[600px]"
    >
      <input
        type="text"
        value={query}
        onChange={(e) => updateQuery(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, onSelect)}
        onFocus={() => query.length >= 2 && updateQuery(query)}
        disabled={disabled}
        placeholder="Chute um robô…"
        autoComplete="off"
        spellCheck={false}
        aria-label="Buscar robô"
        className="bg-surface text-t1 placeholder:text-t3 focus:border-thunder-yellow/20 h-12 w-full rounded-lg border border-white/6 pr-5 pl-12 font-sans text-base font-medium transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none focus:shadow-[0_0_0_3px_rgba(255,229,0,0.04)] disabled:opacity-40 md:h-16 md:pl-14 md:text-lg"
      />
      <svg
        aria-hidden="true"
        className="text-t3 pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>

      {isOpen && results.length > 0 && (
        <div
          role="listbox"
          className="bg-elevated absolute top-[calc(100%+4px)] right-0 left-0 z-50 origin-top overflow-hidden rounded-lg border border-white/6 shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
          style={{ animation: "dd-in 150ms cubic-bezier(0.23,1,0.32,1) forwards" }}
        >
          {results.map((r, i) => {
            const isUsed = guessedNames.has(r.robot.name)
            return (
              <div
                key={r.robot.name}
                role="option"
                tabIndex={-1}
                aria-selected={i === activeIndex}
                aria-disabled={isUsed}
                onMouseEnter={() => setActiveIndex(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isUsed) {
                    onSelect(r.robot.name)
                    updateQuery("")
                    close()
                  }
                }}
                onClick={() => {
                  if (!isUsed) {
                    onSelect(r.robot.name)
                    updateQuery("")
                    close()
                  }
                }}
                className={`text-t2 flex cursor-pointer items-center gap-2.5 border-b border-white/3 px-4 py-2.5 font-mono text-sm font-medium transition-colors duration-100 last:border-b-0 ${
                  i === activeIndex ? "bg-thunder-yellow/4 text-t1" : ""
                } ${isUsed ? "pointer-events-none line-through opacity-20" : ""}`}
              >
                <span
                  className={`text-t3 font-mono text-xs ${i === activeIndex ? "opacity-100" : "opacity-0"}`}
                >
                  &gt;
                </span>
                <span>
                  {r.segments.map((seg, j) => {
                    const key = `${j}:${seg.text}`
                    return seg.match ? (
                      <mark key={key}>{seg.text}</mark>
                    ) : (
                      <span key={key}>{seg.text}</span>
                    )
                  })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
