import { Worker, Queue } from 'bullmq'
import { bullMqRedisOptions } from '../config/redis.js'
import { Cron } from 'croner'

import type { EmailJobData } from './types.js'

const emailQueue = new Queue('email-processing', {
  connection: bullMqRedisOptions,
})

export const emailWorker = new Worker<EmailJobData>(
  'email-processing',
  async (job) => {
    const { to, subject, body, template, data } = job.data

    // 添加日志到Bull Board UI
    await job.log(`📧 Starting email processing for job ${job.id}`)
    await job.log(`📋 Email details:`)
    await job.log(`   To: ${to}`)
    await job.log(`   Subject: ${subject}`)
    await job.log(`   Template: ${template || 'none'}`)

    if (data) {
      await job.log(`📦 Template data: ${JSON.stringify(data, null, 2)}`)
    }

    // 更新进度
    await job.updateProgress(10)
    await job.log(`⏳ Validating email address...`)

    // 模拟邮件地址验证
    await new Promise(resolve => setTimeout(resolve, 200))

    if (!to.includes('@')) {
      await job.log(`❌ Invalid email address: ${to}`)
      throw new Error(`Invalid email address: ${to}`)
    }

    await job.updateProgress(30)
    await job.log(`✅ Email address validated`)

    await job.updateProgress(40)
    await job.log(`📄 Preparing email content...`)

    // 模拟邮件内容准备
    await new Promise(resolve => setTimeout(resolve, 300))

    let emailContent = body
    if (template && data) {
      await job.log(`🎨 Applying template: ${template}`)
      // 模拟模板处理
      emailContent = `Template: ${template}\nData: ${JSON.stringify(data)}\n\n${body}`
    }

    await job.updateProgress(60)
    await job.log(`📧 Email content prepared (${emailContent.length} characters)`)

    await job.updateProgress(70)
    await job.log(`📮 Connecting to email service...`)

    // 模拟连接邮件服务
    await new Promise(resolve => setTimeout(resolve, 500))

    await job.updateProgress(80)
    await job.log(`📤 Sending email via SMTP server...`)

    // 模拟邮件发送延迟
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    // 模拟发送结果
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    await job.updateProgress(90)
    await job.log(`📨 Email sent successfully!`)
    await job.log(`   Message ID: ${messageId}`)
    await job.log(`   Delivered to: ${to}`)

    await job.updateProgress(100)
    await job.log(`✅ Email processing completed`)

    // 返回结果
    return {
      success: true,
      to,
      subject,
      messageId,
      sentAt: new Date().toISOString(),
      contentLength: emailContent.length,
      template: template || null,
    }
  },
  {
    connection: bullMqRedisOptions,
    concurrency: 5,
  }
)


// Schedule recurring email jobs
const emailReminderJob = new Cron('0 9 * * *', async () => {
  console.log('🔄 Scheduling daily reminder emails')

  // Add daily reminder emails to the queue
  await emailQueue.add(
    'daily-reminder',
    {
      to: 'user@example.com',
      subject: 'Daily Reminder',
      body: 'This is your daily reminder message',
    },
    {
      repeat: {
        pattern: '0 9 * * *', // Daily at 9 AM
      },
    }
  )
})