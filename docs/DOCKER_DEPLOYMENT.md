# Docker Deployment Guide

## 🐳 Docker Setup Complete

### Files Created

1. **`server/Dockerfile`** - Backend Docker image
2. **`server/.dockerignore`** - Exclude unnecessary files
3. **`client/Dockerfile`** - Frontend Docker image
4. **`client/.dockerignore`** - Exclude unnecessary files
5. **`docker-compose.yml`** - Local multi-container setup
6. **`render.yaml`** - Updated for Docker deployment

## 🚀 Deployment Options

### Option 1: Render (Recommended)

#### Prerequisites
- GitHub repository: https://github.com/Cachi0001/teemplot.git
- Render account: https://render.com

#### Steps

1. **Push to GitHub**
```bash
git add .
git commit -m "Add Docker deployment"
git push origin main
```

2. **Connect to Render**
- Go to https://render.com/dashboard
- Click "New +" → "Blueprint"
- Connect your GitHub repository
- Select `teemplot` repository

3. **Render will automatically**:
- Read `render.yaml`
- Build Docker image from `server/Dockerfile`
- Deploy to Frankfurt region
- Set up environment variables
- Configure health checks

4. **Set Environment Variables** (in Render dashboard):
```
DATABASE_URL=<your_supabase_connection_string>
SUPABASE_URL=<your_supabase_url>
SUPABASE_ANON_KEY=<your_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
SMTP_HOST=smtp.gmail.com
SMTP_USER=<your_email>
SMTP_PASSWORD=<your_app_password>
PAYSTACK_SECRET_KEY=<your_paystack_key>
PAYSTACK_PUBLIC_KEY=<your_paystack_public_key>
```

5. **Deploy**
- Render will automatically deploy
- Your API will be available at: `https://teemplot-api.onrender.com`

### Option 2: Local Docker Testing

#### Test Backend Only
```bash
# Build and run backend
cd server
docker build -t teemplot-backend .
docker run -p 5000:5000 --env-file .env teemplot-backend

# Test
curl http://localhost:5000/health
```

#### Test Full Stack
```bash
# Build and run both services
docker-compose up --build

# Access
# Backend: http://localhost:5000
# Frontend: http://localhost:3000

# Stop
docker-compose down
```

### Option 3: Manual Docker Deployment

#### Build Images
```bash
# Backend
cd server
docker build -t teemplot-backend:latest .

# Frontend
cd client
docker build -t teemplot-frontend:latest .
```

#### Push to Registry
```bash
# Tag for Docker Hub
docker tag teemplot-backend:latest yourusername/teemplot-backend:latest
docker tag teemplot-frontend:latest yourusername/teemplot-frontend:latest

# Push
docker push yourusername/teemplot-backend:latest
docker push yourusername/teemplot-frontend:latest
```

#### Deploy to Any Platform
- AWS ECS
- Google Cloud Run
- Azure Container Instances
- DigitalOcean App Platform
- Fly.io

## 📋 Docker Configuration Details

### Backend Dockerfile

**Multi-stage build**:
1. **Builder stage**: Install deps, build TypeScript
2. **Production stage**: Copy built files, production deps only

**Features**:
- Node 20 Alpine (small image size)
- Health check every 30s
- Exposes port 5000
- Production-optimized

**Image size**: ~150MB (optimized)

### Frontend Dockerfile

**Multi-stage build**:
1. **Builder stage**: Install deps, build Next.js
2. **Production stage**: Copy built files, production deps only

**Features**:
- Node 20 Alpine
- Next.js standalone output
- Exposes port 3000
- Production-optimized

**Image size**: ~200MB (optimized)

## 🔧 Environment Variables

### Required for Backend

```env
# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# JWT
JWT_ACCESS_SECRET=<generate_with_openssl>
JWT_REFRESH_SECRET=<generate_with_openssl>

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASSWORD=your_app_password

# Payment
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...

# App
FRONTEND_URL=https://teemplot.vercel.app
CORS_ORIGIN=https://teemplot.vercel.app
NODE_ENV=production
```

### Generate Secrets
```bash
# JWT secrets
openssl rand -base64 32
openssl rand -base64 32
```

## 🏥 Health Checks

### Backend Health Check
```bash
curl http://localhost:5000/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-19T...",
  "database": {
    "primary": "connected",
    "backup": "connected",
    "type": "postgres"
  }
}
```

### Docker Health Check
```bash
# Check container health
docker ps

# Should show "healthy" status
```

## 📊 Resource Requirements

### Render Free Tier
- **750 hours/month** (single instance)
- **512 MB RAM**
- **0.1 CPU**
- **Sufficient for 900+ users** (medium usage)

### Recommended for Production
- **Starter Plan**: $7/month
- **1 GB RAM**
- **0.5 CPU**
- **Better performance**

## 🔍 Monitoring

### Render Dashboard
- View logs in real-time
- Monitor CPU/Memory usage
- Check deployment status
- View health check results

### Application Logs
```bash
# View logs
docker logs <container_id>

# Follow logs
docker logs -f <container_id>

# Last 100 lines
docker logs --tail 100 <container_id>
```

## 🐛 Troubleshooting

### Build Fails

**Issue**: Docker build fails
```bash
# Check Dockerfile syntax
docker build --no-cache -t teemplot-backend ./server

# View build logs
docker build -t teemplot-backend ./server 2>&1 | tee build.log
```

### Container Won't Start

**Issue**: Container exits immediately
```bash
# Check logs
docker logs <container_id>

# Run interactively
docker run -it teemplot-backend sh

# Check environment
docker exec -it <container_id> env
```

### Health Check Fails

**Issue**: Container marked unhealthy
```bash
# Check health
docker inspect <container_id> | grep Health

# Test health endpoint
docker exec -it <container_id> wget -O- http://localhost:5000/health
```

### Database Connection Fails

**Issue**: Can't connect to Supabase
```bash
# Check DATABASE_URL
docker exec -it <container_id> env | grep DATABASE_URL

# Test connection
docker exec -it <container_id> node -e "require('pg').Client({connectionString: process.env.DATABASE_URL}).connect().then(() => console.log('OK'))"
```

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] Secrets generated (JWT)
- [ ] SMTP configured
- [ ] Paystack keys added
- [ ] CORS origin set correctly

### Testing
- [ ] Docker build succeeds
- [ ] Container starts successfully
- [ ] Health check passes
- [ ] Database connection works
- [ ] API endpoints respond
- [ ] Frontend can connect to backend

### Post-Deployment
- [ ] Monitor logs for errors
- [ ] Test registration flow
- [ ] Test onboarding flow
- [ ] Test super admin dashboard
- [ ] Verify email sending
- [ ] Check database queries

## 📝 Quick Commands

```bash
# Build
docker-compose build

# Start
docker-compose up -d

# Stop
docker-compose down

# Logs
docker-compose logs -f

# Restart
docker-compose restart

# Clean up
docker-compose down -v
docker system prune -a
```

## 🎯 Production Deployment Steps

### 1. Prepare Repository
```bash
git add .
git commit -m "Production ready with Docker"
git push origin main
```

### 2. Deploy to Render
- Connect GitHub repo
- Render reads `render.yaml`
- Builds Docker image
- Deploys automatically

### 3. Configure Environment
- Set all environment variables in Render dashboard
- Verify health check endpoint

### 4. Test Deployment
```bash
# Test API
curl https://teemplot-api.onrender.com/health

# Test registration
curl -X POST https://teemplot-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@company.com","password":"Test123!","firstName":"John","lastName":"Doe","companyName":"Test Co"}'
```

### 5. Deploy Frontend
- Deploy to Vercel: `vercel --prod`
- Or use Render (uncomment frontend service in render.yaml)

### 6. Update Frontend API URL
```env
# In Vercel
NEXT_PUBLIC_API_URL=https://teemplot-api.onrender.com/api
```

## ✅ Success Criteria

- [ ] Backend deployed and accessible
- [ ] Health check returns 200 OK
- [ ] Database connected
- [ ] API endpoints working
- [ ] Frontend can call backend
- [ ] No errors in logs

---

**Created**: November 19, 2025
**Status**: ✅ Ready for Deployment
**Platform**: Render (Docker)
**Region**: Frankfurt
