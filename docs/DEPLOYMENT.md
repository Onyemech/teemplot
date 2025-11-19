# Teemplot Deployment Guide

## Architecture Overview

### Production Environment (main branch)
- **Frontend**: Vercel (Next.js)
- **Backend**: Render Free Tier
- **Database**: Supabase (Production)
- **Backup/Sync**: Convex (Optional)

### Development Environment (dev branch)
- **Frontend**: Local (localhost:3000)
- **Backend**: Local (localhost:5000)
- **Database**: Local PostgreSQL or Supabase Dev Project

## Branch Strategy

### Main Branch (Production)
- Protected branch
- Requires pull request reviews
- Auto-deploys to production
- Connected to production Supabase

### Dev Branch (Development)
- Active development branch
- Connected to development database
- Safe for testing and experimentation
- Merge to main after thorough testing

## Database Setup

### Production Database (Supabase)
1. Create a Supabase project: https://supabase.com
2. Copy connection string
3. Run schema: `server/database/schema.sql`
4. Enable Row Level Security (RLS)
5. Set up database backups

### Development Database (Option 1: Local PostgreSQL)
```bash
# Install PostgreSQL
# Create database
createdb teemplot_dev

# Run schema
psql teemplot_dev < server/database/schema.sql

# Update .env.development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/teemplot_dev
```

### Development Database (Option 2: Supabase Dev Project)
1. Create separate Supabase project for development
2. Use different connection string
3. Keeps production data safe

## Render Deployment

### Free Tier Limits
- **750 hours/month** on single instance
- **Capacity Analysis**:
  - Low usage (2 min/session): ~22,500 users/month
  - Medium usage (8 min/session): ~5,625 users/month
  - High usage (30 min/session): ~1,500 users/month
- **For 900+ users**: Should be sufficient with medium usage patterns

### Deployment Steps

1. **Connect GitHub Repository**
   ```bash
   git remote add origin https://github.com/Cachi0001/teemplot.git
   git push -u origin main
   ```

2. **Create Render Account**
   - Sign up at https://render.com
   - Connect GitHub account

3. **Create Web Service**
   - Click "New +" → "Web Service"
   - Select teemplot repository
   - Use `render.yaml` (Blueprint)
   - Or manual configuration:
     - **Name**: teemplot-api
     - **Environment**: Node
     - **Region**: Frankfurt (closest to users)
     - **Branch**: main
     - **Build Command**: `cd server && npm install && npm run build`
     - **Start Command**: `cd server && npm start`
     - **Plan**: Free

4. **Configure Environment Variables**
   ```env
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=<your_supabase_connection_string>
   SUPABASE_URL=<your_supabase_url>
   SUPABASE_ANON_KEY=<your_anon_key>
   SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
   JWT_ACCESS_SECRET=<generate_with_openssl>
   JWT_REFRESH_SECRET=<generate_with_openssl>
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=<your_email>
   SMTP_PASSWORD=<your_app_password>
   PAYSTACK_SECRET_KEY=<your_paystack_key>
   FRONTEND_URL=https://teemplot.vercel.app
   CORS_ORIGIN=https://teemplot.vercel.app
   ENABLE_AUTO_CLOCKIN=true
   ENABLE_AUTO_CLOCKOUT=true
   ENABLE_TASK_REVIEW=true
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Check logs for errors

### Generate Secrets
```bash
# JWT Access Secret
openssl rand -base64 32

# JWT Refresh Secret
openssl rand -base64 32
```

## Vercel Deployment (Frontend)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy from Client Directory**
   ```bash
   cd client
   vercel
   ```

3. **Configure Environment Variables**
   ```env
   NEXT_PUBLIC_API_URL=https://teemplot-api.onrender.com/api
   ```

4. **Production Deployment**
   ```bash
   vercel --prod
   ```

## Convex Setup (Optional - Backup & Real-time)

1. **Create Convex Account**
   - Sign up at https://convex.dev

2. **Initialize Convex**
   ```bash
   cd server
   npx convex dev
   ```

3. **Configure Sync**
   - Set up Supabase → Convex sync
   - Use for real-time features
   - Backup strategy

## Data Isolation & Security

### Multi-Tenancy
- All queries filtered by `company_id`
- Row Level Security (RLS) enabled
- Partitioned tables for performance

### Security Measures
1. **Database Level**
   - RLS policies per company
   - Encrypted connections (SSL)
   - Regular backups

2. **Application Level**
   - JWT authentication
   - Role-based access control
   - Input validation (Zod)
   - SQL injection prevention

3. **Network Level**
   - CORS configuration
   - Rate limiting
   - Helmet security headers

## Monitoring & Logging

### Render Monitoring
- Built-in metrics dashboard
- CPU, Memory, Network usage
- Request logs
- Error tracking

### Application Logging
- Pino logger with levels
- Separate files for errors
- Smart logging (detects localhost vs production)
- Log rotation

### Health Checks
```bash
# Check API health
curl https://teemplot-api.onrender.com/api/health

# Check database connection
curl https://teemplot-api.onrender.com/api/health/db
```

## Performance Optimization

### Database
- Partitioned tables (users, attendance, audit_logs)
- Strategic indexing
- Connection pooling
- Materialized views for dashboards

### Backend
- Fastify (high performance)
- Response caching
- Gzip compression
- Async/await patterns

### Frontend
- Next.js App Router
- Server components
- Image optimization
- Code splitting

## Scaling Strategy

### When to Scale
- Monitor Render metrics
- If approaching 750 hours/month
- Response times > 500ms
- Error rate > 1%

### Scaling Options
1. **Upgrade Render Plan** ($7/month for Starter)
2. **Add Read Replicas** (Supabase)
3. **Implement Caching** (Redis)
4. **CDN for Static Assets**
5. **Load Balancer** (multiple instances)

## Backup Strategy

### Database Backups
1. **Supabase Automatic Backups**
   - Daily backups (retained 7 days)
   - Point-in-time recovery

2. **Manual Backups**
   ```bash
   # Export database
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
   
   # Restore database
   psql $DATABASE_URL < backup_20241116.sql
   ```

3. **Convex Sync** (Optional)
   - Real-time backup
   - Separate data store

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check connection string
   echo $DATABASE_URL
   
   # Test connection
   psql $DATABASE_URL -c "SELECT 1"
   ```

2. **Render Service Not Starting**
   - Check build logs
   - Verify environment variables
   - Check package.json scripts

3. **CORS Errors**
   - Verify CORS_ORIGIN matches frontend URL
   - Check Vercel deployment URL

4. **Auto Clock-in/out Not Working**
   - Check cron job logs
   - Verify company timezone settings
   - Check working_days configuration

## Development Workflow

### Local Development
```bash
# Start development database
docker-compose up -d postgres

# Start backend
cd server
npm run dev

# Start frontend
cd client
npm run dev
```

### Testing Before Deployment
```bash
# Run tests
npm test

# Check TypeScript
npm run type-check

# Lint code
npm run lint

# Build production
npm run build
```

### Deployment Checklist
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Backup created
- [ ] Monitoring enabled
- [ ] Health checks passing

## Cost Estimation

### Free Tier (Current)
- **Render**: Free (750 hours/month)
- **Supabase**: Free (500MB database, 2GB bandwidth)
- **Vercel**: Free (100GB bandwidth)
- **Total**: $0/month

### Paid Tier (When Scaling)
- **Render Starter**: $7/month
- **Supabase Pro**: $25/month
- **Vercel Pro**: $20/month
- **Total**: ~$52/month

## Support & Maintenance

### Regular Tasks
- Monitor error logs daily
- Check performance metrics weekly
- Update dependencies monthly
- Database optimization quarterly
- Security audits quarterly

### Emergency Contacts
- **Database Issues**: Supabase Support
- **Hosting Issues**: Render Support
- **Frontend Issues**: Vercel Support

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Last Updated**: November 16, 2024
**Version**: 1.0.0
