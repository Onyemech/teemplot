# Vercel Backend Deployment Setup

## Required Environment Variables

Go to your Vercel project → Settings → Environment Variables and add:

### Database (Supabase)
```
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_KEY=[your-service-key]
```

### Authentication
```
JWT_SECRET=[generate-random-string]
JWT_REFRESH_SECRET=[generate-random-string]
GOOGLE_CLIENT_ID=[your-google-client-id]
GOOGLE_CLIENT_SECRET=[your-google-client-secret]
GOOGLE_CALLBACK_URL=https://teemplot-backend.vercel.app/api/auth/google/callback
```

### API Keys
```
GOOGLE_MAPS_API_KEY=[your-google-maps-key]
CLOUDINARY_CLOUD_NAME=[your-cloudinary-name]
CLOUDINARY_API_KEY=[your-cloudinary-key]
CLOUDINARY_API_SECRET=[your-cloudinary-secret]
```

### Email (Optional)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=[your-email]
SMTP_PASS=[your-app-password]
EMAIL_FROM=[your-email]
```

### Application
```
NODE_ENV=production
DATABASE_TYPE=postgres
PORT=5000
FRONTEND_URL=https://your-frontend.vercel.app
ENABLE_AUTO_CLOCKIN=false
ENABLE_AUTO_CLOCKOUT=false
```

## Important Notes

1. **Don't enable auto-attendance on serverless** - Cron jobs don't work in serverless functions
2. **Set all variables for Production environment**
3. **Redeploy after adding variables**

## Testing Deployment

After deployment, test these endpoints:

```bash
# Health check
curl https://teemplot-backend.vercel.app/health

# Should return:
# {"success":true,"message":"Server is running","timestamp":"...","environment":"production"}
```

## Common Issues

### "Serverless Function has crashed"
- Check Vercel logs for specific error
- Ensure all environment variables are set
- Verify DATABASE_URL is correct

### "Cannot find module"
- Vercel automatically handles TypeScript
- Make sure all imports use relative paths
- Check that all dependencies are in package.json

### Database Connection Errors
- Verify Supabase connection string
- Check if Supabase project is active
- Ensure connection pooling is enabled

## Logs

View logs in Vercel:
1. Go to your project
2. Click "Deployments"
3. Click on latest deployment
4. Click "Functions" tab
5. Click on "api/index"
6. View real-time logs
