import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { fetchInsights, fetchTransactions, syncTransactions } from '../api/client'
import { FinancialSummary } from '../components/FinancialSummary/FinancialSummary'
import { InsightRegionalSkeletonFence } from '../components/InsightSkeleton/InsightSkeleton'
import { MoneyFlowSparkRibbon } from '../components/MoneyFlowSparkRibbon/MoneyFlowSparkRibbon'
import { RotatingStatusMarquee } from '../components/RotatingStatusMarquee/RotatingStatusMarquee'
import { SpendingChart } from '../components/SpendingChart/SpendingChart'
import { TopMerchantsBreakdown } from '../components/TopMerchantsBreakdown/TopMerchantsBreakdown'
import { TransactionTable } from '../components/TransactionTable/TransactionTable'
import { useSyncRateLimit } from '../hooks/useSyncRateLimit'
import type { Insight, Transaction } from '../types'
import { coerceFetchedInsightEnvelope } from '../utils/coerceInsightResponse'
import { formatDisplayedCalendarDateMedium } from '../utils/formatters'
import {
  deriveLatestTransactionCalendarDayLexical,
  deriveSpendingBucketsFromLedger,
} from '../utils/spendingFromTransactions'

const syncPhaseMarqueePhrases = [
  'Syncing transactions…',
  'Updating your ledger…',
  'Almost ready…',
] as const

const insightPhaseMarqueePhrases = [
  'Generating insights…',
  'Reviewing your spending…',
  'Finding unusual charges…',
  'Drafting recommendations…',
] as const

const INSIGHT_POLL_INTERVAL_MS = 2500
const INSIGHT_POLL_TIMEOUT_MS = 120_000

const LazyHeavyInsightRenderer = lazy(async () => {
  const moduleSurface = await import('../components/InsightCard/InsightCard.tsx')
  return { default: moduleSurface.InsightCard }
})

export const Dashboard = () => {
  const [transactionsLedger, setTransactionsLedger] = useState<Transaction[]>([])
  const [insightRendered, setInsightRendered] = useState<Insight | null>(null)
  const [ledgerShellBusy, setLedgerShellBusy] = useState(true)
  const [insightsRefreshBusy, setInsightsRefreshBusy] = useState(false)
  const [transactionSyncBusy, setTransactionSyncBusy] = useState(false)
  const [fatalLedgerErrorMessage, setFatalLedgerErrorMessage] = useState<string | null>(null)
  const [insightPipelineErrorMessage, setInsightPipelineErrorMessage] = useState<string | null>(null)

  const { canSync, timeUntilSync, recordSync } = useSyncRateLimit()

  const reloadTransactionalShell = useCallback(async () => {
    try {
      setLedgerShellBusy(true)
      setFatalLedgerErrorMessage(null)
      const downloadedTransactions = await fetchTransactions()
      setTransactionsLedger(downloadedTransactions)
    } catch {
      setFatalLedgerErrorMessage('Could not load your transactions.')
    } finally {
      setLedgerShellBusy(false)
    }
  }, [])

  const pullRemoteInsightArtifact = useCallback(async () => {
    try {
      setInsightsRefreshBusy(true)
      setInsightPipelineErrorMessage(null)
      const insightEnvelope = await fetchInsights()
      setInsightRendered(coerceFetchedInsightEnvelope(insightEnvelope))
    } catch {
      setInsightPipelineErrorMessage('Insights temporarily unavailable.')
    } finally {
      setInsightsRefreshBusy(false)
    }
  }, [])

  useEffect(() => {
    const ledgerHydrationHandle = window.setTimeout(() => {
      void reloadTransactionalShell()
    }, 0)
    return () => window.clearTimeout(ledgerHydrationHandle)
  }, [reloadTransactionalShell])

  useEffect(() => {
    if (ledgerShellBusy) {
      return undefined
    }
    const deferInsightsTimerHandle = window.setTimeout(() => {
      void pullRemoteInsightArtifact()
    }, 0)
    return () => window.clearTimeout(deferInsightsTimerHandle)
  }, [ledgerShellBusy, pullRemoteInsightArtifact])

  const latestTransactionDayLexical = useMemo(
    () => deriveLatestTransactionCalendarDayLexical(transactionsLedger),
    [transactionsLedger]
  )

  const spendingRibbonFromLedgerOnly = useMemo(
    () => deriveSpendingBucketsFromLedger(transactionsLedger).slice(0, 8),
    [transactionsLedger]
  )

  const spendingCategoriesDerivedFromAi = useMemo(() => {
    if (!insightRendered) {
      return []
    }
    return insightRendered.TopCategories.filter(
      (aggregateRow) =>
        !aggregateRow.category.includes('INCOME') &&
        !aggregateRow.category.includes('TRANSFER_IN') &&
        aggregateRow.total_amount > 0
    )
  }, [insightRendered])

  const canonicalSpendingRibbon = spendingCategoriesDerivedFromAi.length
    ? spendingCategoriesDerivedFromAi
    : spendingRibbonFromLedgerOnly

  const insightPollAbortRef = useRef<{ cancelled: boolean } | null>(null)

  useEffect(() => () => {
    if (insightPollAbortRef.current) {
      insightPollAbortRef.current.cancelled = true
    }
  }, [])

  const pollUntilInsightTimestampAdvances = useCallback(
    async (priorInsightTimestamp: string | null) => {
      if (insightPollAbortRef.current) {
        insightPollAbortRef.current.cancelled = true
      }
      const cancellationGuard = { cancelled: false }
      insightPollAbortRef.current = cancellationGuard
      const pollDeadline = Date.now() + INSIGHT_POLL_TIMEOUT_MS

      while (!cancellationGuard.cancelled && Date.now() < pollDeadline) {
        try {
          const insightEnvelope = await fetchInsights()
          const freshInsight = coerceFetchedInsightEnvelope(insightEnvelope)
          if (freshInsight && freshInsight.UpdatedAt !== priorInsightTimestamp) {
            if (!cancellationGuard.cancelled) {
              setInsightRendered(freshInsight)
            }
            return
          }
        } catch {
          if (!cancellationGuard.cancelled) {
            setInsightPipelineErrorMessage('Insights temporarily unavailable.')
          }
          return
        }
        await new Promise((resolve) => window.setTimeout(resolve, INSIGHT_POLL_INTERVAL_MS))
      }
    },
    []
  )

  const handleUpdateDataPulse = async () => {
    const priorInsightTimestampSnapshot = insightRendered?.UpdatedAt ?? null
    setTransactionSyncBusy(true)
    setFatalLedgerErrorMessage(null)
    try {
      await syncTransactions()
      recordSync()
      await reloadTransactionalShell()
    } catch (syncFailure) {
      const statusCode =
        typeof syncFailure === 'object' &&
        syncFailure !== null &&
        'response' in syncFailure &&
        typeof (syncFailure as { response?: { status?: number } }).response?.status === 'number'
          ? (syncFailure as { response: { status: number } }).response.status
          : null
      setFatalLedgerErrorMessage(
        statusCode === 429
          ? 'Sync cooldown is active. You can refresh about once per hour.'
          : 'Update failed, try reconnecting via Connect bank.'
      )
      setTransactionSyncBusy(false)
      return
    }
    setTransactionSyncBusy(false)

    setInsightsRefreshBusy(true)
    setInsightPipelineErrorMessage(null)
    await pollUntilInsightTimestampAdvances(priorInsightTimestampSnapshot)
    setInsightsRefreshBusy(false)
  }

  const anySyncPulseActive = transactionSyncBusy || insightsRefreshBusy
  const liveMarqueePhrases = transactionSyncBusy
    ? syncPhaseMarqueePhrases
    : insightPhaseMarqueePhrases

  if (ledgerShellBusy && transactionsLedger.length === 0) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-slate-50 dark:bg-gray-950 flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <span className="inline-flex w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 tracking-tight">Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  const asOfWatermarkExpression = latestTransactionDayLexical
    ? formatDisplayedCalendarDateMedium(`${latestTransactionDayLexical}T00:00:00Z`)
    : 'today'

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-50 dark:bg-gray-950 px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-10">
        <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-5 md:gap-6">
          <div>
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] text-gray-400 dark:text-gray-500 mb-2 sm:mb-3">
              Dashboard
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-semibold tracking-tighter text-gray-950 dark:text-white">
              Your spending overview
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 sm:mt-3">
              As of{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">{asOfWatermarkExpression}</span>
            </p>
          </div>
          <div className="flex flex-col items-stretch md:items-end gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => void handleUpdateDataPulse()}
              disabled={!canSync || anySyncPulseActive}
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-700 to-purple-700 text-white text-sm font-semibold shadow-brand-950/35 shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-colors w-full md:w-auto md:min-w-[16rem]"
            >
              {anySyncPulseActive ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  <RotatingStatusMarquee phrases={liveMarqueePhrases} className="text-white/95 text-sm" />
                </>
              ) : !canSync ? (
                `Next refresh window ${timeUntilSync}`
              ) : (
                'Update data'
              )}
            </button>
            <span className="text-xs text-gray-400 dark:text-gray-600 text-center md:text-right">
              {anySyncPulseActive
                ? 'Pulling the latest transactions and refreshing insights…'
                : 'You can refresh about once per hour.'}
            </span>
          </div>
        </header>

        {(fatalLedgerErrorMessage || insightPipelineErrorMessage) && (
          <div className="space-y-3">
            {fatalLedgerErrorMessage && (
              <div className="rounded-3xl border border-red-300/70 dark:border-red-900/70 bg-white/90 dark:bg-red-950/30 px-5 py-4 text-red-900 dark:text-red-200 text-sm flex justify-between gap-4">
                <span>{fatalLedgerErrorMessage}</span>
                <button
                  type="button"
                  onClick={() => setFatalLedgerErrorMessage(null)}
                  className="font-semibold"
                >
                  Dismiss
                </button>
              </div>
            )}
            {insightPipelineErrorMessage && (
              <div className="rounded-3xl border border-amber-300/70 dark:border-amber-800/80 bg-white/95 dark:bg-amber-950/30 px-5 py-4 text-amber-950 dark:text-amber-100 text-sm flex justify-between gap-4">
                <span>{insightPipelineErrorMessage}</span>
                <button
                  type="button"
                  onClick={() => void pullRemoteInsightArtifact()}
                  className="font-semibold text-amber-800 dark:text-amber-200"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}

        <FinancialSummary introductoryCaptionRibbon="Summary" transactions={transactionsLedger} />

        {transactionsLedger.length === 0 ? (
          <section className="relative overflow-hidden rounded-[2rem] border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur px-8 py-14 sm:px-14">
            <div aria-hidden className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-brand-500/30 via-purple-500/25 to-transparent blur-3xl" />
            <div aria-hidden className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-gradient-to-tr from-brand-600/20 via-brand-400/15 to-transparent blur-3xl" />
            <div className="relative max-w-2xl mx-auto text-center space-y-6">
              <span
                aria-hidden
                className="inline-grid place-items-center w-14 h-14 rounded-2xl text-white bg-gradient-to-br from-brand-500 via-brand-700 to-purple-700 shadow-lg shadow-brand-700/30 ring-1 ring-white/15"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 17l5-5 4 4 8-8" />
                  <path d="M14 8h6v6" />
                </svg>
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-brand-700 dark:text-brand-300 mb-3">
                  Get started
                </p>
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-950 dark:text-white">
                  Connect a bank to see your dashboard
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 max-w-xl mx-auto">
                  Link an account to populate your summary, spending charts, and AI insights.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/connect"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-700 to-purple-700 text-white text-sm font-semibold shadow-xl shadow-brand-700/30 hover:brightness-110 transition"
                >
                  Connect bank
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <div className="grid gap-6 sm:gap-10 lg:grid-cols-[minmax(0,1.06fr)_minmax(320px,0.94fr)] items-start">
            <div className="space-y-6 sm:space-y-10">
              {canonicalSpendingRibbon.length > 0 && (
                <div className="space-y-6">
                  <SpendingChart categories={canonicalSpendingRibbon.slice(0, 8)} />
                  <TopMerchantsBreakdown transactions={transactionsLedger} />
                  <MoneyFlowSparkRibbon transactions={transactionsLedger} />
                </div>
              )}
              <section>
                <h2 className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-6">Recent transactions</h2>
                <TransactionTable transactions={transactionsLedger} />
              </section>
            </div>

            <section
              aria-live="polite"
              className="lg:sticky lg:top-[96px]"
            >
              {!insightRendered && insightsRefreshBusy && <InsightRegionalSkeletonFence />}

              {!insightRendered && !insightsRefreshBusy && (
                <div className="rounded-[1.7rem] border border-dashed border-gray-300 dark:border-gray-800 p-10 text-center text-gray-500 dark:text-gray-400 bg-white/85 dark:bg-gray-950/60">
                  No insights yet. Link a bank and tap{' '}
                  <strong className="text-gray-950 dark:text-gray-50">Update data</strong> to
                  generate your first summary.
                </div>
              )}

              {insightRendered && (
                <div className="relative">
                  {insightsRefreshBusy && (
                    <div className="absolute inset-x-0 -top-3 z-20 flex justify-center pointer-events-none">
                      <span className="px-6 py-1 rounded-full text-[11px] font-semibold tracking-[0.18em] uppercase bg-brand-900/90 text-white shadow-lg min-w-[16rem] text-center">
                        <RotatingStatusMarquee phrases={insightPhaseMarqueePhrases} className="text-white/95" />
                      </span>
                    </div>
                  )}
                  <div
                    className={`rounded-[2rem] border border-transparent transition-opacity duration-500 ${
                      insightsRefreshBusy ? 'opacity-80' : 'opacity-100'
                    }`}
                  >
                    <Suspense fallback={<InsightRegionalSkeletonFence supportingStatusLabel="Loading insights…" />}>
                      <LazyHeavyInsightRenderer insight={insightRendered} />
                    </Suspense>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
