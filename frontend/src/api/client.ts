import axios from 'axios'
import type { InsightResponse, LinkTokenResponse, SyncResponse, Transaction } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API error:', error.response?.data?.error || error.message)
    return Promise.reject(error)
  }
)

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
  const response = await api.get<Transaction[]>('/api/transactions')
  return response.data
}

export const fetchInsights = async (): Promise<InsightResponse> => {
  const response = await api.get<InsightResponse>('/api/insights')
  return response.data
}