/** Registered by AuthProvider inside React Router; defaults to location.assign fallback. */

type AuthExpiredNavigator = () => void

let activeNavigator: AuthExpiredNavigator | null = null

export function registerAuthExpiredNavigator(handler: AuthExpiredNavigator) {
  activeNavigator = handler
}

export function unregisterAuthExpiredNavigator(handler: AuthExpiredNavigator) {
  if (activeNavigator === handler) {
    activeNavigator = null
  }
}

export function triggerAuthExpiredNavigator() {
  if (activeNavigator) {
    activeNavigator()
    return
  }
  window.location.assign('/login')
}
