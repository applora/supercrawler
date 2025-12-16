# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive job management system built with BullMQ, Bull Board, and Hono that provides:
- **BullMQ** - Robust job queue management with Redis backend
- **Bull Board** - Web UI for monitoring queues and jobs
- **Hono** - Fast HTTP framework for API endpoints
- **Croner** - Job scheduling and automation
- **TypeScript** with strict type checking and modern ESNext target

## Development Commands

### Core Development
```bash
# Development (with tsx runtime and auto-reload)
pnpm dev

# Build TypeScript to JavaScript
pnpm build

# Production start (runs compiled JavaScript)
pnpm start
```

### Docker Development
```bash
# Start Redis container and development server
./dev.sh

# Stop Redis container
./stop-dev.sh

# Docker Compose operations
pnpm docker:run     # Start all services with docker-compose
pnpm docker:stop    # Stop all services
pnpm docker:logs    # View logs
pnpm docker:build   # Build Docker image
```

### API Testing
```bash
# Test API endpoints with example requests
pnpm test-api
```

### Production Deployment
The project is configured for production with:
- Docker multi-stage builds
- Redis for job persistence
- Optional PM2 process management

```bash
# For production with PM2 (after building)
pm2 start dist/index.js

# Monitor processes
pm2 monit

# View logs
pm2 logs

# Stop processes
pm2 stop all
```

## Architecture Overview

The system follows a **producer-consumer pattern** with multiple specialized queues:

```
API Request → Queue → Worker → Result
     ↓           ↓        ↓
   Routes → BullMQ → Job Processing → Response
```

### Core Components

- **Queues**: Task containers for different job types (email, cleanup, reports, long-running)
- **Workers**: Process jobs from queues with specific concurrency and retry logic
- **Scheduler**: Manages time-based job scheduling with Croner
- **API**: RESTful endpoints for job management
- **Bull Board**: Web UI for monitoring and debugging

## Project Structure

```
src/
├── config/
│   └── redis.ts         # Redis connection configuration
├── queues/
│   ├── index.ts         # Queue exports and setup
│   ├── email.ts         # Email processing queue
│   ├── cleanup.ts       # System cleanup queue
│   ├── report.ts        # Report generation queue
│   └── long-running.ts  # Long-running task queue
├── workers/
│   ├── index.ts         # Worker setup and event handlers
│   ├── email.ts         # Email processing worker
│   ├── cleanup.ts       # Cleanup task worker
│   ├── report.ts        # Report generation worker
│   └── types.ts         # Worker type definitions
├── schedulers/
│   └── index.ts         # Job scheduling system with Croner
├── routes/
│   └── index.ts         # API routes and job management
├── types/
│   └── index.ts         # Application type definitions
├── index.ts             # Application entry point
└── examples/
    └── api-usage.js     # API usage examples
```

## Queue and Worker Configuration

### Queue Types and Their Purpose

1. **Email Queue (`email-processing`)**
   - Purpose: Handle email sending tasks
   - Concurrency: 5 workers
   - Retries: 3 attempts with exponential backoff
   - Retention: 100 completed, 50 failed jobs

2. **Cleanup Queue (`cleanup-tasks`)**
   - Purpose: System cleanup operations (logs, temp files, cache, sessions)
   - Concurrency: 2 workers (resource-intensive)
   - Retries: 2 attempts
   - Retention: 50 completed, 25 failed jobs

3. **Report Queue (`report-generation`)**
   - Purpose: Generate daily/weekly/monthly reports
   - Concurrency: 3 workers
   - Retries: 3 attempts
   - Retention: 20 completed, 10 failed jobs

4. **Long-Running Queue (`long-running-tasks`)**
   - Purpose: Handle tasks that take hours or days
   - TTL: 7 days (7 * 24 * 60 * 60 * 1000 ms)
   - Retries: 1 (no retry for long tasks)
   - Retention: Minimal to save Redis memory

### Job Timeout Settings

```typescript
// Default timeout options
{
  ttl: 60000,              // 1 minute for normal jobs
  removeOnComplete: 100,   // Keep 100 completed jobs
  removeOnFail: 50,        // Keep 50 failed jobs
  attempts: 3,            // Retry 3 times
  backoff: {
    type: 'exponential',
    delay: 2000,
  }
}

// Long-running job options
{
  ttl: 7 * 24 * 60 * 60 * 1000,  // 7 days
  removeOnComplete: 10,
  removeOnFail: 5,
  attempts: 1,                // No retry for long jobs
}
```

## TypeScript Configuration

The project uses strict TypeScript settings including:
- `strict: true` - All strict type-checking options enabled
- `noUncheckedIndexedAccess: true` - Prevents unsafe array/object access
- `exactOptionalPropertyTypes: true` - Strict optional property handling
- `verbatimModuleSyntax: true` - Explicit import/export syntax (.js extensions required)
- Target: ESNext with Node.js modules
- Output: `./dist` directory

## Development Environment

### Required Services
- **Redis Server**: Required for BullMQ job persistence and communication
  - Development: Use `./dev.sh` to start Redis container
  - Production: Configure via `REDIS_URL` environment variable

### Environment Variables
Key environment variables (see `.env.example`):
- `PORT`: Server port (default: 3000)
- `REDIS_URL`: Redis connection string (default: redis://localhost:6379)
- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)

## Development Notes

- The project is set up as an ES module (`"type": "module"`)
- Import statements require `.js` extensions due to `verbatimModuleSyntax`
- Redis configuration requires `maxRetriesPerRequest: null` for BullMQ
- Each queue has dedicated workers for optimal performance and isolation
- Job logs are automatically added to Bull Board UI using `job.log()`
- Progress tracking available with `job.updateProgress()`

## API Endpoints

### Health Check
- `GET /health` - Application status

### Job Management
- `POST /api/email` - Send email immediately
- `POST /api/email/delayed` - Send email with delay
- `POST /api/cleanup` - Schedule cleanup task
- `POST /api/report` - Generate report

### Queue Monitoring
- `GET /api/queues/status` - Get all queue statuses
- `GET /api/jobs/:queueName` - Get jobs in specific queue

### Scheduler Management
- `GET /api/scheduler/status` - Get scheduled jobs status
- `POST /api/scheduler/job/:name/execute` - Execute scheduled job manually
- `POST /api/scheduler/job/:name/toggle` - Enable/disable scheduled job

### Bull Board UI
- Access at `/admin` - Job monitoring and management interface

## Testing

- Use `pnpm test-api` to test API functionality
- Check Bull Board UI at `http://localhost:3000/admin` for job monitoring
- Monitor Redis connection and job processing in console logs