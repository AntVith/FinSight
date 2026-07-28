import axios, { AxiosError } from 'axios'
import type { AxiosRequestConfig } from 'axios'

import {
  clearAuthStorage,
  getStoredAccessToken,
  getStoredRefreshToken,
  persistAuthSession,
  readStoredUserSnapshot,
  updateStoredTokensOnly,
} from '../auth/tokenStore'
import { triggerAuthExpiredNavigator } from '../auth/authExpiredNavigator'

import type {
  AuthLogoutRequestPayload,
  AuthCredentialsPayload,
  AuthRefreshEnvelopeResponse,
  AuthRefreshRequestPayload,
  AuthRegisterPayload,
  AuthTokenEnvelopeResponse,
  AuthenticatedUserSnippet,
  InsightResponse,
  LinkTokenResponse,
  SyncResponse,
  Transaction,
} from '../types'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

type AxiosRequestWithRetryFlag = AxiosRequestConfig & {
  _retryHandled?: boolean
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const refreshIsolationClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

let mutexRefreshInflight: Promise<boolean> | null = null

const performSilentTokenRefresh = async (): Promise<boolean> => {
  const refreshTokenPlain = getStoredRefreshToken()
  if (!refreshTokenPlain) {
    clearAuthStorage()
    return false
  }

  try {
    const { data } = await refreshIsolationClient.post<AuthRefreshEnvelopeResponse>(
      '/api/auth/refresh',
      { refresh_token: refreshTokenPlain } satisfies AuthRefreshRequestPayload
    )
    updateStoredTokensOnly(data.access_token, data.refresh_token)
    return true
  } catch {
    clearAuthStorage()
    return false
  }
}

const enqueueSingleFlightRefresh = (): Promise<boolean> => {
  if (!mutexRefreshInflight) {
    mutexRefreshInflight = performSilentTokenRefresh().finally(() => {
      mutexRefreshInflight = null
    })
  }
  return mutexRefreshInflight
}

api.interceptors.request.use((config) => {
  const requestPath = typeof config.url === 'string' ? config.url : ''
  const pathSegment = requestPath.includes('http')
    ? new URL(requestPath).pathname
    : requestPath

  const isPublicAuthRoute =
    pathSegment.includes('/api/auth/login') ||
    pathSegment.includes('/api/auth/register') ||
    pathSegment.includes('/api/auth/refresh') ||
    pathSegment.includes('/api/auth/logout')

  const accessPlain = getStoredAccessToken()
  if (accessPlain && config.headers && !isPublicAuthRoute) {
    config.headers.Authorization = `Bearer ${accessPlain}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalConfiguration = error.config as AxiosRequestWithRetryFlag | undefined

    if (!originalConfiguration) {
      return Promise.reject(error)
    }

    const respondedStatus = error.response?.status

    if (import.meta.env.DEV) {
      console.error(
        'API error:',
        (error.response?.data as { error?: string } | undefined)?.error || error.message
      )
    }

    if (respondedStatus !== 401) {
      return Promise.reject(error)
    }

    const requestPath = typeof originalConfiguration.url === 'string' ? originalConfiguration.url : ''
    const pathSegment = requestPath.includes('http') ? new URL(requestPath).pathname : requestPath

    if (
      pathSegment.includes('/api/auth/login') ||
      pathSegment.includes('/api/auth/register') ||
      pathSegment.includes('/api/health')
    ) {
      return Promise.reject(error)
    }

    if (pathSegment.includes('/api/auth/refresh')) {
      clearAuthStorage()
      triggerAuthExpiredNavigator()
      return Promise.reject(error)
    }

    if (pathSegment.includes('/api/auth/logout')) {
      return Promise.reject(error)
    }

    if (originalConfiguration._retryHandled) {
      clearAuthStorage()
      triggerAuthExpiredNavigator()
      return Promise.reject(error)
    }

    originalConfiguration._retryHandled = true
    const refreshSucceeded = await enqueueSingleFlightRefresh()

    if (!refreshSucceeded || !originalConfiguration.headers) {
      triggerAuthExpiredNavigator()
      return Promise.reject(error)
    }

    originalConfiguration.headers.Authorization = `Bearer ${getStoredAccessToken()}`
    return api(originalConfiguration)
  }
)

export const registerAccount = async (payload: AuthRegisterPayload): Promise<AuthTokenEnvelopeResponse> => {
  const response = await api.post<AuthTokenEnvelopeResponse>('/api/auth/register', payload)
  return response.data
}

export const loginWithCredentials = async (
  payload: AuthCredentialsPayload
): Promise<AuthTokenEnvelopeResponse> => {
  const response = await api.post<AuthTokenEnvelopeResponse>('/api/auth/login', payload)
  return response.data
}

export const logoutRevokingRefreshServerSide = async (): Promise<void> => {
  const refreshTokenPlain = getStoredRefreshToken()
  if (!refreshTokenPlain) {
    clearAuthStorage()
    return
  }
  const logoutRequestBody: AuthLogoutRequestPayload = { refresh_token: refreshTokenPlain }
  try {
    await refreshIsolationClient.post('/api/auth/logout', logoutRequestBody)
  } catch {
    // Best-effort revoke; still purge local credentials
  }
  clearAuthStorage()
}

export const fetchLinkToken = async (): Promise<LinkTokenResponse> => {
  const response = await api.get<LinkTokenResponse>('/api/link/token')
  return response.data
}

export const exchangePublicToken = async (
  publicToken: string,
  institutionName: string
): Promise<void> => {
  await api.post('/api/link/exchange', {
    public_token: publicToken,
    institution_name: institutionName,
  })
}

export const syncTransactions = async (): Promise<SyncResponse> => {
  const response = await api.post<SyncResponse>('/api/transactions/sync')
  return response.data
}

export const fetchTransactions = async (): Promise<Transaction[]> => {
  const response = await api.get<Transaction[] | null>('/api/transactions')
  return Array.isArray(response.data) ? response.data : []
}

export const fetchInsights = async (): Promise<InsightResponse> => {
  const response = await api.get<InsightResponse>('/api/insights')
  return response.data
}

/** Hydrates React auth state; tokens live in storage. */
export const readPersistedAuthBootstrap = (): {
  accessToken: string | null
  refreshToken: string | null
  userSnapshot: ReturnType<typeof readStoredUserSnapshot>
} => ({
  accessToken: getStoredAccessToken(),
  refreshToken: getStoredRefreshToken(),
  userSnapshot: readStoredUserSnapshot(),
})

/** Persists envelopes returned from register/login (or refreshed tokens with prior user snapshot). */
export const applyAuthenticatedEnvelope = (
  envelope: AuthTokenEnvelopeResponse | AuthRefreshEnvelopeResponse,
  fallbackUserSnapshot: AuthenticatedUserSnippet | null
): AuthenticatedUserSnippet => {
  const nextUserSnippet: AuthenticatedUserSnippet | null =
    'user' in envelope && envelope.user
      ? { id: envelope.user.id, email: envelope.user.email }
      : fallbackUserSnapshot

  if (!nextUserSnippet) {
    clearAuthStorage()
    throw new Error('Missing authenticated user identification')
  }

  persistAuthSession(envelope.access_token, envelope.refresh_token, nextUserSnippet)
  return nextUserSnippet
}
