import { Worker, Queue } from 'bullmq'
import { bullMqRedisOptions } from '../config/redis.js'
import type { ReportJobData } from './types.js'

const emailQueue = new Queue('email-processing', {
  connection: bullMqRedisOptions,
})

export const reportWorker = new Worker<ReportJobData>(
  'report-generation',
  async (job) => {
    const { type, format, recipients, data } = job.data
    job.updateProgress(10)

    job.log(`📊 Generating ${type} report in ${format} format`)

    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 5000))
    job.updateProgress(40)
    const reportData = {
      id: `report_${Date.now()}`,
      type,
      format,
      generatedAt: new Date().toISOString(),
      size: Math.floor(Math.random() * 1000000) + 100000, // bytes
      data: data || {
        totalUsers: Math.floor(Math.random() * 10000),
        activeUsers: Math.floor(Math.random() * 5000),
        revenue: Math.floor(Math.random() * 100000),
      },
    }
    job.log(`✅ Report generated: ${reportData.id}`)

    // Schedule email notification
    if (recipients.length > 0) {
      await emailQueue.add('send-report-email', {
        to: recipients.join(','),
        subject: `${type.charAt(0).toUpperCase() + type.slice(1)} Report Ready`,
        body: `Your ${type} report is ready. Report ID: ${reportData.id}`,
      })
    }
    job.updateProgress(100)

    return reportData
  },
  {
    connection: bullMqRedisOptions,
    concurrency: 3,
  }
)