# Frontend Security Guide

## Environment Variables

### ✅ Safe to Expose (VITE_ prefix)

These variables are **intentionally public** and bundled into your JavaScript:

#### 1. API URL (`VITE_API_URL`)
```env
VITE_API_URL=https://api.teemplot.com/api
```
- **Why it's safe**: The browser needs to know where to send requests
- **Protection**: Backend validates all requests with authentication
- **Best practice**: Use HTTPS in production

#### 2. Supabase Anon Key (`VITE_SUPABASE_ANON_KEY`)
```env
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```
- **Why it's safe**: Designed to be public (it's called "anon" for anonymous)
- **Protection**: Row Level Security (RLS) policies protect your data
- **Best practice**: Always enable RLS on all tables

#### 3. Google Maps API Key (`VITE_GOOGLE_MAPS_API_KEY`)
```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
```
- **Why it's safe**: Meant for client-side use
- **Protection**: Restrict by domain in Google Cloud Console
- **Best practice**: 
  - Add domain restrictions (e.g., `*.teemplot.com`)
  - Enable only required APIs (Places, Geocoding)
  - Set usage quotas

#### 4. Google OAuth Client ID (`VITE_GOOGLE_CLIENT_ID`)
```env
VITE_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
```
- **Why it's safe**: OAuth client IDs are public by design
- **Protection**: Client secret stays on backend
- **Best practice**: Configure authorized redirect URIs

---

## ❌ NEVER Expose These

These should **ONLY** be on the backend (no VITE_ prefix):

### Backend Environment Variables
```env
# Database
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_KEY=eyJhbGc...  # Service role key (full access!)

# Authentication
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# OAuth Secrets
GOOGLE_CLIENT_SECRET=GOCSPX-...

# API Keys with write access
CLOUDINARY_API_SECRET=...
STRIPE_SECRET_KEY=sk_live_...
```

---

## Security Best Practices

### 1. API Key Restrictions

#### Google Maps API Key
In Google Cloud Console:
1. Go to Credentials
2. Edit your API key
3. Add **Application restrictions**:
   - HTTP referrers: `https://teemplot.com/*`, `https://*.teemplot.com/*`
4. Add **API restrictions**:
   - Only enable: Maps JavaScript API, Places API, Geocoding API

#### Supabase
1. Enable Row Level Security (RLS) on all tables
2. Create policies for each role (anon, authenticated)
3. Never use service role key in frontend

### 2. Content Security Policy (CSP)

Add to your `index.html` or server headers:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://maps.googleapis.com; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:; 
               connect-src 'self' https://api.teemplot.com https://*.supabase.co;">
```

### 3. HTTPS Only

Always use HTTPS in production:
```env
# ✅ Good
VITE_API_URL=https://api.teemplot.com/api

# ❌ Bad (only for local development)
VITE_API_URL=http://api.teemplot.com/api
```

### 4. Environment-Specific Configs

Use different `.env` files:

```bash
.env                 # Default (committed to git, no secrets)
.env.local           # Local overrides (gitignored)
.env.development     # Development (gitignored)
.env.production      # Production (set in Vercel dashboard)
```

### 5. Validate on Backend

**Never trust client data!** Always validate on the backend:

```typescript
// ❌ Bad - trusting client
app.post('/api/users', (req, res) => {
  const { role } = req.body; // Client could send role: 'admin'!
  createUser({ ...req.body, role });
});

// ✅ Good - validate on backend
app.post('/api/users', authenticate, (req, res) => {
  const { name, email } = req.body;
  const role = req.user.role === 'admin' ? req.body.role : 'employee';
  createUser({ name, email, role });
});
```

---

## Checking for Exposed Secrets

### 1. Check Your Bundle

Build your app and search for secrets:
```bash
npm run build
grep -r "sk_live_" dist/  # Search for Stripe secret keys
grep -r "service_role" dist/  # Search for Supabase service keys
```

### 2. Use Git Secrets Scanner

Install and run:
```bash
npm install -g git-secrets
git secrets --scan
```

### 3. Review Environment Variables

List all VITE_ variables:
```bash
grep "VITE_" .env*
```

Make sure none contain:
- Passwords
- Secret keys
- Service role keys
- Private API keys

---

## What to Do If You Exposed a Secret

### 1. Rotate Immediately
- Generate new keys/secrets
- Update in your backend environment
- Revoke old keys

### 2. Check Git History
```bash
# Search git history for secrets
git log -p | grep "SECRET_KEY"

# If found, use BFG Repo-Cleaner or git-filter-repo
```

### 3. Notify Users (if applicable)
- If user data was at risk, notify affected users
- Document the incident
- Implement additional monitoring

---

## Monitoring & Alerts

### 1. Set Up Usage Alerts

For Google Maps API:
- Set daily quotas
- Enable billing alerts
- Monitor usage in Google Cloud Console

For Supabase:
- Monitor database connections
- Set up alerts for unusual activity
- Review auth logs regularly

### 2. Log Security Events

On your backend:
```typescript
// Log suspicious activity
logger.warn({
  type: 'suspicious_activity',
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  reason: 'Multiple failed login attempts'
});
```

---

## Quick Security Checklist

- [ ] All secrets are on backend only (no VITE_ prefix)
- [ ] Google Maps API key has domain restrictions
- [ ] Supabase RLS is enabled on all tables
- [ ] Using HTTPS in production
- [ ] CSP headers configured
- [ ] Backend validates all user input
- [ ] Secrets are in `.gitignore`
- [ ] Different configs for dev/prod
- [ ] Usage quotas set for APIs
- [ ] Monitoring and alerts enabled

---

## Resources

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Google API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
