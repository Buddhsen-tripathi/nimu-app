# Workers Setup Instructions

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Install globally with `npm install -g wrangler`
3. **Veo3 API Key**: Get from [Veo3](https://veo3.com) (if using Veo3)

## Step 1: Cloudflare Authentication

```bash
# Login to Cloudflare
wrangler login

# Verify authentication
wrangler whoami
```

## Step 2: Create R2 Bucket

```bash
# Create R2 bucket for video storage
wrangler r2 bucket create nimu-videos

# Create development bucket
wrangler r2 bucket create nimu-videos-dev

# List buckets to verify
wrangler r2 bucket list
```

## Step 3: Configure R2 Access Keys

```bash
# Create R2 API token
wrangler r2 api-token create "nimu-worker-token" --permissions object:write,object:read

# Note down the Access Key ID and Secret Access Key
# Add these to your .dev.vars file:
# R2_ACCESS_KEY_ID=your_access_key_id
# R2_SECRET_ACCESS_KEY=your_secret_access_key
```

## Step 4: Set Up Cloudflare Secrets

```bash
# Set production secrets (these are encrypted)
wrangler secret put DATABASE_URL
# Enter your production database URL when prompted

wrangler secret put VEO3_API_KEY
# Enter your Veo3 API key when prompted

wrangler secret put JWT_SECRET
# Enter a secure JWT secret when prompted

wrangler secret put AUTH_SECRET
# Enter a secure auth secret when prompted

# List secrets to verify
wrangler secret list
```

## Step 5: Update wrangler.toml

Update the `wrangler.toml` file with your account ID:

```toml
# Get your account ID from Cloudflare dashboard
# or run: wrangler whoami
```

## Step 6: Test Configuration

```bash
# Test local development
npm run dev

# Test deployment to development
npm run deploy:dev

# Test deployment to production
npm run deploy:prod
```

## Environment Variables Reference

### Development (.dev.vars)

```env
DATABASE_URL=postgresql://username:password@localhost:5432/nimu_dev
VEO3_API_KEY=your_veo3_api_key_here
JWT_SECRET=your_jwt_secret_for_development_only
AUTH_SECRET=your_auth_secret_for_development_only
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
```

### Production (Cloudflare Secrets)

- `DATABASE_URL` - Production PostgreSQL connection string
- `VEO3_API_KEY` - Production Veo3 API key
- `JWT_SECRET` - Secure JWT secret for production
- `AUTH_SECRET` - Secure auth secret for production

## Troubleshooting

### Common Issues

1. **Authentication Error**: Run `wrangler login` again
2. **Bucket Not Found**: Verify bucket exists with `wrangler r2 bucket list`
3. **Permission Denied**: Check R2 API token permissions
4. **Secret Not Found**: Verify secrets with `wrangler secret list`

### Getting Help

- Cloudflare Docs: [developers.cloudflare.com](https://developers.cloudflare.com)
- Wrangler CLI: [github.com/cloudflare/wrangler](https://github.com/cloudflare/wrangler)
- R2 Documentation: [developers.cloudflare.com/r2](https://developers.cloudflare.com/r2)
