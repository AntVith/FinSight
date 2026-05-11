import type { Transaction } from '../../types'
import { formatCurrency } from '../../utils/formatters'

interface Props {
  transactions: Transaction[]
  introductoryCaptionRibbon?: string
}

interface StatCardProps {
  label: string
  value: string
  valueClassName: string
}

const StatCard = ({ label, value, valueClassName }: StatCardProps) => (
  <div className="group relative overflow-hidden bg-white dark:bg-gray-950 rounded-[1.15rem] border border-gray-100 dark:border-gray-800 p-4 sm:p-6 shadow-[0_2px_8px_-2px_rgb(79_70_229_/_0.08)]">
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-4 sm:inset-x-6 top-0 h-px opacity-70 bg-gradient-to-r from-transparent via-brand-600/55 to-transparent"
    />
    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400 mb-2">
      {label}
    </p>
    <p className={`text-xl sm:text-2xl lg:text-3xl font-semibold tabular-nums tracking-tight truncate ${valueClassName}`}>
      {value}
    </p>
  </div>
)

export const FinancialSummary = ({
  transactions,
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

  return (
    <div className="space-y-4">
      {introductoryCaptionRibbon && (
        <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-semibold">
          {introductoryCaptionRibbon}
        </p>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
    </div>
  )
}
