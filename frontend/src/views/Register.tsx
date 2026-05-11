import axios from 'axios'
import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuthenticatedSession } from '../context/AuthContext'

export const Register = () => {
  const navigate = useNavigate()
  const {
    signUpWithCredentials,
    enterDemoSandboxSession,
    demoCredentialsConfiguredOnBuild,
  } = useAuthenticatedSession()

  const [credentialMailbox, setCredentialMailbox] = useState('')
  const [credentialPasswordPlaintext, setCredentialPasswordPlaintext] = useState('')
  const [optionalGivenNamePrefix, setOptionalGivenNamePrefix] = useState('')
  const [optionalFamilyNameSuffix, setOptionalFamilyNameSuffix] = useState('')
  const [formSubmissionBusy, setFormSubmissionBusy] = useState(false)
  const [demoShortcutBusy, setDemoShortcutBusy] = useState(false)
  const [credentialRejectionExplanation, setCredentialRejectionExplanation] = useState<
    string | null
  >(null)

  const handleProvisionNewCollaboratorEnvelope = async (event: FormEvent) => {
    event.preventDefault()
    setCredentialRejectionExplanation(null)

    try {
      setFormSubmissionBusy(true)
      await signUpWithCredentials({
        email: credentialMailbox.trim(),
        password: credentialPasswordPlaintext,
        first_name: optionalGivenNamePrefix.trim(),
        last_name: optionalFamilyNameSuffix.trim(),
      })
      navigate('/dashboard', { replace: true })
    } catch (errorCaptured) {
      const conflictDuplicateMailbox =
        axios.isAxiosError(errorCaptured) && errorCaptured.response?.status === 409

      setCredentialRejectionExplanation(
        conflictDuplicateMailbox
          ? 'An account with that email already exists.'
          : 'Password must be at least 10 characters.'
      )
    } finally {
      setFormSubmissionBusy(false)
    }
  }

  const handleDemoShortcutFromRegister = async () => {
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
      <section className="w-full max-w-xl bg-white dark:bg-black/40 backdrop-blur-xl rounded-[1.9rem] border border-gray-100 dark:border-gray-900 shadow-[0_40px_60px_-20px_rgb(99_102_241_/_0.45)] px-12 py-12">
        <header className="mb-12 text-center">
          <p className="uppercase tracking-[0.35em] text-xs text-brand-700 dark:text-brand-300 mb-4">
            New workspace
          </p>
          <h1 className="text-[2.65rem] font-semibold tracking-tighter text-gray-950 dark:text-white">
            Provision FinSight
          </h1>
        </header>

        <form
          className="space-y-7"
          onSubmit={(submissionEventEnvelope) =>
            void handleProvisionNewCollaboratorEnvelope(submissionEventEnvelope)
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200 md:col-span-2">
              Email
              <input
                type="email"
                required
                value={credentialMailbox}
                autoComplete="email"
                className="mt-2 block w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-transparent px-4 py-3 text-gray-950 dark:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
                onChange={(mailboxEvent) => setCredentialMailbox(mailboxEvent.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              First name
              <input
                value={optionalGivenNamePrefix}
                className="mt-2 block w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-transparent px-4 py-3 text-gray-950 dark:text-white"
                onChange={(firstNameEnvelope) =>
                  setOptionalGivenNamePrefix(firstNameEnvelope.target.value)
                }
              />
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Last name
              <input
                value={optionalFamilyNameSuffix}
                className="mt-2 block w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-transparent px-4 py-3 text-gray-950 dark:text-white"
                onChange={(lastEnvelope) =>
                  setOptionalFamilyNameSuffix(lastEnvelope.target.value)
                }
              />
            </label>
          </div>

          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Password
            <input
              type="password"
              autoComplete="new-password"
              required
              value={credentialPasswordPlaintext}
              className="mt-2 block w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-transparent px-4 py-3 text-gray-950 dark:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
              onChange={(passphraseLine) =>
                setCredentialPasswordPlaintext(passphraseLine.target.value)
              }
            />
            <span className="text-xs block mt-2 text-gray-500 dark:text-gray-400">
              Passphrases need at least ten characters.
            </span>
          </label>

          {credentialRejectionExplanation && (
            <p className="text-sm text-red-600 dark:text-red-400">{credentialRejectionExplanation}</p>
          )}

          <div className="pt-3">
            <button
              type="submit"
              disabled={formSubmissionBusy || demoShortcutBusy}
              className="w-full py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-brand-600 via-brand-700 to-purple-700 shadow-lg shadow-brand-700/30 ring-1 ring-white/15 hover:brightness-110 disabled:opacity-60 disabled:hover:brightness-100 transition"
            >
              {formSubmissionBusy ? 'Creating your workspace…' : 'Create account'}
            </button>
          </div>
        </form>

        {demoCredentialsConfiguredOnBuild && (
          <div className="mt-8 rounded-2xl border border-brand-500/30 dark:border-brand-400/30 bg-brand-50/60 dark:bg-brand-500/5 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-brand-700 dark:text-brand-300 font-semibold mb-2">
              Not ready to commit?
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Skip signup. Browse a fully populated demo workspace with seeded transactions and live insights.
            </p>
            <button
              type="button"
              onClick={() => void handleDemoShortcutFromRegister()}
              disabled={demoShortcutBusy || formSubmissionBusy}
              className="w-full py-3 rounded-xl font-semibold text-brand-700 dark:text-brand-200 border border-brand-500/50 dark:border-brand-400/50 hover:bg-brand-500/10 disabled:opacity-60 transition"
            >
              {demoShortcutBusy ? 'Loading demo workspace…' : 'Try the demo'}
            </button>
          </div>
        )}

        <p className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
          Already onboard?{' '}
          <Link className="text-brand-700 dark:text-brand-300 hover:underline font-semibold" to="/login">
            Sign in to your cockpit
          </Link>
        </p>
      </section>
    </main>
  )
}
