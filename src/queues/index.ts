import { Queue } from 'bullmq'
import { redisOptions } from '../config/redis.js'
import { emailQueue } from './email.js'
import { cleanupQueue } from './cleanup.js'
import { reportQueue } from './report.js'

export function setupQueues() {
  const queues = [
    emailQueue,
    cleanupQueue,
    reportQueue,
  ]

  return { queues }
}

export { emailQueue, cleanupQueue, reportQueue }