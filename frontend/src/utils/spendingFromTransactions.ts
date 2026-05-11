import type { CategorySummary, Transaction } from '../types'

const incomeLikeCategoryFragment = new Set([
  'INCOME',
  'TRANSFER_IN',
])

/**
 * Mirrors dashboard spending exclusions: excludes inflows-like categories while summing outbound debits only.
 */
export const deriveSpendingBucketsFromLedger = (
  transactionsListReadonly: Transaction[] | null | undefined
): CategorySummary[] => {
  const safeLedger = Array.isArray(transactionsListReadonly) ? transactionsListReadonly : []
  const runningBucket = new Map<string, CategorySummary>()
  safeLedger.forEach((transactionRow) => {
    if (!(transactionRow.Amount > 0)) {
      return
    }

    const categoryLabel = transactionRow.CategoryPrimary ?? ''
    if (
      [...incomeLikeCategoryFragment].some((fragment) =>
        categoryLabel.includes(fragment)
      )
    ) {
      return
    }

    const priorBucket = runningBucket.get(categoryLabel) ?? {
      category: categoryLabel,
      total_amount: 0,
      count: 0,
    }

    priorBucket.total_amount += transactionRow.Amount
    priorBucket.count += 1
    runningBucket.set(categoryLabel, priorBucket)
  })

  const sortedDescending = [...runningBucket.values()].sort(
    (leftHand, rightHand) => rightHand.total_amount - leftHand.total_amount
  )

  return sortedDescending.filter((aggregateRow) => aggregateRow.category !== '')
}

/** Latest calendar day among posted transaction rows (yyyy-mm-dd lexical compare safe). */
export const deriveLatestTransactionCalendarDayLexical = (
  transactionsListReadonly: Transaction[] | null | undefined
): string | null => {
  if (!Array.isArray(transactionsListReadonly) || transactionsListReadonly.length === 0) {
    return null
  }
  let highestLexicalCandidate: string | null = null
  transactionsListReadonly.forEach((transactionRow) => {
    if (typeof transactionRow.Date !== 'string' || transactionRow.Date.length < 10) {
      return
    }
    const daySlice = transactionRow.Date.slice(0, 10)
    if (
      highestLexicalCandidate === null ||
      daySlice.localeCompare(highestLexicalCandidate) > 0
    ) {
      highestLexicalCandidate = daySlice
    }
  })
  return highestLexicalCandidate
}
