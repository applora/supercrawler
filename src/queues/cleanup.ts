import { Queue } from 'bullmq'
import { bullMqRedisOptions } from '../config/redis.js'

export const cleanupQueue = new Queue('cleanup-tasks', {
  connection: bullMqRedisOptions,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
})