# Complete Testing Guide - Onboarding Flow

## 🎯 What We're Testing

### Full Onboarding Flow:
1. ✅ Registration (create company + admin user)
2. ✅ Email verification
3. ✅ Login
4. ✅ Dashboard access

## 🚀 Setup Before Testing

### 1. Start Backend Server
```bash
cd server
npm install
npm run dev

# Should see:
# ✅ Server listening on http://localhost:5000
# ✅ Database connected: Development mode
# ✅ Using SQLite
```

### 2. Start Frontend Server
```bash
cd client
npm install
npm run dev

# Should see:
# ✅ Ready on http://localhost:3000
```

### 3. Verify Environment
```bash
# Backend .env should have:
NODE_ENV=development
SQLITE_PATH=./data/teemplot.db
JWT_ACCESS_SECRET=dev_jwt_access_secret
JWT_REFRESH_SECRET=dev_jwt_refresh_secret

# Frontend .env.local should have:
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 📝 Test Cases

### Test 1: Registration Flow ✅

#### Step 1: Navigate to Registration
```
URL: http://localhost:3000/onboarding/register
```

#### Step 2: Fill Form
```
First Name: John
Last Name: Doe
Email: john@testcompany.com
Password: SecurePass123!
Confirm Password: SecurePass123!
Company Name: Test Company Inc
Industry: Technology
Company Size: 11-50
```

#### Step 3: Submit
```
Click "Create Account"
```

#### Expected Result:
```
✅ Redirects to: /onboarding/verify?email=john@testcompany.com
✅ Backend creates:
   - Company record
   - Admin user record
✅ Password is hashed (bcrypt)
✅ Email verification required
```

#### Verify in Database:
```bash
# Check SQLite database
cd server
sqlite3 data/teemplot.db

# Check company
SELECT * FROM companies WHERE email = 'john@testcompany.com';

# Check user
SELECT id, email, first_name, role, email_verified FROM users WHERE email = 'john@testcompany.com';

# Should see:
# - Company created with unique slug
# - User created with role='admin'
# - email_verified=false
```

---

### Test 2: Email Verification ✅

#### Step 1: On Verification Page
```
URL: /onboarding/verify?email=john@testcompany.com
```

#### Step 2: Enter Code
```
Code: 123456 (any 6 digits for now)
```

#### Expected Result:
```
✅ Email marked as verified
✅ Redirects to: /dashboard
```

#### Verify in Database:
```sql
SELECT email_verified FROM users WHERE email = 'john@testcompany.com';
-- Should be: 1 (true)
```

---

### Test 3: Login Flow ✅

#### Step 1: Navigate to Login
```
URL: http://localhost:3000/onboarding/login
```

#### Step 2: Enter Credentials
```
Email: john@testcompany.com
Password: SecurePass123!
```

#### Step 3: Submit
```
Click "Sign In"
```

#### Expected Result:
```
✅ JWT token generated
✅ User data returned
✅ Redirects to: /dashboard
✅ Token stored (localStorage/cookie)
```

---

### Test 4: Dashboard Access ✅

#### Step 1: Navigate to Dashboard
```
URL: http://localhost:3000/dashboard
```

#### Expected Result:
```
✅ Dashboard loads
✅ Sidebar visible
✅ User info displayed
✅ Stats cards visible
```

---

## 🧪 API Testing (Manual)

### Test Registration API
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User",
    "companyName": "Test Company"
  }'

# Expected Response:
{
  "success": true,
  "data": {
    "userId": "uuid",
    "companyId": "uuid",
    "email": "test@example.com",
    "verificationRequired": true
  },
  "message": "Registration successful. Please verify your email."
}
```

### Test Verification API
```bash
curl -X POST http://localhost:5000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'

# Expected Response:
{
  "success": true,
  "message": "Email verified successfully"
}
```

### Test Login API
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'

# Expected Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "firstName": "Test",
      "lastName": "User",
      "role": "admin",
      "companyId": "uuid"
    }
  }
}
```

---

## 🔍 Debugging

### Check Backend Logs
```bash
cd server
tail -f logs/app.log

# Look for:
# [INFO] Registration successful
# [INFO] Email verified
# [INFO] User logged in
```

### Check Database State
```bash
cd server
sqlite3 data/teemplot.db

# List all tables
.tables

# Check companies
SELECT * FROM companies;

# Check users
SELECT * FROM users;

# Exit
.quit
```

### Check Frontend Console
```
Open browser DevTools (F12)
Go to Console tab

# Look for:
# - API request logs
# - Error messages
# - Network requests
```

---

## ❌ Common Issues & Solutions

### Issue 1: "Cannot connect to database"
```bash
# Solution: Check if backend is running
cd server
npm run dev

# Check .env file
cat .env | grep DATABASE
```

### Issue 2: "Registration failed"
```bash
# Solution: Check backend logs
cd server
tail -f logs/app.log

# Check if SQLite database exists
ls -la data/teemplot.db
```

### Issue 3: "Email already registered"
```bash
# Solution: Delete test user
cd server
sqlite3 data/teemplot.db
DELETE FROM users WHERE email = 'test@example.com';
DELETE FROM companies WHERE email = 'test@example.com';
.quit
```

### Issue 4: "Invalid credentials"
```bash
# Solution: Verify password is correct
# Or reset database:
cd server
rm data/teemplot.db
npm run dev  # Will recreate database
```

### Issue 5: "CORS error"
```bash
# Solution: Check CORS_ORIGIN in backend .env
CORS_ORIGIN=http://localhost:3000

# Restart backend
npm run dev
```

---

## ✅ Success Criteria

### Registration:
- [x] Form validation works
- [x] Company created in database
- [x] Admin user created
- [x] Password hashed
- [x] Redirects to verification

### Verification:
- [x] Code input works
- [x] Email marked as verified
- [x] Redirects to dashboard

### Login:
- [x] Credentials validated
- [x] JWT token generated
- [x] User data returned
- [x] Redirects to dashboard

### Dashboard:
- [x] Protected route works
- [x] User info displayed
- [x] Navigation works

---

## 📊 Test Results Template

```
Date: ___________
Tester: ___________

Registration:
[ ] Form loads correctly
[ ] Validation works
[ ] Submission successful
[ ] Database records created
[ ] Redirects to verification

Verification:
[ ] Page loads with email
[ ] Code input works
[ ] Verification successful
[ ] Redirects to dashboard

Login:
[ ] Form loads correctly
[ ] Credentials validated
[ ] Token generated
[ ] Redirects to dashboard

Dashboard:
[ ] Page loads
[ ] User info displayed
[ ] Navigation works

Issues Found:
1. ___________
2. ___________

Notes:
___________
```

---

## 🚀 Next Steps After Testing

1. ✅ Fix any bugs found
2. ✅ Add email sending (SMTP)
3. ✅ Add proper JWT middleware
4. ✅ Add password reset flow
5. ✅ Add Google OAuth
6. ✅ Deploy to production

---

**Ready to test!** Start with Test 1 and work through each step. 🎯
