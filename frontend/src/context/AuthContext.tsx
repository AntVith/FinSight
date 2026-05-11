/* eslint-disable react-refresh/only-export-components -- context module exports provider + consumer hook */
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'

import {
  registerAccount,
  applyAuthenticatedEnvelope,
  loginWithCredentials,
  logoutRevokingRefreshServerSide,
  readPersistedAuthBootstrap,
} from '../api/client'
import { registerAuthExpiredNavigator } from '../auth/authExpiredNavigator'
import type { AuthCredentialsPayload, AuthRegisterPayload, AuthenticatedUserSnippet } from '../types'

interface AuthSessionContextValueShape {
  sessionBootstrapFinished: boolean
  authenticatedUser: AuthenticatedUserSnippet | null
  signInWithPassword: (payload: AuthCredentialsPayload) => Promise<void>
  signUpWithCredentials: (payload: AuthRegisterPayload) => Promise<void>
  enterDemoSandboxSession: () => Promise<void>
  signOutAndClearStoredSession: () => Promise<void>
  demoCredentialsConfiguredOnBuild: boolean
}

const AuthSessionRuntimeContextBundle = createContext<AuthSessionContextValueShape | undefined>(
  undefined
)

interface AuthShellProperties {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthShellProperties) => {
  const navigateReplace = useNavigate()
  const [bootstrapFinishedHydration, setBootstrapFinishedHydration] = useState(false)
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUserSnippet | null>(
    null
  )

  useEffect(() => {
    const bootstrapTimerHandle = window.setTimeout(() => {
      const { accessToken, userSnapshot } = readPersistedAuthBootstrap()
      if (accessToken && userSnapshot) {
        setAuthenticatedUser(userSnapshot)
      }
      setBootstrapFinishedHydration(true)
    }, 0)
    return () => window.clearTimeout(bootstrapTimerHandle)
  }, [])

  useEffect(() => {
    function forwardExpiredNavigatorToRouter() {
      setAuthenticatedUser(null)
      navigateReplace('/login', { replace: true })
    }

    registerAuthExpiredNavigator(forwardExpiredNavigatorToRouter)
  }, [navigateReplace])

  const signInWithPassword = useCallback(async (payload: AuthCredentialsPayload) => {
    const tokenEnvelopeResponse = await loginWithCredentials(payload)
    const hydratedUserSnippet = applyAuthenticatedEnvelope(tokenEnvelopeResponse, null)
    setAuthenticatedUser(hydratedUserSnippet)
  }, [])

  const signUpWithCredentials = useCallback(async (payload: AuthRegisterPayload) => {
    const registrationEnvelopeResponse = await registerAccount(payload)
    const hydratedUserSnippet = applyAuthenticatedEnvelope(registrationEnvelopeResponse, null)
    setAuthenticatedUser(hydratedUserSnippet)
  }, [])

  const signOutAndClearStoredSession = useCallback(async () => {
    await logoutRevokingRefreshServerSide()
    setAuthenticatedUser(null)
  }, [])

  const demoMailbox = import.meta.env.VITE_DEMO_EMAIL?.trim() ?? ''
  const demoPasswordPlain = import.meta.env.VITE_DEMO_PASSWORD ?? ''
  const demoCredentialsConfiguredOnBuild = demoMailbox !== '' && demoPasswordPlain !== ''

  const enterDemoSandboxSession = useCallback(async () => {
    if (!demoCredentialsConfiguredOnBuild) {
      throw new Error('Demo credentials are not configured. set VITE_DEMO_EMAIL and VITE_DEMO_PASSWORD')
    }
    await signInWithPassword({
      email: demoMailbox,
      password: demoPasswordPlain,
    })
  }, [demoCredentialsConfiguredOnBuild, demoMailbox, demoPasswordPlain, signInWithPassword])

  const outboundContextMemo = useMemo(
    (): AuthSessionContextValueShape => ({
      sessionBootstrapFinished: bootstrapFinishedHydration,
      authenticatedUser,
      signInWithPassword,
      signUpWithCredentials,
      enterDemoSandboxSession,
      signOutAndClearStoredSession,
      demoCredentialsConfiguredOnBuild,
    }),
    [
      authenticatedUser,
      bootstrapFinishedHydration,
      demoCredentialsConfiguredOnBuild,
      enterDemoSandboxSession,
      signInWithPassword,
      signOutAndClearStoredSession,
      signUpWithCredentials,
    ]
  )

  return (
    <AuthSessionRuntimeContextBundle.Provider value={outboundContextMemo}>
      {children}
    </AuthSessionRuntimeContextBundle.Provider>
  )
}

export const useAuthenticatedSession = (): AuthSessionContextValueShape => {
  const bundle = useContext(AuthSessionRuntimeContextBundle)
  if (!bundle) {
    throw new Error('useAuthenticatedSession must wrap AuthProvider')
  }
  return bundle
}
