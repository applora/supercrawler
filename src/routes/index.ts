import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { emailQueue } from '../queues/index.js'
import { cleanupQueue } from '../queues/index.js'
import { reportQueue } from '../queues/index.js'
import type { EmailJobData, CleanupJobData, ReportJobData } from '../workers/types.js'

export const apiRoutes = new Hono()

// Schemas for validation
const emailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  template: z.string().optional(),
  data: z.record(z.any()).optional(),
})

const cleanupSchema = z.object({
  type: z.enum(['logs', 'temp-files', 'cache', 'sessions']),
  olderThan: z.number().min(1).max(365).optional(),
  path: z.string().optional(),
})

const reportSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly']),
  format: z.enum(['pdf', 'csv', 'json']),
  recipients: z.array(z.string().email()),
  data: z.record(z.any()).optional(),
})

const delaySchema = z.object({
  delay: z.number().min(0),
})

// Email routes
apiRoutes.post('/email', zValidator('json', emailSchema), async (c) => {
  const emailData = c.req.valid('json') as EmailJobData

  const job = await emailQueue.add('send-email', emailData)

  return c.json({
    success: true,
    jobId: job.id,
    message: 'Email job queued successfully',
  })
})

apiRoutes.post('/email/delayed', zValidator('json', emailSchema.extend(delaySchema.shape)), async (c) => {
  const { delay, ...emailData } = c.req.valid('json') as EmailJobData & { delay: number }

  const job = await emailQueue.add('send-email', emailData, {
    delay: delay * 1000, // Convert to milliseconds
  })

  return c.json({
    success: true,
    jobId: job.id,
    message: `Email job queued with ${delay} seconds delay`,
  })
})

// Cleanup routes
apiRoutes.post('/cleanup', zValidator('json', cleanupSchema), async (c) => {
  const cleanupData = c.req.valid('json') as CleanupJobData

  const job = await cleanupQueue.add('cleanup', cleanupData)

  return c.json({
    success: true,
    jobId: job.id,
    message: 'Cleanup job queued successfully',
  })
})

// Report routes
apiRoutes.post('/report', zValidator('json', reportSchema), async (c) => {
  const reportData = c.req.valid('json') as ReportJobData

  const job = await reportQueue.add('generate-report', reportData)

  return c.json({
    success: true,
    jobId: job.id,
    message: 'Report generation job queued successfully',
  })
})

// Queue status routes
apiRoutes.get('/queues/status', async (c) => {
  const queues = [emailQueue, cleanupQueue, reportQueue]

  const status = await Promise.all(
    queues.map(async (queue) => {
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
      ])

      return {
        name: queue.name,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      }
    })
  )

  return c.json({
    queues: status,
    timestamp: new Date().toISOString(),
  })
})

// Job management routes
apiRoutes.get('/jobs/:queueName', async (c) => {
  const { queueName } = c.req.param()

  let queue
  switch (queueName) {
    case 'email-processing':
      queue = emailQueue
      break
    case 'cleanup-tasks':
      queue = cleanupQueue
      break
    case 'report-generation':
      queue = reportQueue
      break
    default:
      return c.json({ error: 'Queue not found' }, 404)
  }

  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaiting(),
    queue.getActive(),
    queue.getCompleted(),
    queue.getFailed(),
  ])

  return c.json({
    queueName,
    waiting: waiting.slice(0, 10), // Limit to 10 items
    active: active.slice(0, 10),
    completed: completed.slice(0, 10),
    failed: failed.slice(0, 10),
  })
})