import { Link } from 'react-router-dom'

import { LandingNarrativeStack } from '../components/LandingNarrativeStack/LandingNarrativeStack'
import { LandingProductPreviewRibbon } from '../components/LandingPreview/LandingPreview'
import {
  illustrativeSyntheticInsightSnapshot,
  illustrativeSyntheticTransactionLedgerRowset,
} from '../data/landingMock'
import { useAuthenticatedSession } from '../context/AuthContext'

export const Landing = () => {
  const { demoCredentialsConfiguredOnBuild } = useAuthenticatedSession()

  return (
    <main className="bg-slate-50 dark:bg-gray-950 min-h-[calc(100vh-73px)]">
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-10 top-[-20%] h-[420px] bg-gradient-to-br from-brand-600/25 via-purple-500/35 to-transparent blur-3xl dark:opacity-80" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-8 sm:pb-10 lg:pt-20 lg:pb-14 relative">
          <div className="max-w-4xl mx-auto text-center mb-8 sm:mb-10">
            <p className="text-[10px] sm:text-xs font-semibold tracking-[0.3em] sm:tracking-[0.35em] text-brand-700 dark:text-brand-300 uppercase mb-3 sm:mb-4">
              Personal finance, simplified
            </p>
            <h1 className="text-3xl sm:text-[2.85rem] md:text-5xl lg:text-[3.85rem] font-semibold tracking-tighter text-gray-950 dark:text-white leading-tight mb-4 sm:mb-6">
              Ditch the spreadsheets. Take command of your finances with one click.
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-300 mb-8 sm:mb-12">
              FinSight connects to your bank through Plaid, syncs your transactions automatically,
              and uses Anthropic Claude to summarize spending, flag unusual charges, and suggest
              what to do next.
            </p>
            {!demoCredentialsConfiguredOnBuild && (
              <div className="inline-flex px-6 py-3 rounded-3xl bg-amber-50 dark:bg-amber-900/35 text-sm text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 mb-10">
                Demo login is not configured for this build. Sign up or sign in to explore FinSight.
              </div>
            )}
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 mb-8">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-10 py-3.5 sm:py-4 rounded-2xl text-white text-sm font-semibold bg-gradient-to-r from-brand-600 via-brand-700 to-purple-700 shadow-xl shadow-brand-700/30 ring-1 ring-white/15 hover:brightness-110 transition"
              >
                Get started
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-10 py-3.5 sm:py-4 rounded-2xl text-sm font-semibold text-brand-700 dark:text-brand-300 bg-white/90 dark:bg-white/[0.04] backdrop-blur border border-brand-500/40 dark:border-brand-400/40 shadow-sm shadow-brand-600/10 hover:border-brand-500/70 dark:hover:border-brand-400/70 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-800 dark:hover:text-brand-200 transition"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="rounded-[2.75rem] border border-dashed border-gray-200 dark:border-gray-800 bg-gray-950/5 dark:bg-black/35 p-3 sm:p-4 relative">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 sm:mb-4 px-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200/80 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] text-[10px] uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                Product preview
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-right max-w-md">
                Example data using the same charts and tables you see after linking a bank.
              </p>
            </div>
            <LandingProductPreviewRibbon
              previewTransactions={illustrativeSyntheticTransactionLedgerRowset}
              previewInsightEnvelope={illustrativeSyntheticInsightSnapshot}
            />
          </div>
        </div>
      </section>

      <LandingNarrativeStack />
    </main>
  )
}
