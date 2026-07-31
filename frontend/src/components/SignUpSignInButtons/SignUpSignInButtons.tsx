import { Link } from 'react-router-dom'

interface Props {
  primaryLabel: string
  secondaryLabel?: string
  primaryTo?: '/register' | '/login'
  secondaryTo?: '/register' | '/login'
  onPrimaryClick?: () => void
  onSecondaryClick?: () => void
  disabled?: boolean
  showPrimaryChevron?: boolean
  stretchOnNarrow?: boolean
}

const primaryActionClassName =
  'inline-flex items-center justify-center gap-2 px-5 sm:px-10 py-3 sm:py-4 rounded-2xl text-white text-sm font-semibold bg-gradient-to-r from-brand-600 via-brand-700 to-purple-700 shadow-xl shadow-brand-700/30 ring-1 ring-white/15 hover:brightness-110 disabled:opacity-55 disabled:hover:brightness-100 transition'

const secondaryActionClassName =
  'inline-flex items-center justify-center gap-2 px-5 sm:px-10 py-3 sm:py-4 rounded-2xl text-sm font-semibold text-brand-700 dark:text-brand-200 bg-white dark:bg-white/[0.04] backdrop-blur border border-brand-500/40 dark:border-brand-400/35 shadow-sm shadow-brand-600/10 hover:border-brand-500/70 dark:hover:border-brand-400/60 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-800 dark:hover:text-brand-100 disabled:opacity-55 transition'

const PrimaryChevronGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export const SignUpSignInButtons = ({
  primaryLabel,
  secondaryLabel = 'Sign in',
  primaryTo,
  secondaryTo,
  onPrimaryClick,
  onSecondaryClick,
  disabled = false,
  showPrimaryChevron = true,
  stretchOnNarrow = false,
}: Props) => {
  const widthClassName = stretchOnNarrow ? 'w-full sm:w-auto' : undefined
  const primaryClasses = [primaryActionClassName, widthClassName].filter(Boolean).join(' ')
  const secondaryClasses = [secondaryActionClassName, widthClassName].filter(Boolean).join(' ')

  const primaryBody = (
    <>
      {primaryLabel}
      {showPrimaryChevron && <PrimaryChevronGlyph />}
    </>
  )

  return (
    <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
      {primaryTo && !onPrimaryClick ? (
        <Link to={primaryTo} className={primaryClasses}>
          {primaryBody}
        </Link>
      ) : (
        <button type="button" disabled={disabled} onClick={onPrimaryClick} className={primaryClasses}>
          {primaryBody}
        </button>
      )}

      {secondaryTo && !onSecondaryClick ? (
        <Link to={secondaryTo} className={secondaryClasses}>
          {secondaryLabel}
        </Link>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={onSecondaryClick}
          className={secondaryClasses}
        >
          {secondaryLabel}
        </button>
      )}
    </div>
  )
}
