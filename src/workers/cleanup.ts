import { Worker } from 'bullmq'
import { bullMqRedisOptions } from '../config/redis.js'
import type { CleanupJobData } from './types.js'

export const cleanupWorker = new Worker<CleanupJobData>(
  'cleanup-tasks',
  async (job) => {
    const { type, olderThan = 7, path } = job.data

    console.log(`🧹 Starting cleanup task: ${type}`)

    // Simulate cleanup work
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))

    switch (type) {
      case 'logs':
        console.log(`📝 Cleaning up logs older than ${olderThan} days`)
        break
      case 'temp-files':
        console.log(`🗂️ Cleaning up temporary files`)
        break
      case 'cache':
        console.log(`💾 Clearing cache data`)
        break
      case 'sessions':
        console.log(`👥 Cleaning up expired sessions`)
        break
    }

    console.log(`✅ Cleanup task ${type} completed`)

    return {
      success: true,
      type,
      cleanedAt: new Date().toISOString(),
    }
  },
  {
    connection: bullMqRedisOptions,
    concurrency: 2,
  }
)