import { usePlaidLinkHook } from '../../hooks/usePlaidLink'

interface Props {
  onSuccess: () => Promise<void>
}

export const LinkButton = ({ onSuccess }: Props) => {
  const { isReady, isLoading, error, open } = usePlaidLinkHook(onSuccess)

  return (
    <div className="w-full">
      <button
        onClick={() => open()}
        disabled={isLoading || !isReady}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-900 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-lg flex items-center justify-center gap-2"
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
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  )
}
