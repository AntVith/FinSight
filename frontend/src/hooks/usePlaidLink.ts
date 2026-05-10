import { useCallback, useEffect, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { exchangePublicToken, fetchLinkToken } from '../api/client'

interface UsePlaidLinkReturn {
  isReady: boolean
  isLoading: boolean
  error: string | null
  open: () => void
}

export const usePlaidLinkHook = (onSuccess: () => void): UsePlaidLinkReturn => {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getLinkToken = async () => {
      try {
        setIsLoading(true)
        const data = await fetchLinkToken()
        setLinkToken(data.link_token)
      } catch (err) {
        setError('Failed to initialize Plaid Link. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    getLinkToken()
  }, [])

  const handleSuccess = useCallback(
    async (publicToken: string, metadata: any) => {
      try {
        setIsLoading(true)
        await exchangePublicToken(publicToken, metadata.institution.name)
        onSuccess()
      } catch (err) {
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
    open,
  }
}