import { createContext, useContext, useEffect, useState } from 'react'

interface ThemeContextValue {
  isDark: boolean
  toggleDark: () => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  toggleDark: () => {},
})

export const useTheme = () => useContext(ThemeContext)

interface Props {
  children: React.ReactNode
}

export const ThemeProvider = ({ children }: Props) => {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('finsight_theme') === 'dark')

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  const toggleDark = () => {
    setIsDark((prev) => {
      const next = !prev
      localStorage.setItem('finsight_theme', next ? 'dark' : 'light')
      return next
    })
  }

  return <ThemeContext.Provider value={{ isDark, toggleDark }}>{children}</ThemeContext.Provider>
}
