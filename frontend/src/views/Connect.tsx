import { LinkButton } from '../components/LinkButton/LinkButton'

interface Props {
  onSuccess: () => Promise<void>
  syncError: string | null
  isSyncing: boolean
}

export const Connect = ({ onSuccess, syncError, isSyncing }: Props) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-2 text-center">
          FinSight
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
          Connect your bank account to get AI-powered insights into your spending.
        </p>

        {syncError && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
            {syncError}
          </div>
        )}

        {isSyncing ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <span className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
              Syncing your transactions... this may take up to 30 seconds
            </p>
          </div>
        ) : (
          <LinkButton onSuccess={onSuccess} />
        )}
      </div>
    </div>
  )
}
