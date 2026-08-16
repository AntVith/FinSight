import type { Account } from '../../types'
import { formatCurrency } from '../../utils/formatters'

interface Props {
  account: Account
}

const subtypeLabel = (type: string, subtype: string): string => {
  if (subtype === 'checking') return 'Checking'
  if (subtype === 'savings') return 'Savings'
  if (subtype === 'credit card') return 'Credit card'
  if (type === 'investment') return 'Investment'
  if (type === 'loan') return 'Loan'
  if (subtype) return subtype.charAt(0).toUpperCase() + subtype.slice(1)
  return type.charAt(0).toUpperCase() + type.slice(1)
}

const badgeColors: Record<string, string> = {
  depository:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  credit:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  investment:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  loan:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
}

const balanceDisplay = (account: Account): { label: string; amount: number | null } => {
  if (account.type === 'credit') {
    return { label: 'Current balance', amount: account.balance_current }
  }
  return { label: 'Available', amount: account.balance_available ?? account.balance_current }
}

export const AccountCard = ({ account }: Props) => {
  const badge = subtypeLabel(account.type, account.subtype)
  const badgeClass = badgeColors[account.type] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  const { label, amount } = balanceDisplay(account)

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur px-5 py-4">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {account.name}
          </p>
          {account.mask && (
            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
              ••••{account.mask}
            </span>
          )}
        </div>
        {account.official_name && account.official_name !== account.name && (
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{account.official_name}</p>
        )}
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}
        >
          {badge}
        </span>
      </div>

      <div className="text-right shrink-0">
        <p className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
          {amount !== null ? formatCurrency(Math.abs(amount)) : '--'}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      </div>
    </div>
  )
}
