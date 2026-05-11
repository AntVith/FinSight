import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuthenticatedSession } from '../../context/AuthContext'

interface RouteBoundaryProperties {
  children: ReactElement
}

export const RequireAuthenticatedRouteBoundary = ({
  children,
}: RouteBoundaryProperties) => {
  const locatedPathname = useLocation()
  const { sessionBootstrapFinished, authenticatedUser } = useAuthenticatedSession()

  if (!sessionBootstrapFinished) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Restoring authenticated session"
        className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center"
      >
        <div className="text-center">
          <span className="inline-block w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-gray-500 dark:text-gray-400 text-sm">
            Checking your signed-in session...
          </p>
        </div>
      </div>
    )
  }

  if (!authenticatedUser) {
    const captureReturnTargetEncoded = encodeURIComponent(
      `${locatedPathname.pathname}${locatedPathname.search}`
    )
    return (
      <Navigate to={`/login?returnTo=${captureReturnTargetEncoded}`} replace />
    )
  }

  return children
}
