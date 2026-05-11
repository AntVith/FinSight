import { useCallback, useEffect, useState } from 'react'
import { usePlaidLink, type PlaidLinkOnSuccessMetadata } from 'react-plaid-link'
import { exchangePublicToken, fetchLinkToken } from '../api/client'

interface UsePlaidLinkReturn {
  isReady: boolean
  isLoading: boolean
  error: string | null
  open: () => void
}

export const usePlaidLinkHook = (onSuccess: () => void | Promise<void>): UsePlaidLinkReturn => {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getLinkToken = async () => {
      try {
        setIsLoading(true)
        const data = await fetchLinkToken()
        setLinkToken(data.link_token)
      } catch {
        setError('Failed to initialize Plaid Link. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    getLinkToken()
  }, [])

  const handleSuccess = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      try {
        setIsLoading(true)
        const institutionLabel =
          metadata.institution?.name?.trim() || 'Linked institution'
        await exchangePublicToken(publicToken, institutionLabel)
        await onSuccess()
      } catch {
        setError('Failed to link account. Please try again.')
      } finally {
        setIsLoading(false)
      }
    },
    [onSuccess]
  )

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess,
  })

  return {
    isReady: ready,
    isLoading,
    error,
    open: () => {
      open()
    },
  }
}