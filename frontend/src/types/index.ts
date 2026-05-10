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