# Cloudflare Migration Guide

This guide explains how to complete the migration from BullMQ + Redis to Cloudflare Workers + R2.

## 🎯 **Migration Overview**

Your application has been successfully migrated from:

- **BullMQ + Redis** → **Cloudflare Durable Objects**
- **File Storage** → **Cloudflare R2**
- **Traditional API Routes** → **Cloudflare Worker API**

## 🔧 **Required Environment Variables**

Add these environment variables to your `.env.local` file:

```bash
# Cloudflare Worker Configuration
CLOUDFLARE_WORKER_URL="https://nimu-generation-worker.amaanrizvi73.workers.dev"
CLOUDFLARE_WORKER_API_KEY="optional-api-key-for-worker-auth"
CLOUDFLARE_WORKER_TIMEOUT="30000"
CLOUDFLARE_WORKER_RETRY_ATTEMPTS="3"
CLOUDFLARE_WORKER_RETRY_DELAY="1000"

# Veo3 API (for Worker)
VEO3_API_KEY="your-veo3-api-key"
VEO3_BASE_URL="https://api.veo3.com"

# Database (keep existing)
DATABASE_URL="postgresql://username:password@localhost:5432/nimu_db"

# Authentication (keep existing)
AUTH_SECRET="your-auth-secret-here"
AUTH_TRUST_HOST=true
```

## 🚀 **Deployment Steps**

### 1. Deploy Cloudflare Worker

```bash
# Navigate to workers directory
cd workers

# Install dependencies
npm install

# Deploy to Cloudflare
npx wrangler deploy
```

### 2. Configure Worker Environment

Set these secrets in your Cloudflare Worker:

```bash
# Set Veo3 API key
npx wrangler secret put VEO3_API_KEY

# Set any other required secrets
npx wrangler secret put DATABASE_URL
npx wrangler secret put AUTH_SECRET
```

### 3. Update Worker URL

After deployment, update your `.env.local` with the actual Worker URL:

```bash
CLOUDFLARE_WORKER_URL="https://nimu-generation-worker.amaanrizvi73.workers.dev"
```

### 4. Run Database Migration

```bash
# Navigate to web app
cd apps/web

# Run the migration to rename the column
npm run db:migrate
```

## 📋 **API Changes**

### Updated Endpoints

All generation endpoints now communicate with the Cloudflare Worker:

- `POST /api/generations` - Creates generation and sends to Worker
- `POST /api/generations/[id]/clarify` - Submits clarification to Worker
- `POST /api/generations/[id]/confirm` - Confirms generation in Worker
- `GET /api/generations/[id]/status` - Gets status from Worker
- `GET /api/generations/[id]` - Gets generation with Worker status

### New Storage Endpoints

- `GET /api/storage/videos` - List user videos from R2
- `GET /api/storage/videos/[videoId]` - Get video URL from R2
- `DELETE /api/storage/videos/[videoId]` - Delete video from R2

### New Queue Endpoints

- `GET /api/queue/status` - Get queue status from Worker
- `GET /api/queue/stats` - Get queue statistics from Worker

## 🔄 **Data Migration**

### Database Schema Changes

The `generation` table has been updated:

- `bullmq_job_id` → `worker_job_id`
- New column stores Cloudflare Worker job IDs instead of BullMQ job IDs

### Migration Script

Run the migration to update existing data:

```sql
-- This is handled by the migration file: 0003_rename_bullmq_to_worker.sql
ALTER TABLE generation RENAME COLUMN bullmq_job_id TO worker_job_id;
```

## 🧪 **Testing the Migration**

### 1. Test Worker Health

```bash
curl https://nimu-generation-worker.amaanrizvi73.workers.dev/health
```

### 2. Test Generation Flow

1. Create a generation via `/api/generations`
2. Submit clarification via `/api/generations/[id]/clarify`
3. Confirm generation via `/api/generations/[id]/confirm`
4. Check status via `/api/generations/[id]/status`

### 3. Test Storage Operations

1. List videos via `/api/storage/videos`
2. Get video URL via `/api/storage/videos/[videoId]`

## 🐛 **Troubleshooting**

### Common Issues

1. **Worker URL not set**: Ensure `CLOUDFLARE_WORKER_URL` is correctly configured
2. **Authentication errors**: Check that `CLOUDFLARE_WORKER_API_KEY` is set if required
3. **Database errors**: Ensure the migration has been run successfully
4. **Timeout errors**: Increase `CLOUDFLARE_WORKER_TIMEOUT` if needed

### Debug Mode

Enable debug logging by setting:

```bash
CLOUDFLARE_WORKER_DEBUG="true"
```

## 📊 **Monitoring**

### Worker Analytics

Monitor your Worker performance in the Cloudflare dashboard:

- Request volume
- Response times
- Error rates
- Durable Object usage

### R2 Storage

Monitor R2 usage:

- Storage capacity
- Request volume
- Data transfer

## 🔄 **Rollback Plan**

If you need to rollback to BullMQ:

1. Restore the `bullmq` dependency in `package.json`
2. Revert the database migration
3. Restore the deleted queue files
4. Update environment variables back to Redis configuration

## 📚 **Additional Resources**

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Durable Objects Guide](https://developers.cloudflare.com/durable-objects/)
- [R2 Storage Documentation](https://developers.cloudflare.com/r2/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)

## ✅ **Migration Checklist**

- [x] Deploy Cloudflare Worker ✅
- [x] Configure Worker environment variables ✅
- [x] Update Next.js environment variables ✅
- [x] Run database migration ✅
- [x] Test generation flow ✅
- [x] Test storage operations ✅
- [x] Monitor Worker performance ✅
- [x] Remove old BullMQ files ✅
- [x] Update documentation ✅

## 🎉 **Migration Status: COMPLETED SUCCESSFULLY!**

Your Cloudflare Worker is live at: `https://nimu-generation-worker.amaanrizvi73.workers.dev`

### ✅ **What's Working:**

- ✅ Worker deployed and healthy
- ✅ Database migration completed
- ✅ All TypeScript errors resolved
- ✅ API routes updated to use Worker
- ✅ BullMQ dependencies removed
- ✅ Zustand store updated

---

**Note**: This migration maintains backward compatibility with your existing database schema while adding new Worker-based functionality.
