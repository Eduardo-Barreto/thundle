import fuzzysort from "fuzzysort"
import { useState, useMemo, useCallback } from "react"

import type { Robot } from "@/types"

export type HighlightSegment = { text: string; match: boolean }

type SearchResult = {
  robot: Robot
  segments: HighlightSegment[]
}

function buildSegments(target: string, indexes: readonly number[]): HighlightSegment[] {
  if (indexes.length === 0) return [{ text: target, match: false }]
  const matchSet = new Set(indexes)
  const segments: HighlightSegment[] = []
  let buffer = ""
  let bufferMatch = matchSet.has(0)
  for (let i = 0; i < target.length; i++) {
    const isMatch = matchSet.has(i)
    if (isMatch !== bufferMatch && buffer) {
      segments.push({ text: buffer, match: bufferMatch })
      buffer = ""
    }
    buffer += target[i]
    bufferMatch = isMatch
  }
  if (buffer) segments.push({ text: buffer, match: bufferMatch })
  return segments
}

export function useSearch(robots: Robot[], guessedNames: Set<string>) {
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const results: SearchResult[] = useMemo(() => {
    if (query.length < 2) return []
    const matches = fuzzysort.go(query, robots, {
      key: "name",
      limit: 10,
    })
    return matches.map((m) => ({
      robot: m.obj,
      segments: buildSegments(m.obj.name, m.indexes),
    }))
  }, [query, robots])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, onSelect: (name: string) => void) => {
      if (!isOpen || results.length === 0) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === "Enter") {
        e.preventDefault()
        const result = results[activeIndex]
        if (result && !guessedNames.has(result.robot.name)) {
          onSelect(result.robot.name)
          setQuery("")
          setIsOpen(false)
        }
      } else if (e.key === "Escape") {
        setIsOpen(false)
      }
    },
    [isOpen, results, activeIndex, guessedNames],
  )

  const updateQuery = useCallback((value: string) => {
    setQuery(value)
    setActiveIndex(0)
    setIsOpen(value.length >= 2)
  }, [])

  const close = useCallback(() => setIsOpen(false), [])

  return {
    query,
    results,
    activeIndex,
    isOpen,
    updateQuery,
    handleKeyDown,
    close,
    setActiveIndex,
  }
}
