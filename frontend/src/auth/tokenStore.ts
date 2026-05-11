import type { AuthenticatedUserSnippet } from '../types'

const STORAGE_ACCESS_TOKEN = 'finsight_access_token'
const STORAGE_REFRESH_TOKEN = 'finsight_refresh_token'
const STORAGE_USER_SNAPSHOT = 'finsight_user_snapshot'

export const persistAuthSession = (
  accessToken: string,
  refreshToken: string,
  user: AuthenticatedUserSnippet
): void => {
  sessionStorage.setItem(STORAGE_ACCESS_TOKEN, accessToken)
  sessionStorage.setItem(STORAGE_REFRESH_TOKEN, refreshToken)
  sessionStorage.setItem(STORAGE_USER_SNAPSHOT, JSON.stringify(user))
}

export const getStoredAccessToken = (): string | null =>
  sessionStorage.getItem(STORAGE_ACCESS_TOKEN)

export const getStoredRefreshToken = (): string | null =>
  sessionStorage.getItem(STORAGE_REFRESH_TOKEN)

export const readStoredUserSnapshot = (): AuthenticatedUserSnippet | null => {
  const raw = sessionStorage.getItem(STORAGE_USER_SNAPSHOT)
  if (!raw) {
    return null
  }
  try {
    const parsedUnknown: unknown = JSON.parse(raw)
    if (
      typeof parsedUnknown !== 'object' ||
      parsedUnknown === null ||
      !('id' in parsedUnknown) ||
      !('email' in parsedUnknown)
    ) {
      return null
    }
    const candidate = parsedUnknown as { id: unknown; email: unknown }
    if (typeof candidate.id !== 'number' || typeof candidate.email !== 'string') {
      return null
    }
    return { id: candidate.id, email: candidate.email }
  } catch {
    return null
  }
}

export const updateStoredTokensOnly = (
  accessToken: string,
  refreshToken: string
): void => {
  sessionStorage.setItem(STORAGE_ACCESS_TOKEN, accessToken)
  sessionStorage.setItem(STORAGE_REFRESH_TOKEN, refreshToken)
}

export const clearAuthStorage = (): void => {
  sessionStorage.removeItem(STORAGE_ACCESS_TOKEN)
  sessionStorage.removeItem(STORAGE_REFRESH_TOKEN)
  sessionStorage.removeItem(STORAGE_USER_SNAPSHOT)
}
