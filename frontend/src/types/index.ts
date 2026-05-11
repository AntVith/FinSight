export interface Transaction {
  ID: number
  ItemID: number
  UserID: number
  PlaidTransactionID: string
  Amount: number
  Date: string
  Name: string
  MerchantName: string
  CategoryPrimary: string
  CategoryDetailed: string
  Pending: boolean
}

export interface CategorySummary {
  category: string
  total_amount: number
  count: number
}

export interface Anomaly {
  transaction_id: string
  name: string
  amount: number
  reason: string
}

export interface Insight {
  ID: number
  UserID: number
  Summary: string
  TopCategories: CategorySummary[]
  Anomalies: Anomaly[]
  Recommendations: string[]
  CreatedAt: string
  UpdatedAt: string
}

export interface LinkTokenResponse {
  link_token: string
}

export interface SyncResponse {
  status: string
}

export interface InsightResponse {
  status?: string
  ID?: number
  UserID?: number
  Summary?: string
  TopCategories?: CategorySummary[]
  Anomalies?: Anomaly[]
  Recommendations?: string[]
  CreatedAt?: string
  UpdatedAt?: string
}

export interface AuthenticatedUserSnippet {
  id: number
  email: string
}

/** Login and register bodies share credential fields */
export interface AuthCredentialsPayload {
  email: string
  password: string
}

export interface AuthRegisterPayload extends AuthCredentialsPayload {
  first_name?: string
  last_name?: string
}

/** POST /api/auth/register + /api/auth/login success shape */
export interface AuthTokenEnvelopeResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: AuthenticatedUserSnippet
}

/** POST /api/auth/refresh success shape */
export interface AuthRefreshEnvelopeResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface AuthRefreshRequestPayload {
  refresh_token: string
}

export interface AuthLogoutRequestPayload {
  refresh_token: string
}
