import { useMemo } from 'react'
import type { Account, Transaction } from '../../types'
import { formatCurrency } from '../../utils/formatters'

interface Props {
  transactions: Transaction[]
  accounts?: Account[]
  introductoryCaptionRibbon?: string
}

interface StatCardProps {
  label: string
  value: string
  valueClassName: string
  dimmed?: boolean
}

const StatCard = ({ label, value, valueClassName, dimmed }: StatCardProps) => (
  <div
    className={[
      'group relative overflow-hidden rounded-[1.15rem] border',
      // Mobile: horizontal (label left, value right). sm+: vertical stacked.
      'flex items-center justify-between gap-4 px-5 py-4',
      'sm:flex-col sm:items-start sm:justify-start sm:p-5',
      dimmed
        ? 'bg-white/60 dark:bg-gray-950/60 border-gray-100/80 dark:border-gray-800/60'
        : 'bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 shadow-[0_2px_8px_-2px_rgb(79_70_229_/_0.08)]',
    ].join(' ')}
  >
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-5 top-0 h-px opacity-70 bg-gradient-to-r from-transparent via-brand-600/55 to-transparent"
    />
    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400 shrink-0">
      {label}
    </p>
    <p className={`text-xl sm:text-2xl font-semibold tabular-nums tracking-tight sm:mt-2 ${valueClassName}`}>
      {value}
    </p>
  </div>
)

export const FinancialSummary = ({
  transactions,
  accounts = [],
  introductoryCaptionRibbon,
}: Props) => {
  const moneyIn = transactions
    .filter((t) => t.Amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.Amount), 0)

  const moneyOut = transactions
    .filter((t) => t.Amount > 0)
    .reduce((sum, t) => sum + t.Amount, 0)

  const net = moneyIn - moneyOut
  const transactionCount = transactions.length

  const { cashAvailable, creditOwed } = useMemo(() => {
    let cash = 0
    let credit = 0
    for (const account of accounts) {
      if (account.type === 'depository') {
        cash += account.balance_available ?? account.balance_current ?? 0
      } else if (account.type === 'credit') {
        credit += account.balance_current ?? 0
      }
    }
    return { cashAvailable: cash, creditOwed: credit }
  }, [accounts])

  const hasAccountData = accounts.length > 0

  return (
    <div className="space-y-4">
      {introductoryCaptionRibbon && (
        <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-semibold">
          {introductoryCaptionRibbon}
        </p>
      )}

      {hasAccountData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            label="Cash available"
            value={formatCurrency(cashAvailable)}
            valueClassName="text-emerald-600"
          />
          <StatCard
            label="Credit owed"
            value={formatCurrency(creditOwed)}
            valueClassName={creditOwed > 0 ? 'text-red-500' : 'text-gray-950 dark:text-gray-50'}
          />
          <StatCard
            label="Net position"
            value={formatCurrency(cashAvailable - creditOwed)}
            valueClassName={cashAvailable - creditOwed >= 0 ? 'text-emerald-600' : 'text-red-500'}
          />
          <StatCard
            label="Money in"
            value={formatCurrency(moneyIn)}
            valueClassName="text-emerald-600"
            dimmed
          />
          <StatCard
            label="Money out"
            value={formatCurrency(moneyOut)}
            valueClassName="text-red-500"
            dimmed
          />
          <StatCard
            label="Transactions"
            value={String(transactionCount)}
            valueClassName="text-gray-950 dark:text-gray-50"
            dimmed
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Total Money In"
            value={formatCurrency(moneyIn)}
            valueClassName="text-emerald-600"
          />
          <StatCard
            label="Total Money Out"
            value={formatCurrency(moneyOut)}
            valueClassName="text-red-500"
          />
          <StatCard
            label="Net"
            value={formatCurrency(net)}
            valueClassName={net >= 0 ? 'text-emerald-600' : 'text-red-500'}
          />
          <StatCard
            label="Transactions"
            value={String(transactionCount)}
            valueClassName="text-gray-950 dark:text-gray-50"
          />
        </div>
      )}
    </div>
  )
}
