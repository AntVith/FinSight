import { useOutletContext } from 'react-router-dom'

import { TransactionTable } from '../components/TransactionTable/TransactionTable'
import type { DashboardOutletContext } from './Dashboard'

export const DashboardTransactions = () => {
  const { transactionsLedger, accountsLedger } = useOutletContext<DashboardOutletContext>()

  return (
    <div className="space-y-4">
      <h2 className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
        Transactions
      </h2>
      <TransactionTable transactions={transactionsLedger} accounts={accountsLedger} />
    </div>
  )
}
