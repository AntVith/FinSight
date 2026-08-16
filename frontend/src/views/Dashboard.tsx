import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { fetchAccounts, fetchInsights, fetchTransactions, syncTransactions } from '../api/client'
import { RotatingStatusMarquee } from '../components/RotatingStatusMarquee/RotatingStatusMarquee'
import { useSyncRateLimit } from '../hooks/useSyncRateLimit'
import type { Account, Insight, Transaction } from '../types'
import { coerceFetchedInsightEnvelope } from '../utils/coerceInsightResponse'

export interface DashboardOutletContext {
  transactionsLedger: Transaction[]
  accountsLedger: Account[]
  insightRendered: Insight | null
  lastSyncedAt: Date | null
  ledgerShellBusy: boolean
  anySyncPulseActive: boolean
  insightsRefreshBusy: boolean
  insightPipelineErrorMessage: string | null
  onRetryInsight: () => Promise<void>
}

const LAST_SYNCED_STORAGE_KEY = 'finsight.last_synced_at'

const readStoredSyncTimestamp = (): Date | null => {
  try {
    const stored = sessionStorage.getItem(LAST_SYNCED_STORAGE_KEY)
    if (!stored) return null
    const parsed = new Date(stored)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  } catch {
    return null
  }
}

const persistSyncTimestamp = (date: Date): void => {
  try {
    sessionStorage.setItem(LAST_SYNCED_STORAGE_KEY, date.toISOString())
  } catch {
    // sessionStorage unavailable; silently ignore
  }
}

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

export const Dashboard = () => {
  const { pathname } = useLocation()
  const pageTitle = pathname.startsWith('/dashboard/transactions')
    ? 'Transactions'
    : pathname.startsWith('/dashboard/accounts')
      ? 'Accounts'
      : 'Overview'

  const [transactionsLedger, setTransactionsLedger] = useState<Transaction[]>([])
  const [accountsLedger, setAccountsLedger] = useState<Account[]>([])
  const [insightRendered, setInsightRendered] = useState<Insight | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(readStoredSyncTimestamp)
  const [ledgerShellBusy, setLedgerShellBusy] = useState(true)
  const [insightsRefreshBusy, setInsightsRefreshBusy] = useState(false)
  const [transactionSyncBusy, setTransactionSyncBusy] = useState(false)
  const [fatalLedgerErrorMessage, setFatalLedgerErrorMessage] = useState<string | null>(null)
  const [insightPipelineErrorMessage, setInsightPipelineErrorMessage] = useState<string | null>(null)

  const { canSync, timeUntilSync, recordSync } = useSyncRateLimit()

  const reloadLedger = useCallback(async () => {
    try {
      setLedgerShellBusy(true)
      setFatalLedgerErrorMessage(null)
      const [txns, accts] = await Promise.all([fetchTransactions(), fetchAccounts()])
      setTransactionsLedger(txns)
      setAccountsLedger(accts)
    } catch {
      setFatalLedgerErrorMessage('Could not load your data.')
    } finally {
      setLedgerShellBusy(false)
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => void reloadLedger(), 0)
    return () => window.clearTimeout(handle)
  }, [reloadLedger])

  const insightPollAbortRef = useRef<{ cancelled: boolean } | null>(null)

  useEffect(
    () => () => {
      if (insightPollAbortRef.current) insightPollAbortRef.current.cancelled = true
    },
    []
  )

  const pullInsight = useCallback(async () => {
    try {
      setInsightsRefreshBusy(true)
      setInsightPipelineErrorMessage(null)
      const envelope = await fetchInsights()
      setInsightRendered(coerceFetchedInsightEnvelope(envelope))
    } catch {
      setInsightPipelineErrorMessage('Insights temporarily unavailable.')
    } finally {
      setInsightsRefreshBusy(false)
    }
  }, [])

  useEffect(() => {
    if (ledgerShellBusy) return undefined
    const handle = window.setTimeout(() => void pullInsight(), 0)
    return () => window.clearTimeout(handle)
  }, [ledgerShellBusy, pullInsight])

  const pollUntilInsightAdvances = useCallback(async (priorTimestamp: string | null) => {
    if (insightPollAbortRef.current) insightPollAbortRef.current.cancelled = true
    const guard = { cancelled: false }
    insightPollAbortRef.current = guard
    const deadline = Date.now() + INSIGHT_POLL_TIMEOUT_MS

    while (!guard.cancelled && Date.now() < deadline) {
      try {
        const envelope = await fetchInsights()
        const fresh = coerceFetchedInsightEnvelope(envelope)
        if (fresh && fresh.UpdatedAt !== priorTimestamp) {
          if (!guard.cancelled) setInsightRendered(fresh)
          return
        }
      } catch {
        if (!guard.cancelled) setInsightPipelineErrorMessage('Insights temporarily unavailable.')
        return
      }
      await new Promise((resolve) => window.setTimeout(resolve, INSIGHT_POLL_INTERVAL_MS))
    }
  }, [])

  const handleUpdateData = async () => {
    const priorTimestamp = insightRendered?.UpdatedAt ?? null
    setTransactionSyncBusy(true)
    setFatalLedgerErrorMessage(null)
    try {
      await syncTransactions()
      recordSync()
      await reloadLedger()
      const syncedAt = new Date()
      persistSyncTimestamp(syncedAt)
      setLastSyncedAt(syncedAt)
    } catch (err) {
      const status =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { status?: number } }).response?.status === 'number'
          ? (err as { response: { status: number } }).response.status
          : null
      setFatalLedgerErrorMessage(
        status === 429
          ? 'Sync cooldown is active. You can refresh about once per hour.'
          : 'Update failed, try reconnecting via Connect bank.'
      )
      setTransactionSyncBusy(false)
      return
    }
    setTransactionSyncBusy(false)
    setInsightsRefreshBusy(true)
    setInsightPipelineErrorMessage(null)
    await pollUntilInsightAdvances(priorTimestamp)
    setInsightsRefreshBusy(false)
  }

  const anySyncPulseActive = transactionSyncBusy || insightsRefreshBusy
  const liveMarqueePhrases = transactionSyncBusy ? syncPhaseMarqueePhrases : insightPhaseMarqueePhrases

  if (ledgerShellBusy && transactionsLedger.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <span className="inline-flex w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 tracking-tight">Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  const outletContext: DashboardOutletContext = {
    transactionsLedger,
    accountsLedger,
    insightRendered,
    lastSyncedAt,
    ledgerShellBusy,
    anySyncPulseActive,
    insightsRefreshBusy,
    insightPipelineErrorMessage,
    onRetryInsight: pullInsight,
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-5 md:gap-6">
          <div>
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] text-gray-400 dark:text-gray-500 mb-2 sm:mb-3">
              Dashboard
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-semibold tracking-tighter text-gray-950 dark:text-white">
              {pageTitle}
            </h1>
          </div>
          <div className="flex flex-col items-stretch md:items-end gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => void handleUpdateData()}
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
                  onClick={() => void pullInsight()}
                  className="font-semibold text-amber-800 dark:text-amber-200"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}

        <Outlet context={outletContext} />
      </div>
    </div>
    </>
  )
}
