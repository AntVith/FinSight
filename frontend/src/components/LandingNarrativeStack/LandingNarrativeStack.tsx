import { Link } from 'react-router-dom'

interface CapabilityCardSpec {
  glyphPaths: readonly string[]
  eyebrowKicker: string
  headlineTitle: string
  bodyCopy: string
  reinforcementBadge?: string
}

// ── Owner-facing links (single source of truth, swap these before deploy) ───
const SOURCE_REPOSITORY_URL = 'https://github.com/AntVith/FinSight'
const ENGINEER_LINKEDIN_URL = 'https://www.linkedin.com/in/anthony-vithayathil-2256bb136/'
const ENGINEER_PERSONAL_SITE_URL: string | null = null

const capabilityCardSpecsRibbon: readonly CapabilityCardSpec[] = [
  {
    glyphPaths: ['M3 21h18', 'M5 21V11l7-4 7 4v10', 'M9 21V13h6v8'],
    eyebrowKicker: 'Bank connectivity',
    headlineTitle: 'Connect your bank',
    bodyCopy:
      'Link your accounts securely with Plaid. Choose from thousands of institutions and pull your transactions in a few taps.',
    reinforcementBadge: '12,000+ institutions',
  },
  {
    glyphPaths: ['M12 2l2.39 6.95L21 11l-6.61 2.05L12 20l-2.39-6.95L3 11l6.61-2.05L12 2z'],
    eyebrowKicker: 'AI insights',
    headlineTitle: 'AI-powered insights',
    bodyCopy:
      'Anthropic Claude turns your spending into a clear summary with top categories, unusual charges, and practical recommendations.',
    reinforcementBadge: 'Anthropic-powered',
  },
  {
    glyphPaths: [
      'M21 12a9 9 0 0 1-15 6.7L3 16',
      'M3 12a9 9 0 0 1 15-6.7L21 8',
      'M21 3v5h-5',
      'M3 21v-5h5',
    ],
    eyebrowKicker: 'Stay current',
    headlineTitle: 'Always up to date',
    bodyCopy:
      'Sync on demand and your dashboard refreshes with the latest transactions and a fresh AI summary.',
    reinforcementBadge: 'One-click refresh',
  },
  {
    glyphPaths: ['M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z'],
    eyebrowKicker: 'Security',
    headlineTitle: 'Secure sign-in',
    bodyCopy:
      'Your account is password-protected. Bank credentials never touch FinSight; Plaid handles the secure link.',
    reinforcementBadge: 'Private by design',
  },
  {
    glyphPaths: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M21 21l-5-5', 'M11 8v3', 'M11 14h.01'],
    eyebrowKicker: 'Alerts',
    headlineTitle: 'Unusual charge alerts',
    bodyCopy:
      'Large or out-of-pattern transactions get flagged with plain-language context so you know what to review.',
  },
  {
    glyphPaths: ['M3 17l5-5 4 4 8-8', 'M14 8h6v6'],
    eyebrowKicker: 'Breakdown',
    headlineTitle: 'Spending breakdown',
    bodyCopy:
      'See categories, merchants, and trends at a glance so you can spot where money is actually going.',
  },
]

interface HowItWorksStepSpec {
  stepNumeral: string
  stepHeadline: string
  stepCopy: string
  glyphPaths: readonly string[]
}

const howItWorksStepLadder: readonly HowItWorksStepSpec[] = [
  {
    stepNumeral: '01',
    stepHeadline: 'Link your institution',
    stepCopy:
      'Plaid handles the security and complexity of linking your bank and pulling your transactions. Your login credentials never touch FinSight.',
    glyphPaths: ['M3 21h18', 'M5 21V11l7-4 7 4v10', 'M9 21V13h6v8'],
  },
  {
    stepNumeral: '02',
    stepHeadline: 'We sync your activity',
    stepCopy:
      'Your transactions sync automatically and stay up to date, so your dashboard always reflects your latest spending.',
    glyphPaths: ['M21 12a9 9 0 0 1-15 6.7L3 16', 'M3 12a9 9 0 0 1 15-6.7L21 8', 'M21 3v5h-5', 'M3 21v-5h5'],
  },
  {
    stepNumeral: '03',
    stepHeadline: 'Claude narrates',
    stepCopy:
      'Anthropic Claude reads your spending patterns and delivers a plain-language summary with top categories, unusual charges, and practical recommendations.',
    glyphPaths: ['M12 2l2.39 6.95L21 11l-6.61 2.05L12 20l-2.39-6.95L3 11l6.61-2.05L12 2z'],
  },
]

interface TechStackRowSpec {
  rowLabel: string
  pills: readonly { tagLabel: string; accentColorHex: string }[]
}

const techStackRowLadder: readonly TechStackRowSpec[] = [
  {
    rowLabel: 'Frontend',
    pills: [
      { tagLabel: 'React 18', accentColorHex: '#61dafb' },
      { tagLabel: 'TypeScript', accentColorHex: '#3178c6' },
      { tagLabel: 'Tailwind v4', accentColorHex: '#38bdf8' },
      { tagLabel: 'Recharts', accentColorHex: '#a78bfa' },
      { tagLabel: 'Vite', accentColorHex: '#646cff' },
    ],
  },
  {
    rowLabel: 'Backend',
    pills: [
      { tagLabel: 'Go', accentColorHex: '#00add8' },
      { tagLabel: 'chi router', accentColorHex: '#7c3aed' },
      { tagLabel: 'PostgreSQL', accentColorHex: '#336791' },
      { tagLabel: 'JWT (HS256)', accentColorHex: '#fb923c' },
      { tagLabel: 'bcrypt', accentColorHex: '#f43f5e' },
    ],
  },
  {
    rowLabel: 'Integrations',
    pills: [
      { tagLabel: 'Plaid API', accentColorHex: '#00d4a4' },
      { tagLabel: 'Anthropic Claude', accentColorHex: '#d97757' },
    ],
  },
]

const SvgStrokeIconGlyph = ({
  pathFragmentLines,
  ariaHidden = true,
  sizeInPx = 22,
}: {
  pathFragmentLines: readonly string[]
  ariaHidden?: boolean
  sizeInPx?: number
}) => (
  <svg
    viewBox="0 0 24 24"
    width={sizeInPx}
    height={sizeInPx}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden={ariaHidden}
  >
    {pathFragmentLines.map((fragment, fragmentIndex) => (
      <path key={fragmentIndex} d={fragment} />
    ))}
  </svg>
)

export const LandingNarrativeStack = () => (
  <div className="relative">
    {/* ── Capability ribbon ─────────────────────────────────────────────────── */}
    <section className="relative overflow-hidden bg-white dark:bg-gray-950">
      <div aria-hidden className="absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[420px] bg-gradient-to-br from-brand-600/25 via-purple-500/25 to-transparent blur-3xl" />
      <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-28">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-semibold tracking-[0.35em] text-brand-700 dark:text-brand-300 uppercase mb-4">
            What you get
          </p>
          <h2 className="text-[2.25rem] sm:text-[2.75rem] font-semibold tracking-tighter text-gray-950 dark:text-white leading-[1.05]">
            Built like a product, <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-purple-600 dark:from-brand-400 dark:to-purple-400">not a project</span>.
          </h2>
          <p className="text-base text-gray-500 dark:text-gray-400 mt-5">
            From linking your bank to reading AI-powered insights, every piece is designed to make your money clearer.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilityCardSpecsRibbon.map((cardSpec) => (
            <article
              key={cardSpec.headlineTitle}
              className="group relative overflow-hidden rounded-3xl border border-gray-200/80 dark:border-white/[0.06] bg-white/85 dark:bg-white/[0.025] backdrop-blur-sm p-7 transition-all duration-300 hover:border-brand-500/40 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-700/10"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -top-20 -right-20 w-44 h-44 rounded-full bg-gradient-to-br from-brand-500/20 via-purple-500/10 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              />
              <div className="relative">
                <span className="inline-grid place-items-center w-11 h-11 rounded-2xl text-white bg-gradient-to-br from-brand-500 via-brand-700 to-purple-700 shadow-md shadow-brand-700/30 ring-1 ring-white/15 mb-5">
                  <SvgStrokeIconGlyph pathFragmentLines={cardSpec.glyphPaths} />
                </span>
                <p className="text-[10px] uppercase tracking-[0.3em] text-brand-700 dark:text-brand-300 mb-2">
                  {cardSpec.eyebrowKicker}
                </p>
                <h3 className="text-lg font-semibold tracking-tight text-gray-950 dark:text-white mb-2">
                  {cardSpec.headlineTitle}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {cardSpec.bodyCopy}
                </p>
                {cardSpec.reinforcementBadge && (
                  <span className="inline-flex items-center gap-1.5 mt-5 px-2.5 py-1 rounded-full bg-brand-600/10 dark:bg-brand-500/15 text-[10px] font-semibold tracking-wider uppercase text-brand-700 dark:text-brand-300 ring-1 ring-brand-600/15 dark:ring-brand-400/25">
                    <span aria-hidden className="w-1 h-1 rounded-full bg-brand-600 dark:bg-brand-400" />
                    {cardSpec.reinforcementBadge}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>

    {/* ── How it works ──────────────────────────────────────────────────────── */}
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-[#0b0e1a] dark:to-gray-950 border-y border-gray-200/60 dark:border-white/[0.05]">
      <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs font-semibold tracking-[0.35em] text-brand-700 dark:text-brand-300 uppercase mb-4">
            How it works
          </p>
          <h2 className="text-[2.25rem] sm:text-[2.5rem] font-semibold tracking-tighter text-gray-950 dark:text-white leading-[1.1]">
            Three moves, full visibility.
          </h2>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
          <div aria-hidden className="hidden md:block absolute top-7 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />
          {howItWorksStepLadder.map((stepSpec) => (
            <div key={stepSpec.stepNumeral} className="relative flex flex-col items-center text-center px-4">
              <div className="relative grid place-items-center w-14 h-14 rounded-2xl text-white bg-gradient-to-br from-brand-500 via-brand-700 to-purple-700 shadow-lg shadow-brand-700/30 ring-1 ring-white/15 mb-5">
                <SvgStrokeIconGlyph pathFragmentLines={stepSpec.glyphPaths} sizeInPx={24} />
                <span className="absolute -bottom-2 -right-2 grid place-items-center w-7 h-7 rounded-full bg-white dark:bg-[#0b0e1a] text-[11px] font-bold tracking-wide text-brand-700 dark:text-brand-300 ring-1 ring-brand-500/30 shadow-sm">
                  {stepSpec.stepNumeral}
                </span>
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-gray-950 dark:text-white mb-2">
                {stepSpec.stepHeadline}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-xs">
                {stepSpec.stepCopy}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Engineered with, tech stack ridge ────────────────────────────────── */}
    <section className="relative overflow-hidden bg-white dark:bg-gray-950">
      <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-semibold tracking-[0.35em] text-brand-700 dark:text-brand-300 uppercase mb-4">
            Engineered with
          </p>
          <h2 className="text-[2.25rem] sm:text-[2.5rem] font-semibold tracking-tighter text-gray-950 dark:text-white leading-[1.1]">
            A stack that earns its keep.
          </h2>
          <p className="text-base text-gray-500 dark:text-gray-400 mt-5">
            Nothing trendy for trend's sake, each tool chosen because it makes the product faster, safer, or more honest.
          </p>
        </div>

        <div className="space-y-5 max-w-4xl mx-auto">
          {techStackRowLadder.map((rowSpec) => (
            <div
              key={rowSpec.rowLabel}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200/80 dark:border-white/[0.06] bg-white/85 dark:bg-white/[0.025] backdrop-blur-sm px-5 py-4"
            >
              <span className="text-[10px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 min-w-[7rem]">
                {rowSpec.rowLabel}
              </span>
              <div className="flex flex-wrap gap-2">
                {rowSpec.pills.map((pillSpec) => (
                  <span
                    key={pillSpec.tagLabel}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/[0.08] transition-colors hover:border-gray-300 dark:hover:border-white/15"
                  >
                    <span
                      aria-hidden
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: pillSpec.accentColorHex }}
                    />
                    {pillSpec.tagLabel}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Closing CTA halo ──────────────────────────────────────────────────── */}
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-[#0b0e1a] dark:to-gray-950">
      <div aria-hidden className="absolute inset-x-0 -top-32 h-[420px] bg-gradient-to-br from-brand-600/25 via-purple-500/30 to-transparent blur-3xl" />
      <div className="relative max-w-4xl mx-auto px-6 py-24 lg:py-28 text-center">
        <p className="text-xs font-semibold tracking-[0.35em] text-brand-700 dark:text-brand-300 uppercase mb-5">
          Ready when you are
        </p>
        <h2 className="text-[2.4rem] sm:text-[3rem] font-semibold tracking-tighter text-gray-950 dark:text-white leading-[1.05] mb-6">
          Turn your transactions into{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-purple-600 dark:from-brand-400 dark:to-purple-400">
            truth
          </span>
          .
        </h2>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-10">
          Sign up in under a minute, link a bank, and see your spending explained.
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-4 rounded-2xl text-white text-sm font-semibold bg-gradient-to-r from-brand-600 via-brand-700 to-purple-700 shadow-xl shadow-brand-700/30 ring-1 ring-white/15 hover:brightness-110 transition"
          >
            Get started
          </Link>
          <a
            href={SOURCE_REPOSITORY_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-4 rounded-2xl text-sm font-semibold text-gray-900 dark:text-gray-50 bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.1] hover:border-brand-500/50 transition"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.11.78-.25.78-.55v-2.13c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.19 1.18.93-.26 1.92-.39 2.91-.39s1.98.13 2.91.39c2.22-1.49 3.19-1.18 3.19-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.66.79.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
            </svg>
            View source
          </a>
          <a
            href={ENGINEER_LINKEDIN_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-4 rounded-2xl text-sm font-semibold text-brand-700 dark:text-brand-200 bg-transparent border border-brand-500/40 dark:border-brand-400/40 hover:bg-brand-500/10 transition"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
              <path d="M19 0H5a5 5 0 0 0-5 5v14a5 5 0 0 0 5 5h14a5 5 0 0 0 5-5V5a5 5 0 0 0-5-5zM8 19H5V8h3v11zM6.5 6.7c-.97 0-1.75-.79-1.75-1.75S5.53 3.2 6.5 3.2s1.75.79 1.75 1.75S7.47 6.7 6.5 6.7zM20 19h-3v-5.6c0-1.34-.02-3.07-1.87-3.07-1.87 0-2.16 1.46-2.16 2.97V19h-3V8h2.88v1.5h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.6 2 3.6 4.6V19h-.34z" />
            </svg>
            Talk to the engineer
          </a>
        </div>
      </div>
    </section>

    {/* ── Tiny footer ───────────────────────────────────────────────────────── */}
    <footer className="relative bg-white dark:bg-gray-950 border-t border-gray-200/60 dark:border-white/[0.05]">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid place-items-center w-7 h-7 rounded-lg text-white bg-gradient-to-br from-brand-500 via-brand-700 to-purple-700 shadow-md shadow-brand-700/30"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l5-5 4 4 8-8" />
              <path d="M14 8h6v6" />
            </svg>
          </span>
          <span className="tracking-tight">
            FinSight, engineered as a portfolio of craft, not just code.
          </span>
        </div>
        <div className="flex items-center gap-4 sm:gap-5 flex-wrap">
          <a
            href={SOURCE_REPOSITORY_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
          >
            GitHub
          </a>
          <a
            href={ENGINEER_LINKEDIN_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
          >
            LinkedIn
          </a>
          {ENGINEER_PERSONAL_SITE_URL && (
            <a
              href={ENGINEER_PERSONAL_SITE_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
            >
              Portfolio
            </a>
          )}
          <span aria-hidden className="w-px h-3 bg-gray-300 dark:bg-white/15" />
          <span>© {new Date().getFullYear()} FinSight</span>
        </div>
      </div>
    </footer>
  </div>
)
