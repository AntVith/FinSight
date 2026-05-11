import Slider from 'rc-slider'
import 'rc-slider/assets/index.css'
import { useEffect, useMemo, useState } from 'react'
import type { Transaction } from '../../types'
import { formatCategoryName, formatCurrency, formatDate } from '../../utils/formatters'

interface Props {
  transactions: Transaction[]
}

const PAGE_SIZE = 20

export const TransactionTable = ({ transactions }: Props) => {
  const maxAmount = useMemo(
    () => (transactions.length > 0 ? Math.ceil(Math.max(...transactions.map((t) => Math.abs(t.Amount)))) : 1000),
    [transactions]
  )

  const [filterCategory, setFilterCategory] = useState('')
  const [filterMerchant, setFilterMerchant] = useState('')
  const [filterPending, setFilterPending] = useState<boolean | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountRange, setAmountRange] = useState<[number, number]>([0, maxAmount])
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    const rangeNormalizingHandle = window.setTimeout(() => {
      setAmountRange([0, maxAmount])
    }, 0)
    return () => window.clearTimeout(rangeNormalizingHandle)
  }, [maxAmount])

  const uniqueCategories = useMemo(
    () => [...new Set(transactions.map((t) => t.CategoryPrimary))].sort(),
    [transactions]
  )

  const uniqueMerchants = useMemo(
    () => [...new Set(transactions.map((t) => t.MerchantName).filter((m) => m !== ''))].sort(),
    [transactions]
  )

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterCategory && t.CategoryPrimary !== filterCategory) return false
      if (filterMerchant && t.MerchantName !== filterMerchant) return false
      if (filterPending !== null && t.Pending !== filterPending) return false
      const txDate = t.Date.slice(0, 10)
      if (dateFrom && txDate < dateFrom) return false
      if (dateTo && txDate > dateTo) return false
      const absAmount = Math.abs(t.Amount)
      if (absAmount < amountRange[0] || absAmount > amountRange[1]) return false
      return true
    })
  }, [transactions, filterCategory, filterMerchant, filterPending, dateFrom, dateTo, amountRange])

  useEffect(() => {
    const pagingResetHandle = window.setTimeout(() => {
      setVisibleCount(PAGE_SIZE)
    }, 0)
    return () => window.clearTimeout(pagingResetHandle)
  }, [filterCategory, filterMerchant, filterPending, dateFrom, dateTo, amountRange])

  const hasActiveFilters =
    filterCategory !== '' ||
    filterMerchant !== '' ||
    filterPending !== null ||
    dateFrom !== '' ||
    dateTo !== '' ||
    amountRange[0] !== 0 ||
    amountRange[1] !== maxAmount

  const clearFilters = () => {
    setFilterCategory('')
    setFilterMerchant('')
    setFilterPending(null)
    setDateFrom('')
    setDateTo('')
    setAmountRange([0, maxAmount])
  }

  const visibleTransactions = filtered.slice(0, visibleCount)

  const inputClass =
    'text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-50 rounded-lg px-3 py-2 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full'

  return (
    <div>
      <div className="flex justify-end mb-2 h-6">
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 font-medium transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <select
          className={inputClass}
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {uniqueCategories.map((category) => (
            <option key={category} value={category}>
              {formatCategoryName(category)}
            </option>
          ))}
        </select>

        <select
          className={inputClass}
          value={filterMerchant}
          onChange={(e) => setFilterMerchant(e.target.value)}
        >
          <option value="">All merchants</option>
          {uniqueMerchants.map((merchant) => (
            <option key={merchant} value={merchant}>
              {merchant}
            </option>
          ))}
        </select>

        <select
          className={inputClass}
          value={filterPending === null ? '' : String(filterPending)}
          onChange={(e) =>
            setFilterPending(e.target.value === '' ? null : e.target.value === 'true')
          }
        >
          <option value="">All statuses</option>
          <option value="false">Posted</option>
          <option value="true">Pending</option>
        </select>

        <div className="flex gap-2 col-span-2 md:col-span-2 min-w-0">
          <input
            className={`${inputClass} min-w-0`}
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <input
            className={`${inputClass} min-w-0`}
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-6 px-1">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span>Amount range</span>
          <span>
            {formatCurrency(amountRange[0])} to {formatCurrency(amountRange[1])}
          </span>
        </div>
        <Slider
          range
          min={0}
          max={maxAmount}
          step={1}
          value={amountRange}
          onChange={(value) => setAmountRange(value as [number, number])}
          styles={{
            track: { backgroundColor: '#4f46e5' },
            handle: { borderColor: '#4f46e5' },
          }}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Merchant</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {visibleTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                  No transactions match your filters.
                </td>
              </tr>
            ) : (
              visibleTransactions.map((t, i) => (
                <tr
                  key={t.ID}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50'
                  }`}
                >
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatDate(t.Date)}
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-50">{t.Name}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.MerchantName}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {formatCategoryName(t.CategoryPrimary)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold font-mono tabular-nums ${
                      t.Amount > 0 ? 'text-red-500' : 'text-emerald-600'
                    }`}
                  >
                    {formatCurrency(t.Amount)}
                  </td>
                  <td className="px-4 py-3">
                    {t.Pending ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
                        Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400">
                        Posted
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-3">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} transactions
        </p>
        {visibleCount < filtered.length && (
          <button
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 font-medium transition-colors"
          >
            Show more ▼
          </button>
        )}
      </div>
    </div>
  )
}
