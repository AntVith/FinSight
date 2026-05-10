import type { Transaction } from '../../types'
import { formatCurrency } from '../../utils/formatters'

interface Props {
  transactions: Transaction[]
}

interface StatCardProps {
  label: string
  value: string
  valueClassName: string
}

const StatCard = ({ label, value, valueClassName }: StatCardProps) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
    <p className={`text-2xl font-bold ${valueClassName}`}>{value}</p>
  </div>
)

export const FinancialSummary = ({ transactions }: Props) => {
  const moneyIn = transactions
    .filter((t) => t.Amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.Amount), 0)

  const moneyOut = transactions
    .filter((t) => t.Amount > 0)
    .reduce((sum, t) => sum + t.Amount, 0)

  const net = moneyIn - moneyOut
  const transactionCount = transactions.length

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
        valueClassName="text-gray-900 dark:text-gray-50"
      />
    </div>
  )
}
