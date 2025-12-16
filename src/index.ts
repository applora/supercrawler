import { Hono } from 'hono'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { Queue } from 'bullmq'
import { HonoAdapter } from '@bull-board/hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import './config/redis.js'
import { setupQueues } from './queues/index.js'
import { setupWorkers } from './workers/index.js'
import { apiRoutes } from './routes/index.js'
import { serveStatic } from '@hono/node-server/serve-static'

const app = new Hono()

// Middleware
app.use('*', cors())
app.use('*', logger())

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.route('/api', apiRoutes)

// Setup Bull Board
const serverAdapter = new HonoAdapter(serveStatic)

const { queues } = setupQueues()
createBullBoard({
  queues: queues.map((queue: Queue) => new BullMQAdapter(queue)),
  serverAdapter,
})

// Set base path for Bull Board and register routes
serverAdapter.setBasePath('/admin')
app.route('/admin', serverAdapter.registerPlugin())

// Start workers
setupWorkers()

// Start server
const port = process.env.PORT || 3000
console.log(`🚀 Server running on port ${port}`)
console.log(`📊 Bull Board available at http://localhost:${port}/admin`)

serve({
  fetch: app.fetch,
  port: Number(port),
})
