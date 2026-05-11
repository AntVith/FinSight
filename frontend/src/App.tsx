import { useCallback, useContext, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { Navbar } from './components/Navbar/Navbar'
import { RequireAuthenticatedRouteBoundary } from './components/RequireAuth/RequireAuth'
import { RouteErrorBoundary } from './components/RouteErrorBoundary/RouteErrorBoundary'
import { ThemeContext, ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuthenticatedSession } from './context/AuthContext'
import { Connect } from './views/Connect'
import { Dashboard } from './views/Dashboard'
import { Landing } from './views/Landing'
import { Login } from './views/Login'
import { Register } from './views/Register'

const marketingPathnameCollection = new Set(['/', '/login', '/register'])

export const AppRoutesTree = () => {
  const locationPathname = useLocation().pathname
  const navigate = useNavigate()
  const resolvedThemeLayer = useContext(ThemeContext)

  if (!resolvedThemeLayer) {
    throw new Error('ThemeProvider must wrap AppRoutesTree before render')
  }

  const { isDark, toggleDark } = resolvedThemeLayer

  const {
    authenticatedUser,
    signOutAndClearStoredSession,
    enterDemoSandboxSession,
    demoCredentialsConfiguredOnBuild,
  } = useAuthenticatedSession()

  const [marketingSandboxShortcutBusy, setMarketingSandboxShortcutBusy] = useState(false)

  const presentationVariant = marketingPathnameCollection.has(locationPathname)
    ? 'marketing'
    : 'application'

  const handleMarketingSandboxShortcut = useCallback(async () => {
    setMarketingSandboxShortcutBusy(true)
    try {
      await enterDemoSandboxSession()
      navigate('/dashboard', { replace: true })
    } catch {
      window.alert(
        'Demo login failed. provide VITE_DEMO_EMAIL and VITE_DEMO_PASSWORD for a seeded account.'
      )
    } finally {
      setMarketingSandboxShortcutBusy(false)
    }
  }, [enterDemoSandboxSession, navigate])

  const handleTerminateApplicationSession = useCallback(async () => {
    await signOutAndClearStoredSession()
    navigate('/', { replace: true })
  }, [navigate, signOutAndClearStoredSession])

  return (
    <>
      <Navbar
        presentationVariant={presentationVariant}
        isDarkAppearance={isDark}
        onToggleAppearance={toggleDark}
        authenticatedUserMailbox={authenticatedUser?.email}
        onTerminateSessionClicked={
          presentationVariant === 'application' ? handleTerminateApplicationSession : undefined
        }
        sandboxDemoShortcutEnabled={demoCredentialsConfiguredOnBuild}
        sandboxDemoBusy={marketingSandboxShortcutBusy}
        onSandboxDemoShortcutTriggered={
          presentationVariant === 'marketing' ? handleMarketingSandboxShortcut : undefined
        }
      />
      <RouteErrorBoundary>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/connect"
            element={
              <RequireAuthenticatedRouteBoundary>
                <Connect />
              </RequireAuthenticatedRouteBoundary>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuthenticatedRouteBoundary>
                <Dashboard />
              </RequireAuthenticatedRouteBoundary>
            }
          />
        </Routes>
      </RouteErrorBoundary>
    </>
  )
}

export const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutesTree />
      </AuthProvider>
    </ThemeProvider>
  )
}
