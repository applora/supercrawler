export interface JobStatus {
  id: string
  name: string
  data: any
  opts?: any
  progress?: number
  returnvalue?: any
  failedReason?: string
  finishedOn?: number
  processedOn?: number
}

export interface QueueStatus {
  name: string
  waiting: number
  active: number
  completed: number
  failed: number
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}