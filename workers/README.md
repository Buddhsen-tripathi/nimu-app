# Nimu Generation Worker

Cloudflare Worker for handling video generation requests using Durable Objects and R2 storage.

## Overview

This worker replaces the BullMQ + Redis architecture with Cloudflare's serverless platform, providing:

- **Durable Objects** for job state management
- **R2 Storage** for video file storage
- **Global edge deployment** for low latency
- **Automatic scaling** without infrastructure management
- **Cost-effective** operation

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js API   │───▶│  Cloudflare      │───▶│   R2 Storage    │
│   Routes        │    │  Worker          │    │   (Videos)      │
└─────────────────┘    │  + Durable Objs  │    └─────────────────┘
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   PostgreSQL     │
                       │   (Generation    │
                       │    Records)      │
                       └──────────────────┘
```

## Features

- **Job Management**: Create, track, and manage generation jobs
- **Queue System**: Prioritized job processing with Durable Objects
- **File Storage**: R2 integration for video upload/download
- **Real-time Updates**: Progress tracking and status updates
- **Authentication**: JWT-based authentication
- **Error Handling**: Comprehensive error handling and retry logic
- **Monitoring**: Built-in logging and analytics

## Getting Started

### Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI installed globally

### Installation

```bash
# Install dependencies
npm install

# Install Wrangler globally (if not already installed)
npm install -g wrangler
```

### Configuration

1. Copy `.dev.vars.example` to `.dev.vars` and fill in your values:

```bash
cp .dev.vars.example .dev.vars
```

2. Update `wrangler.toml` with your Cloudflare account details:

```toml
name = "your-worker-name"
compatibility_date = "2024-01-15"
```

3. Create R2 bucket:

```bash
wrangler r2 bucket create nimu-videos
```

### Development

```bash
# Start development server
npm run dev

# Build the project
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

### Deployment

```bash
# Deploy to development
npm run deploy:dev

# Deploy to production
npm run deploy:prod
```

## API Endpoints

### Generations

- `POST /api/generations` - Create generation request
- `GET /api/generations/:id` - Get generation status
- `POST /api/generations/:id/clarify` - Submit clarification
- `POST /api/generations/:id/confirm` - Confirm generation
- `PUT /api/generations/:id/status` - Update generation status

### Queue Management

- `GET /api/queue/jobs/:id` - Get job status
- `POST /api/queue/workers` - Worker management
- `GET /api/queue/stats` - Get queue statistics

### Storage

- `GET /api/storage/videos/:id` - Get video URL
- `DELETE /api/storage/videos/:id` - Delete video
- `POST /api/storage/videos/:id/signed-url` - Generate signed URL

## Durable Objects

### JobManager

Manages individual generation jobs with state persistence:

- Job creation and tracking
- Progress updates
- Error handling and retries
- Job completion and cleanup

### QueueManager

Handles job queue coordination:

- Job prioritization
- Worker coordination
- Queue statistics
- Load balancing

## Environment Variables

### Required

- `DATABASE_URL` - PostgreSQL connection string
- `VEO3_API_KEY` - Veo3 API key for video generation
- `JWT_SECRET` - Secret for JWT token validation
- `R2_ACCESS_KEY_ID` - R2 access key
- `R2_SECRET_ACCESS_KEY` - R2 secret key

### Optional

- `MAX_CONCURRENT_JOBS` - Maximum concurrent jobs (default: 3)
- `JOB_TIMEOUT` - Job timeout in milliseconds (default: 300000)
- `CLEANUP_RETENTION_DAYS` - Days to retain completed jobs (default: 7)

## Monitoring

The worker includes built-in monitoring through:

- Cloudflare Analytics
- Structured logging
- Error tracking
- Performance metrics

## Security

- JWT-based authentication
- Input validation and sanitization
- Rate limiting
- CORS configuration
- Secure environment variable handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
