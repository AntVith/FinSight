import plaidMarkUrl from '../../assets/plaid-mark.png'

interface Props {
  className?: string
}

export const SecuredByPlaid = ({ className }: Props) => (
  <div className={['flex w-full justify-center', className].filter(Boolean).join(' ')}>
    <div
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand-200 dark:border-brand-500/25 bg-brand-50 dark:bg-brand-500/10 px-3 py-1.5 text-xs leading-none shadow-sm shadow-brand-700/5"
      aria-label="Secured by Plaid"
    >
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <span className="font-medium text-brand-700 dark:text-brand-300">Secured by</span>
        <span className="font-semibold text-brand-950 dark:text-white">Plaid</span>
      </span>
      <img
        src={plaidMarkUrl}
        alt=""
        width={16}
        height={16}
        className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/5 dark:ring-white/15"
      />
    </div>
  </div>
)
