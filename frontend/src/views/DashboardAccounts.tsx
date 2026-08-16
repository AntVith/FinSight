import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'

import { AccountCard } from '../components/AccountCard/AccountCard'
import type { Account } from '../types'
import type { DashboardOutletContext } from './Dashboard'

const TYPE_LABELS: Record<string, string> = {
  depository: 'Depository',
  credit: 'Credit',
  investment: 'Investment',
  loan: 'Loan',
  other: 'Other',
}

const groupByInstitution = (accounts: Account[]): Map<string, Account[]> => {
  const groups = new Map<string, Account[]>()
  for (const account of accounts) {
    const existing = groups.get(account.institution_name) ?? []
    existing.push(account)
    groups.set(account.institution_name, existing)
  }
  return groups
}

export const DashboardAccounts = () => {
  const { accountsLedger } = useOutletContext<DashboardOutletContext>()

  const allTypes = useMemo(
    () => new Set(accountsLedger.map((a) => a.type)),
    [accountsLedger]
  )

  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set())

  const toggleType = (type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  // Empty activeTypes = no filter active (show all)
  const visibleAccounts = useMemo(
    () =>
      activeTypes.size === 0
        ? accountsLedger
        : accountsLedger.filter((a) => activeTypes.has(a.type)),
    [accountsLedger, activeTypes]
  )

  const grouped = useMemo(() => groupByInstitution(visibleAccounts), [visibleAccounts])

  const showFilter = allTypes.size > 1

  if (accountsLedger.length === 0) {
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
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-brand-700 dark:text-brand-300 mb-3">
              No accounts yet
            </p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-950 dark:text-white">
              Link a bank to see your accounts
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 max-w-xl mx-auto">
              Connect an institution to view balances and account details here.
            </p>
          </div>
          <Link
            to="/connect"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-700 to-purple-700 text-white text-sm font-semibold shadow-xl shadow-brand-700/30 hover:brightness-110 transition"
          >
            Connect bank
          </Link>
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top actions row: filter pills + link institution */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {showFilter ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by account type">
            {[...allTypes].map((type) => {
              const isActive = activeTypes.has(type)
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={[
                    'px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
                    isActive
                      ? 'bg-brand-600 border-brand-600 text-white'
                      : 'bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-brand-400 hover:text-brand-700 dark:hover:text-brand-300',
                  ].join(' ')}
                >
                  {TYPE_LABELS[type] ?? type}
                </button>
              )
            })}
            {activeTypes.size > 0 && (
              <button
                type="button"
                onClick={() => setActiveTypes(new Set())}
                className="px-3 py-1 rounded-full text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        ) : (
          <div />
        )}

        <Link
          to="/connect"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 dark:text-brand-300 hover:text-brand-900 dark:hover:text-brand-100 transition-colors shrink-0"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v8M8 12h8" />
          </svg>
          Link institution
        </Link>
      </div>

      {/* Account groups */}
      <div className="space-y-8">
        {[...grouped.entries()].map(([institutionName, accounts]) => (
          <section key={institutionName} className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
                {institutionName}
              </h2>
              <span className="text-xs text-gray-400 dark:text-gray-600">
                {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
              </span>
            </div>
            <div className="space-y-3">
              {accounts.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          </section>
        ))}

        {visibleAccounts.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
            No accounts match the selected filters.
          </p>
        )}
      </div>
    </div>
  )
}
