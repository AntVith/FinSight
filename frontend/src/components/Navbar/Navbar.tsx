import { Link, NavLink } from 'react-router-dom'

interface NavbarShellSurfaceProperties {
  presentationVariant: 'marketing' | 'application'
  isDarkAppearance: boolean
  onToggleAppearance: () => void
  authenticatedUserMailbox?: string | null
  onTerminateSessionClicked?: () => void
  sandboxDemoShortcutEnabled?: boolean
  sandboxDemoBusy?: boolean
  onSandboxDemoShortcutTriggered?: () => void
}

const BrandSparklineGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M3 17l5-5 4 4 8-8" />
    <path d="M14 8h6v6" />
  </svg>
)

const SunIconGlyph = (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
)

const MoonIconGlyph = (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

const computeInitialsFromMailbox = (mailbox: string): string => {
  const beforeAt = mailbox.split('@')[0] ?? ''
  const compact = beforeAt.replace(/[^a-zA-Z0-9]/g, '')
  return (compact.slice(0, 2) || 'FS').toUpperCase()
}

const BrandWordmarkWithGlyph = () => (
  <Link to="/" className="group flex items-center gap-2.5">
    <span
      aria-hidden
      className="relative grid place-items-center w-9 h-9 rounded-xl text-white bg-gradient-to-br from-brand-500 via-brand-700 to-purple-700 shadow-lg shadow-brand-700/30 ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-[1.04]"
    >
      <BrandSparklineGlyph />
      <span className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/25 to-transparent" />
    </span>
    <span className="flex items-baseline">
      <span className="text-xl font-semibold tracking-tight text-gray-950 dark:text-white">
        Fin
      </span>
      <span className="text-xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-purple-600 dark:from-brand-400 dark:to-purple-400">
        Sight
      </span>
    </span>
  </Link>
)

const applicationNavLinkClassResolver = ({ isActive }: { isActive: boolean }): string =>
  [
    'relative text-sm font-medium px-3 py-2 rounded-lg transition-colors',
    isActive
      ? 'text-brand-700 dark:text-white bg-brand-600/10 dark:bg-gradient-to-r dark:from-brand-600/30 dark:to-purple-600/25 ring-1 ring-brand-600/15 dark:ring-brand-400/30 shadow-sm shadow-brand-700/5'
      : 'text-gray-600 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5',
  ].join(' ')

export const Navbar = ({
  presentationVariant,
  isDarkAppearance,
  onToggleAppearance,
  authenticatedUserMailbox,
  onTerminateSessionClicked,
  sandboxDemoShortcutEnabled = false,
  sandboxDemoBusy = false,
  onSandboxDemoShortcutTriggered,
}: NavbarShellSurfaceProperties) => (
  <nav className="sticky top-0 z-50">
    <div className="relative backdrop-blur-2xl backdrop-saturate-150 bg-white/85 dark:bg-[#0b0e1a]/85 border-b border-gray-200/60 dark:border-white/[0.07] shadow-[0_1px_0_0_rgb(255_255_255_/_0.04)_inset]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-3.5">
        <BrandWordmarkWithGlyph />

        <div className="flex items-center gap-2">
          {presentationVariant === 'marketing' && (
            <>
              {sandboxDemoShortcutEnabled && onSandboxDemoShortcutTriggered && (
                <button
                  type="button"
                  onClick={() => void onSandboxDemoShortcutTriggered()}
                  disabled={sandboxDemoBusy}
                  className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2 text-white bg-gradient-to-r from-brand-600 via-brand-700 to-purple-700 shadow-md shadow-brand-700/30 ring-1 ring-white/15 hover:brightness-110 disabled:opacity-55 transition"
                >
                  {sandboxDemoBusy ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Entering…
                    </>
                  ) : (
                    <>
                      <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-white/85 animate-pulse" />
                      Demo user
                    </>
                  )}
                </button>
              )}
              <Link
                to="/login"
                className="text-sm font-medium text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold rounded-xl px-4 py-2 text-white bg-gray-950 dark:text-gray-950 dark:bg-white ring-1 ring-black/5 dark:ring-white/15 hover:brightness-110 transition"
              >
                Sign up
              </Link>
            </>
          )}

          {presentationVariant === 'application' && (
            <>
              <div className="hidden md:flex items-center gap-1 mr-2">
                <NavLink to="/dashboard" className={applicationNavLinkClassResolver}>
                  Dashboard
                </NavLink>
                <NavLink to="/connect" className={applicationNavLinkClassResolver}>
                  Connect bank
                </NavLink>
              </div>

              {authenticatedUserMailbox && (
                <div className="hidden sm:flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-gray-200/80 dark:border-white/10 bg-white/60 dark:bg-white/[0.03]">
                  <span
                    aria-hidden
                    className="grid place-items-center w-7 h-7 rounded-full text-[10px] font-semibold tracking-wider text-white bg-gradient-to-br from-brand-500 via-brand-700 to-purple-700 ring-1 ring-white/15"
                  >
                    {computeInitialsFromMailbox(authenticatedUserMailbox)}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[12rem]">
                    {authenticatedUserMailbox}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => onTerminateSessionClicked?.()}
                className="text-sm font-medium text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                Sign out
              </button>
            </>
          )}

          <span
            aria-hidden
            className="hidden sm:inline-block w-px h-6 mx-1 bg-gradient-to-b from-transparent via-gray-300/70 to-transparent dark:via-white/15"
          />

          <button
            type="button"
            onClick={onToggleAppearance}
            className="grid place-items-center w-9 h-9 rounded-xl text-gray-600 dark:text-gray-300 border border-gray-200/80 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] hover:text-gray-950 dark:hover:text-white hover:border-gray-300 dark:hover:border-white/20 transition-colors"
            aria-label={isDarkAppearance ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDarkAppearance ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkAppearance ? SunIconGlyph : MoonIconGlyph}
          </button>
        </div>
      </div>
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent"
      />
    </div>
  </nav>
)
