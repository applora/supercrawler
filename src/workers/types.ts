export interface EmailJobData {
  to: string
  subject: string
  body: string
  template?: string
  data?: Record<string, any>
}

export interface CleanupJobData {
  type: 'logs' | 'temp-files' | 'cache' | 'sessions'
  olderThan?: number // in days
  path?: string
}

export interface ReportJobData {
  type: 'daily' | 'weekly' | 'monthly'
  format: 'pdf' | 'csv' | 'json'
  recipients: string[]
  data?: Record<string, any>
}