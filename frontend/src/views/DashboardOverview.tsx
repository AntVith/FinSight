import { lazy, Suspense, useMemo } from 'react'
import { Link, useOutletContext } from 'react-router-dom'

import { FinancialSummary } from '../components/FinancialSummary/FinancialSummary'
import { InsightRegionalSkeletonFence } from '../components/InsightSkeleton/InsightSkeleton'
import { MoneyFlowSparkRibbon } from '../components/MoneyFlowSparkRibbon/MoneyFlowSparkRibbon'
import { RotatingStatusMarquee } from '../components/RotatingStatusMarquee/RotatingStatusMarquee'
import { SpendingChart } from '../components/SpendingChart/SpendingChart'
import { TopMerchantsBreakdown } from '../components/TopMerchantsBreakdown/TopMerchantsBreakdown'
import type { DashboardOutletContext } from './Dashboard'
import { deriveSpendingBucketsFromLedger } from '../utils/spendingFromTransactions'

const insightPhaseMarqueePhrases = [
  'Reviewing your spending…',
  'Finding unusual charges…',
  'Drafting recommendations…',
] as const

const LazyHeavyInsightRenderer = lazy(async () => {
  const moduleSurface = await import('../components/InsightCard/InsightCard.tsx')
  return { default: moduleSurface.InsightCard }
})

const formatSyncTimestamp = (date: Date): string => {
  const datePart = date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  const timePart = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${datePart} at ${timePart}`
}

export const DashboardOverview = () => {
  const { transactionsLedger, accountsLedger, insightRendered, insightsRefreshBusy, lastSyncedAt } =
    useOutletContext<DashboardOutletContext>()

  const spendingRibbonFromLedgerOnly = useMemo(
    () => deriveSpendingBucketsFromLedger(transactionsLedger).slice(0, 8),
    [transactionsLedger]
  )

  const spendingCategoriesDerivedFromAi = useMemo(() => {
    if (!insightRendered) return []
    return insightRendered.TopCategories.filter(
      (row) =>
        !row.category.includes('INCOME') &&
        !row.category.includes('TRANSFER_IN') &&
        row.total_amount > 0
    )
  }, [insightRendered])

  const canonicalSpendingRibbon = spendingCategoriesDerivedFromAi.length
    ? spendingCategoriesDerivedFromAi
    : spendingRibbonFromLedgerOnly

  if (transactionsLedger.length === 0) {
    return (
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
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {lastSyncedAt && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          As of{' '}
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            {formatSyncTimestamp(lastSyncedAt)}
          </span>
        </p>
      )}

      <FinancialSummary
        introductoryCaptionRibbon="Summary"
        transactions={transactionsLedger}
        accounts={accountsLedger}
      />

      {canonicalSpendingRibbon.length > 0 && (
        <div className="grid gap-6 sm:gap-10 lg:grid-cols-[minmax(0,1.06fr)_minmax(320px,0.94fr)] items-start">
          <div className="space-y-6 sm:space-y-8">
            <SpendingChart categories={canonicalSpendingRibbon.slice(0, 8)} />
            <TopMerchantsBreakdown transactions={transactionsLedger} />
            <MoneyFlowSparkRibbon transactions={transactionsLedger} />
          </div>

          <section aria-live="polite" className="lg:sticky lg:top-[96px]">
            {!insightRendered && insightsRefreshBusy && <InsightRegionalSkeletonFence />}

            {!insightRendered && !insightsRefreshBusy && (
              <div className="rounded-[1.7rem] border border-dashed border-gray-300 dark:border-gray-800 p-10 text-center text-gray-500 dark:text-gray-400 bg-white/85 dark:bg-gray-950/60">
                No insights yet. Tap{' '}
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
  )
}
