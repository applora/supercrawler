# Cronjob Management System

A powerful cronjob management system built with BullMQ, Bull Board, and Hono. This system provides a web interface for managing background jobs, with support for scheduled tasks, job monitoring, and real-time status updates.

## Features

- **Job Management**: Create, schedule, and monitor background jobs
- **Web Dashboard**: Beautiful Bull Board interface for job monitoring
- **REST API**: Comprehensive API for job management
- **Multiple Queue Types**: Email processing, cleanup tasks, and report generation
- **Docker Support**: Ready-to-use Docker configuration
- **TypeScript**: Full TypeScript support with strict type checking

## Quick Start

### Prerequisites

- Node.js 18+
- Redis server
- pnpm (recommended) or npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Start Redis server (if not running)

5. Run the development server:
   ```bash
   pnpm dev
   ```

The application will be available at:
- API: http://localhost:3000
- Bull Board Dashboard: http://localhost:3000/admin/queues
- Health Check: http://localhost:3000/health

## Docker Usage

### Using Docker Compose

1. Start all services:
   ```bash
   docker-compose up -d
   ```

2. View logs:
   ```bash
   docker-compose logs -f
   ```

3. Stop services:
   ```bash
   docker-compose down
   ```

Services available:
- Main application: http://localhost:3000
- Bull Board Dashboard: http://localhost:3000/admin/queues
- Redis Commander (optional): http://localhost:8081

## API Endpoints

### Health Check
- `GET /health` - Check application status

### Email Jobs
- `POST /api/email` - Send an email immediately
- `POST /api/email/delayed` - Send an email with delay

### Cleanup Jobs
- `POST /api/cleanup` - Schedule a cleanup task

### Report Jobs
- `POST /api/report` - Generate a report

### Queue Status
- `GET /api/queues/status` - Get status of all queues
- `GET /api/jobs/:queueName` - Get jobs in a specific queue

## Queue Types

### Email Processing Queue
- Handles email sending tasks
- Supports delayed sending
- Automatic retries with exponential backoff

### Cleanup Tasks Queue
- Manages system cleanup operations
- Supports logs, temp files, cache, and sessions cleanup
- Configurable cleanup age

### Report Generation Queue
- Generates various types of reports
- Supports PDF, CSV, and JSON formats
- Automatic email notifications for completed reports

## Project Structure

```
src/
├── config/
│   └── redis.ts         # Redis configuration
├── queues/
│   ├── index.ts         # Queue setup
│   ├── email.ts         # Email queue
│   ├── cleanup.ts       # Cleanup queue
│   └── report.ts        # Report queue
├── workers/
│   ├── index.ts         # Worker setup
│   ├── email.ts         # Email worker
│   ├── cleanup.ts       # Cleanup worker
│   ├── report.ts        # Report worker
│   └── types.ts         # Worker types
├── routes/
│   └── index.ts         # API routes
├── types/
│   └── index.ts         # Application types
└── index.ts             # Application entry point
```

## Development

### Build
```bash
pnpm build
```

### Production Start
```bash
pnpm start
```

### Environment Variables

See `.env.example` for available configuration options.

## Monitoring

### Bull Board Dashboard
Access the dashboard at `/admin/queues` to:
- View all queues and their status
- Monitor active, waiting, completed, and failed jobs
- Retry failed jobs
- Clean up old jobs
- View job details and logs

### Health Check
Use the `/health` endpoint for application health monitoring.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License