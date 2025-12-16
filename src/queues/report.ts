import { Queue } from 'bullmq'
import { bullMqRedisOptions } from '../config/redis.js'

export const reportQueue = new Queue('report-generation', {
  connection: bullMqRedisOptions,
  defaultJobOptions: {
    removeOnComplete: 20,
    removeOnFail: 10,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  },
})