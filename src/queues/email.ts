import { Queue } from 'bullmq'
import { bullMqRedisOptions } from '../config/redis.js'

export const emailQueue = new Queue('email-processing', {
  connection: bullMqRedisOptions,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    delay: 1000,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})