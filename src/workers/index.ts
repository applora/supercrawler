import { Worker } from 'bullmq'
import { redisOptions } from '../config/redis.js'
import { emailWorker } from './email.js'
import { cleanupWorker } from './cleanup.js'
import { reportWorker } from './report.js'

export function setupWorkers() {
  console.log('🏗️  Setting up workers...')

  const workers = [
    emailWorker,
    cleanupWorker,
    reportWorker,
  ]

  workers.forEach(worker => {
    worker.on('error', (err) => {
      console.error(`Worker ${worker.name} error:`, err)
    })

    worker.on('completed', (job) => {
      console.log(`✅ Job ${job.id} in queue ${job.queueName} completed`)
    })

    worker.on('failed', (job, err) => {
      console.error(`❌ Job ${job?.id} in queue ${job?.queueName} failed:`, err)
    })
  })

  console.log('✅ Workers ready!')
  return workers
}