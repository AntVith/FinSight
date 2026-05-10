import { useCallback, useEffect, useState } from 'react'
import { fetchInsights, fetchTransactions, syncTransactions } from '../api/client'
import { FinancialSummary } from '../components/FinancialSummary/FinancialSummary'
import { InsightCard } from '../components/InsightCard/InsightCard'
import { SpendingChart } from '../components/SpendingChart/SpendingChart'
import { TransactionTable } from '../components/TransactionTable/TransactionTable'
import { useSyncRateLimit } from '../hooks/useSyncRateLimit'
import type { Insight, Transaction } from '../types'

interface Props {
  isSyncing: boolean
}

export const Dashboard = ({ isSyncing }: Props) => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [insight, setInsight] = useState<Insight | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { canSync, timeUntilSync, recordSync } = useSyncRateLimit()

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [transactionsResponse, insightResponse] = await Promise.all([
        fetchTransactions(),
        fetchInsights(),
      ])
      setTransactions(transactionsResponse)
      if (!insightResponse.status) {
        setInsight(insightResponse as Insight)
      }
    } catch {
      setError('Failed to load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSync = async () => {
    try {
      setSyncing(true)
      setError(null)
      await syncTransactions()
      recordSync()
      await loadData()
    } catch {
      setError('Failed to sync transactions. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  const isAnySyncing = isSyncing || syncing

  const spendingCategories = insight?.TopCategories.filter(
    (cat) =>
      !cat.category.includes('INCOME') &&
      !cat.category.includes('TRANSFER_IN') &&
      cat.total_amount > 0
  ) ?? []

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <span className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-gray-500 dark:text-gray-400">Loading your financial data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Dashboard</h1>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleSync}
              disabled={!canSync || isAnySyncing}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-900 text-white font-medium px-4 py-2 rounded-xl transition-colors text-sm"
            >
              {isAnySyncing ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Syncing...
                </>
              ) : !canSync ? (
                `Next sync in ${timeUntilSync}`
              ) : (
                'Sync Transactions'
              )}
            </button>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Syncs are limited to once per hour
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4">
              ✕
            </button>
          </div>
        )}

        <div className="mb-6">
          <FinancialSummary transactions={transactions} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="flex flex-col gap-6">
            {spendingCategories.length > 0 && (
              <SpendingChart categories={spendingCategories} />
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
                Recent Transactions
              </h2>
              {transactions.length === 0 ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 rounded-xl px-4 py-3 text-sm">
                  No transactions found. Sync your account to load the latest data.
                </div>
              ) : (
                <TransactionTable transactions={transactions} />
              )}
            </div>
          </div>

          {insight && (
            <div className="md:sticky md:top-20">
              <InsightCard insight={insight} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
