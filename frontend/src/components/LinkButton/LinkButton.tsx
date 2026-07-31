import { usePlaidLinkHook } from '../../hooks/usePlaidLink'

interface Props {
  onSuccess: () => void | Promise<void>
  disabled?: boolean
}

export const LinkButton = ({ onSuccess, disabled = false }: Props) => {
  const { isReady, isLoading, error, open } = usePlaidLinkHook(onSuccess, { disabled })

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => open()}
        disabled={disabled || isLoading || !isReady}
        title={disabled ? 'Bank linking is disabled for the shared demo account' : undefined}
        className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl text-white text-base sm:text-lg font-semibold bg-gradient-to-r from-brand-600 via-brand-700 to-purple-700 shadow-xl shadow-brand-700/30 ring-1 ring-white/15 hover:brightness-110 disabled:opacity-55 disabled:hover:brightness-100 transition"
      >
        {isLoading ? (
          <>
            <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Initializing...
          </>
        ) : (
          'Connect Your Bank'
        )}
      </button>
      {error && !disabled && (
        <p className="text-red-600 dark:text-red-300 text-sm mt-2">{error}</p>
      )}
    </div>
  )
}
