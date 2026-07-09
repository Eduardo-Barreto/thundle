import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import robotsData from "@/config/robots.json" with { type: "json" }
import { fetchBracket, fetchCategoryRobots, type CategoryRobot } from "@/lib/bracket-api"
import {
  buildBracketGraph,
  computeWindow,
  propagatePicks,
  scorePicks,
  type BracketGraph,
  type BracketWindow,
} from "@/lib/bracket-logic"
import { getDailyBracket, type BracketManifestEntry } from "@/lib/daily-bracket"
import { getPuzzleNumber, getTodayStr } from "@/lib/daily-robot"
import { loadBracketGame, recordBracketGameEnd, saveBracketGame } from "@/lib/storage"
import type { BracketGameState, BracketResult, BracketTrack, Robot } from "@/types"

const thundleRobots = robotsData as Robot[]

type RemoteState =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready"
      graph: BracketGraph
      window: BracketWindow
      apiRobots: CategoryRobot[]
    }

type UseBracketGameOptions = {
  entryOverride?: BracketManifestEntry
  disablePersistence?: boolean
}

function picksToRecord(picks: ReadonlyMap<number, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [position, robot] of picks) out[String(position)] = robot
  return out
}

function picksFromRecord(record: Record<string, string>): Map<number, string> {
  const out = new Map<number, string>()
  for (const [position, robot] of Object.entries(record)) out.set(Number(position), robot)
  return out
}

export function useBracketGame(
  dateStr: string | undefined,
  track: BracketTrack,
  options: UseBracketGameOptions = {},
) {
  const date = dateStr ?? getTodayStr()
  const puzzleNumber = getPuzzleNumber(date)
  const disablePersistence = Boolean(options.disablePersistence)
  const entry = useMemo(
    () => options.entryOverride ?? getDailyBracket(date, track),
    [date, options.entryOverride, track],
  )

  const [remote, setRemote] = useState<RemoteState>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)
  const [picks, setPicks] = useState<Map<number, string>>(() => {
    const saved = disablePersistence ? undefined : loadBracketGame(track, date)
    return saved ? picksFromRecord(saved.picks) : new Map()
  })
  const [result, setResult] = useState<BracketResult | undefined>(() =>
    disablePersistence ? undefined : loadBracketGame(track, date)?.result,
  )
  const confirmed = result !== undefined

  useEffect(() => {
    let cancelled = false
    setRemote({ status: "loading" })
    Promise.all([
      fetchBracket(entry.eventSlug, entry.categoryRef),
      fetchCategoryRobots(entry.eventSlug, entry.categoryRef).catch(() => []),
    ])
      .then(([bracket, apiRobots]) => {
        if (cancelled) return
        const graph = buildBracketGraph(bracket.matches)
        setRemote({ status: "ready", graph, window: computeWindow(graph), apiRobots })
      })
      .catch(() => {
        if (cancelled) return
        setRemote({ status: "error" })
      })
    return () => {
      cancelled = true
    }
    // Chaveado por valor (slug/ref), não pela identidade do objeto entry, para
    // que um caller com options instáveis não dispare refetch em loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.eventSlug, entry.categoryRef, attempt])

  const propagation = useMemo(
    () => (remote.status === "ready" ? propagatePicks(remote.window, picks) : undefined),
    [remote, picks],
  )

  const persist = useCallback(
    (nextPicks: Map<number, string>, nextResult?: BracketResult) => {
      if (disablePersistence) return
      const state: BracketGameState = {
        picks: picksToRecord(nextPicks),
        confirmed: nextResult !== undefined,
        ...(nextResult ? { result: nextResult } : {}),
      }
      saveBracketGame(track, date, state)
    },
    [date, disablePersistence, track],
  )

  const setPick = useCallback(
    (position: number, robotName: string) => {
      if (confirmed || remote.status !== "ready") return
      const next = new Map(picks)
      next.set(position, robotName)
      // Um pick alterado pode invalidar palpites downstream; a propagação diz
      // quais ficaram órfãos e eles saem do estado para o jogador refazer.
      const { orphanedPicks } = propagatePicks(remote.window, next)
      for (const orphan of orphanedPicks) next.delete(orphan)
      setPicks(next)
      persist(next)
    },
    [confirmed, persist, picks, remote],
  )

  const clearPicks = useCallback(() => {
    if (confirmed) return
    setPicks(new Map())
    persist(new Map())
  }, [confirmed, persist])

  // Ref, não estado: dois cliques em Confirmar no mesmo frame veriam ambos
  // confirmed=false e registrariam as estatísticas duas vezes.
  const confirmingRef = useRef(false)

  const confirm = useCallback(() => {
    if (confirmingRef.current || confirmed || remote.status !== "ready" || !propagation) return
    const pending = propagation.slots.filter((s) => s.active && !picks.has(s.position))
    if (pending.length > 0) return
    confirmingRef.current = true
    const score = scorePicks(remote.window, picks, remote.graph)
    const nextResult: BracketResult = {
      won: score.championCorrect,
      correctCount: score.correctCount,
      total: score.total,
    }
    setResult(nextResult)
    persist(picks, nextResult)
    if (!disablePersistence) {
      recordBracketGameEnd(track, date, {
        won: nextResult.won,
        guessCount: nextResult.correctCount,
      })
    }
  }, [confirmed, date, disablePersistence, persist, picks, propagation, remote, track])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  const pendingCount = propagation
    ? propagation.slots.filter((s) => s.active && !picks.has(s.position)).length
    : 0

  return {
    date,
    puzzleNumber,
    entry,
    remote,
    thundleRobots,
    picks,
    propagation,
    pendingCount,
    canConfirm: remote.status === "ready" && !confirmed && pendingCount === 0,
    confirmed,
    result,
    setPick,
    clearPicks,
    confirm,
    retry,
  }
}
