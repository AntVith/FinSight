import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { syncTransactions } from '../api/client'
import { LinkButton } from '../components/LinkButton/LinkButton'
import { SignUpSignInButtons } from '../components/SignUpSignInButtons/SignUpSignInButtons'
import { SecuredByPlaid } from '../components/SecuredByPlaid/SecuredByPlaid'
import { useAuthenticatedSession } from '../context/AuthContext'

export const Connect = () => {
  const navigate = useNavigate()
  const { isDemoSession, signOutAndClearStoredSession } = useAuthenticatedSession()
  const [postLinkPipelineBusy, setPostLinkPipelineBusy] = useState(false)
  const [postLinkPipelineErrorMessage, setPostLinkPipelineErrorMessage] = useState<string | null>(
    null
  )
  const [demoExitBusy, setDemoExitBusy] = useState(false)

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

  const leaveDemoForAuthPath = async (destinationPath: '/register' | '/login') => {
    setDemoExitBusy(true)
    // Navigate first so RequireAuth unmounts before authenticatedUser becomes null.
    navigate(destinationPath, { replace: true })
    await signOutAndClearStoredSession()
  }

  return (
    <main className="min-h-[calc(100vh-73px)] flex flex-col items-center justify-center px-4 py-10 sm:py-16 bg-slate-50 dark:bg-gray-950">
      <section className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-[1.75rem] sm:rounded-[2rem] border border-gray-100 dark:border-gray-800 p-6 sm:p-10 shadow-[0_40px_80px_-30px_rgb(79_70_229_/_0.45)]">
        <p className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-brand-600 dark:text-brand-300 mb-3 sm:mb-4 text-center">
          Connect your bank
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center text-gray-950 dark:text-white mb-3">
          Link an account
        </h1>
        <p className="text-center text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-6 sm:mb-8">
          Securely connect through Plaid. After success you will land on the dashboard with an
          automatic sync.
        </p>

        {isDemoSession && (
          <div className="mb-6 rounded-2xl border border-brand-200 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 px-4 py-3 text-sm text-brand-900 dark:text-brand-100">
            Demo accounts already include a linked bank with seeded data. Linking another institution
            is disabled here. Create an account or sign in to try Plaid yourself.
          </div>
        )}

        {postLinkPipelineErrorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-100">
            {postLinkPipelineErrorMessage}
          </div>
        )}

        {postLinkPipelineBusy ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <span className="inline-block w-9 h-9 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Syncing your transactions. This can take up to thirty seconds.
            </p>
          </div>
        ) : (
          <>
            <LinkButton
              onSuccess={handlePlaidHandshakeFinalized}
              disabled={isDemoSession}
            />
            <SecuredByPlaid className="mt-4" />
          </>
        )}

        {isDemoSession ? (
          <div className="mt-8 sm:mt-10">
            <SignUpSignInButtons
              primaryLabel={demoExitBusy ? 'Leaving demo…' : 'Create an account'}
              secondaryLabel="Sign in"
              disabled={demoExitBusy}
              stretchOnNarrow
              showPrimaryChevron={!demoExitBusy}
              onPrimaryClick={() => void leaveDemoForAuthPath('/register')}
              onSecondaryClick={() => void leaveDemoForAuthPath('/login')}
            />
          </div>
        ) : (
          <div className="mt-8 sm:mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
            Prefer watching first?{' '}
            <Link className="text-brand-600 dark:text-brand-300 font-semibold" to="/dashboard">
              Return to dashboard
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}
