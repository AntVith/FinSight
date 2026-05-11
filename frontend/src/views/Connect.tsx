import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { syncTransactions } from '../api/client'
import { LinkButton } from '../components/LinkButton/LinkButton'

export const Connect = () => {
  const navigate = useNavigate()
  const [postLinkPipelineBusy, setPostLinkPipelineBusy] = useState(false)
  const [postLinkPipelineErrorMessage, setPostLinkPipelineErrorMessage] = useState<string | null>(
    null
  )

  const handlePlaidHandshakeFinalized = async () => {
    setPostLinkPipelineBusy(true)
    setPostLinkPipelineErrorMessage(null)
    try {
      await syncTransactions()
      navigate('/dashboard', { replace: true })
    } catch {
      setPostLinkPipelineErrorMessage(
        'Link succeeded but transaction refresh failed. retry from the dashboard.'
      )
    } finally {
      setPostLinkPipelineBusy(false)
    }
  }

  return (
    <main className="min-h-[calc(100vh-73px)] flex flex-col items-center justify-center px-4 py-16 bg-slate-50 dark:bg-gray-950">
      <section className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-10 shadow-[0_40px_80px_-30px_rgb(79_70_229_/_0.45)]">
        <p className="text-xs uppercase tracking-[0.35em] text-brand-600 dark:text-brand-300 mb-4 text-center">
          Plaid bridge
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-center text-gray-950 dark:text-white mb-3">
          Connect your bank
        </h1>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
          Securely link a sandbox institution. After success you will land on the dashboard with an
          automatic sync pass.
        </p>

        {postLinkPipelineErrorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-100">
            {postLinkPipelineErrorMessage}
          </div>
        )}

        {postLinkPipelineBusy ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <span className="inline-block w-9 h-9 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Normalizing transaction ledger. expect up to thirty seconds.
            </p>
          </div>
        ) : (
          <LinkButton onSuccess={handlePlaidHandshakeFinalized} />
        )}

        <div className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
          Prefer watching first?{' '}
          <Link className="text-brand-600 dark:text-brand-300 font-semibold" to="/dashboard">
            Return to dashboard
          </Link>
        </div>
      </section>
    </main>
  )
}
