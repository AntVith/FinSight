import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useAuthenticatedSession } from '../context/AuthContext'

export const Login = () => {
  const navigate = useNavigate()
  const [returnTargetSearchParameters] = useSearchParams()

  const {
    signInWithPassword,
    enterDemoSandboxSession,
    demoCredentialsConfiguredOnBuild,
  } = useAuthenticatedSession()

  const [credentialMailbox, setCredentialMailbox] = useState('')
  const [credentialPasswordPlaintext, setCredentialPasswordPlaintext] = useState('')
  const [formSubmissionBusy, setFormSubmissionBusy] = useState(false)
  const [demoShortcutBusy, setDemoShortcutBusy] = useState(false)
  const [credentialRejectionExplanation, setCredentialRejectionExplanation] = useState<
    string | null
  >(null)

  const encodedReturnTargetFragment = returnTargetSearchParameters.get('returnTo')
  const resolvedPostAuthDestination = encodedReturnTargetFragment
    ? decodeURIComponent(encodedReturnTargetFragment)
    : '/dashboard'

  const handleAuthenticateExistingMember = async (event: FormEvent) => {
    event.preventDefault()
    setCredentialRejectionExplanation(null)

    try {
      setFormSubmissionBusy(true)
      await signInWithPassword({
        email: credentialMailbox.trim(),
        password: credentialPasswordPlaintext,
      })
      navigate(resolvedPostAuthDestination, { replace: true })
    } catch {
      setCredentialRejectionExplanation('Email or password is incorrect. Please try again.')
    } finally {
      setFormSubmissionBusy(false)
    }
  }

  const handleDemoShortcutFromLogin = async () => {
    setCredentialRejectionExplanation(null)
    try {
      setDemoShortcutBusy(true)
      await enterDemoSandboxSession()
      navigate('/dashboard', { replace: true })
    } catch {
      setCredentialRejectionExplanation('Demo login is not available right now. Try again shortly.')
    } finally {
      setDemoShortcutBusy(false)
    }
  }

  return (
    <main className="min-h-[calc(100vh-73px)] flex items-center justify-center px-4 py-14 bg-gray-50 dark:bg-gray-950">
      <section className="w-full max-w-md bg-white dark:bg-black/40 backdrop-blur-xl rounded-[1.9rem] border border-gray-100 dark:border-gray-900 p-10 shadow-[0_40px_60px_-20px_rgb(99_102_241_/_0.45)]">
        <header className="mb-10 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-brand-700 dark:text-brand-300 mb-3">
            FinSight cockpit
          </p>
          <h1 className="text-3xl font-semibold tracking-tighter text-gray-950 dark:text-white">
            Log in with confidence
          </h1>
        </header>

        <form className="space-y-7" onSubmit={(event) => void handleAuthenticateExistingMember(event)}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
            Email
            <input
              autoComplete="email"
              required
              type="email"
              value={credentialMailbox}
              onChange={(inputEventLine) => setCredentialMailbox(inputEventLine.target.value)}
              className="mt-2 w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-transparent px-4 py-3 text-base text-gray-950 dark:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
              placeholder="you@financial-lab.space"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
            Password
            <input
              autoComplete="current-password"
              required
              type="password"
              value={credentialPasswordPlaintext}
              onChange={(inputEventLine) =>
                setCredentialPasswordPlaintext(inputEventLine.target.value)
              }
              className="mt-2 w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-transparent px-4 py-3 text-base text-gray-950 dark:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
            />
          </label>

          {credentialRejectionExplanation && (
            <p className="text-sm text-red-600 dark:text-red-400">{credentialRejectionExplanation}</p>
          )}

          <div className="pt-3">
            <button
              disabled={formSubmissionBusy || demoShortcutBusy}
              type="submit"
              className="w-full py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-brand-600 via-brand-700 to-purple-700 shadow-lg shadow-brand-700/30 ring-1 ring-white/15 hover:brightness-110 disabled:opacity-60 disabled:hover:brightness-100 transition"
            >
              {formSubmissionBusy ? 'Signing you in…' : 'Sign in'}
            </button>
          </div>
        </form>

        {demoCredentialsConfiguredOnBuild && (
          <div className="mt-8 rounded-2xl border border-brand-500/30 dark:border-brand-400/30 bg-brand-50/60 dark:bg-brand-500/5 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-brand-700 dark:text-brand-300 font-semibold mb-2">
              Just browsing?
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Skip the form. Open a fully populated demo workspace, no signup needed.
            </p>
            <button
              type="button"
              onClick={() => void handleDemoShortcutFromLogin()}
              disabled={demoShortcutBusy || formSubmissionBusy}
              className="w-full py-3 rounded-xl font-semibold text-brand-700 dark:text-brand-200 border border-brand-500/50 dark:border-brand-400/50 hover:bg-brand-500/10 disabled:opacity-60 transition"
            >
              {demoShortcutBusy ? 'Loading demo workspace…' : 'Try the demo'}
            </button>
          </div>
        )}

        <p className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
          New to FinSight?{' '}
          <Link className="text-brand-700 dark:text-brand-300 hover:underline font-semibold" to="/register">
            Create your workspace
          </Link>
        </p>
      </section>
    </main>
  )
}
