import { lazy, Suspense } from 'react'

import type { Insight, Transaction } from '../../types'
import { deriveSpendingBucketsFromLedger } from '../../utils/spendingFromTransactions'
import { FinancialSummary } from '../FinancialSummary/FinancialSummary'
import { MoneyFlowSparkRibbon } from '../MoneyFlowSparkRibbon/MoneyFlowSparkRibbon'
import { SpendingChart } from '../SpendingChart/SpendingChart'
import { TopMerchantsBreakdown } from '../TopMerchantsBreakdown/TopMerchantsBreakdown'

const DeferredMarketingInsightPoster = lazy(async () => {
  const modulePoster = await import('../InsightCard/InsightCard.tsx')
  return { default: modulePoster.InsightCard }
})

interface PreviewPaneProperties {
  previewTransactions: Transaction[]
  previewInsightEnvelope: Insight
}

export const LandingProductPreviewRibbon = ({
  previewTransactions,
  previewInsightEnvelope,
}: PreviewPaneProperties) => {
  const previewSpendingRibbon = deriveSpendingBucketsFromLedger(previewTransactions).slice(0, 6)

  return (
    <div className="space-y-10">
      <div className="surface-card p-8 shadow-[0_20px_60px_-15px_rgb(79_70_229_/_0.12)]">
        <FinancialSummary
          introductoryCaptionRibbon="Forecasted KPI tiles"
          transactions={previewTransactions}
        />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1.08fr_minmax(0,0.92fr)] gap-10 items-start">
        <div className="space-y-6 self-start">
          {previewSpendingRibbon.length > 0 && (
            <SpendingChart categories={previewSpendingRibbon} />
          )}
          <TopMerchantsBreakdown transactions={previewTransactions} />
          <MoneyFlowSparkRibbon transactions={previewTransactions} />
        </div>
        <Suspense fallback={<div className="min-h-[360px] rounded-[1.7rem] border border-dashed border-gray-300 dark:border-gray-700 animate-pulse" />}>
          <DeferredMarketingInsightPoster insight={previewInsightEnvelope} />
        </Suspense>
      </div>
    </div>
  )
}
