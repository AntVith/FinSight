/** Returns a same-app relative path only; rejects open redirects. */
export const sanitizePostAuthReturnPath = (candidate: string | null | undefined): string => {
  if (!candidate) {
    return '/dashboard'
  }

  let decodedPath = candidate
  try {
    decodedPath = decodeURIComponent(candidate)
  } catch {
    return '/dashboard'
  }

  decodedPath = decodedPath.trim()
  if (!decodedPath.startsWith('/')) {
    return '/dashboard'
  }
  if (decodedPath.startsWith('//')) {
    return '/dashboard'
  }
  if (decodedPath.includes('://') || decodedPath.includes('\\')) {
    return '/dashboard'
  }

  return decodedPath
}
