interface Props {
  onDisconnect: () => void
  isDark: boolean
  toggleDark: () => void
}

export const Navbar = ({ onDisconnect, isDark, toggleDark }: Props) => {
  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
      <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">FinSight</span>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleDark}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Toggle dark mode"
        >
          {isDark ? '☀️' : '🌙'}
        </button>
        <button
          onClick={onDisconnect}
          className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg transition-colors"
        >
          Disconnect
        </button>
      </div>
    </nav>
  )
}
