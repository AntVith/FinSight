export const formatCurrency = (amount: number): string =>
  Math.abs(amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export const formatCategoryName = (category: string): string =>
  category.split('_').map((word) => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')

export const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

/** Long-form date for dashboards, e.g. "May 10, 2026"; invalid input falls back to supplied string slice. */
export const formatDisplayedCalendarDateMedium = (isoDateInput: string): string => {
  const parsedMoment = new Date(isoDateInput)
  if (Number.isNaN(parsedMoment.valueOf())) {
    return isoDateInput.slice(0, 10)
  }
  return parsedMoment.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
