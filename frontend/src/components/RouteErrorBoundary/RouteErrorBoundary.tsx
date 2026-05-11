import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface RouteErrorBoundaryProps {
  children: ReactNode
}

interface RouteErrorBoundaryState {
  capturedRenderError: Error | null
}

/**
 * Top-level boundary that traps unexpected render-time errors so the entire app
 * does not white-screen. We log the error for debugging and offer the user a
 * single recovery affordance (reload). Intentionally minimal so it works even
 * when the design system has not finished hydrating.
 */
export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { capturedRenderError: null }

  static getDerivedStateFromError(thrownError: Error): RouteErrorBoundaryState {
    return { capturedRenderError: thrownError }
  }

  componentDidCatch(thrownError: Error, errorInfo: ErrorInfo): void {
    console.error('[RouteErrorBoundary] render error captured', thrownError, errorInfo)
  }

  handleReloadEntireDocument = (): void => {
    window.location.reload()
  }

  handleReturnToLanding = (): void => {
    window.location.assign('/')
  }

  render(): ReactNode {
    if (!this.state.capturedRenderError) {
      return this.props.children
    }

    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-gray-50 dark:bg-[#0b0e1a] text-gray-900 dark:text-gray-100">
        <div className="max-w-md w-full surface-card p-8 text-center">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-brand-600 dark:text-brand-300 mb-3">
            Something went sideways
          </p>
          <h1 className="text-2xl font-semibold mb-2">FinSight hit an unexpected error.</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            We logged the details. Reloading usually clears it. If it keeps happening, jump back to
            the landing page and we will re-hydrate session from scratch.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={this.handleReloadEntireDocument}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand-600 to-purple-600 text-white text-sm font-semibold shadow-md hover:opacity-95 transition"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={this.handleReturnToLanding}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/5 transition"
            >
              Back to landing
            </button>
          </div>
        </div>
      </main>
    )
  }
}
