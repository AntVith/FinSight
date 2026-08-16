import { NavLink } from 'react-router-dom'

const tabs = [
  { label: 'Overview', to: '/dashboard', end: true },
  { label: 'Transactions', to: '/dashboard/transactions', end: false },
  { label: 'Accounts', to: '/dashboard/accounts', end: false },
] as const

export const DashboardSubNav = () => (
  <div className="backdrop-blur-2xl backdrop-saturate-150 bg-white/85 dark:bg-[#0b0e1a]/85 border-b border-gray-200/60 dark:border-white/[0.07]">
    <nav
      aria-label="Dashboard sections"
      className="max-w-7xl mx-auto flex gap-1 px-4 sm:px-6 lg:px-8"
    >
      {tabs.map(({ label, to, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            [
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              isActive
                ? 'border-brand-600 text-brand-700 dark:text-brand-300 dark:border-brand-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200',
            ].join(' ')
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  </div>
)
