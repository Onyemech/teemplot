# Quick Setup Guide - Advanced Features

## 🚀 Getting Started

### 1. Database Migration

Run the updated schema to add new columns:

```bash
# Connect to your database
psql $DATABASE_URL

# Or for Supabase, use SQL Editor
```

Copy and run the updated `server/database/schema.sql` file.

### 2. Environment Variables

Add to your `.env` file:

```env
# Email Configuration (Required for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@teemplot.com

# Feature Flags
ENABLE_AUTO_CLOCKIN=true
ENABLE_AUTO_CLOCKOUT=true
ENABLE_TASK_REVIEW=true

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

### 3. Gmail App Password Setup

1. Go to Google Account Settings
2. Security → 2-Step Verification (enable if not already)
3. App Passwords → Generate new password
4. Copy password to `SMTP_PASSWORD`

### 4. Install Dependencies

```bash
cd server
npm install node-cron nodemailer
npm install --save-dev @types/node-cron @types/nodemailer
```

### 5. Configure Company Settings

#### Via SQL
```sql
UPDATE companies
SET 
  -- Working hours
  work_start_time = '09:00:00',
  work_end_time = '17:00:00',
  grace_period_minutes = 15,
  
  -- Working days
  working_days = '{
    "monday": true,
    "tuesday": true,
    "wednesday": true,
    "thursday": true,
    "friday": true,
    "saturday": false,
    "sunday": false
  }'::jsonb,
  
  -- Auto attendance
  auto_clockin_enabled = true,
  auto_clockout_enabled = true,
  
  -- Geofencing (Lagos, Nigeria example)
  office_latitude = 6.5244,
  office_longitude = 3.3792,
  geofence_radius_meters = 100,
  require_geofence_for_clockin = true,
  
  -- Notifications
  notify_early_departure = true,
  early_departure_threshold_minutes = 30
WHERE id = 'your-company-id';
```

#### Via API (Future)
```http
PUT /api/companies/:id/settings
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "workStartTime": "09:00:00",
  "workEndTime": "17:00:00",
  "officeLatitude": 6.5244,
  "officeLongitude": 3.3792,
  "geofenceRadiusMeters": 100
}
```

## 📍 Getting Office Coordinates

### Method 1: Google Maps
1. Open Google Maps
2. Right-click on your office location
3. Click on coordinates to copy
4. Format: `latitude, longitude`

### Method 2: GPS Device
Use any GPS-enabled device at your office location.

### Method 3: Address Geocoding
Use a geocoding service to convert address to coordinates.

## 🧪 Testing

### Test Geofencing

#### 1. Test Clock-In (Within Range)
```bash
curl -X POST http://localhost:5000/api/attendance/clock-in \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "location": {
      "latitude": 6.5244,
      "longitude": 3.3792
    }
  }'
```

**Expected:** Success ✅

#### 2. Test Clock-In (Outside Range)
```bash
curl -X POST http://localhost:5000/api/attendance/clock-in \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "location": {
      "latitude": 6.5300,
      "longitude": 3.3900
    }
  }'
```

**Expected:** Error - "You must be within 100m of the office" ❌

### Test Early Departure

#### 1. Clock In
```bash
curl -X POST http://localhost:5000/api/attendance/clock-in \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"location": {"latitude": 6.5244, "longitude": 3.3792}}'
```

#### 2. Clock Out Early (before work_end_time - threshold)
```bash
curl -X POST http://localhost:5000/api/attendance/clock-out \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"location": {"latitude": 6.5244, "longitude": 3.3792}}'
```

**Expected:** 
- Success with warning message
- Admin receives email notification 📧
- Admin receives push notification 🔔

### Test Task Review

#### 1. Staff Marks Task Complete
```bash
curl -X POST http://localhost:5000/api/tasks/TASK_ID/complete \
  -H "Authorization: Bearer STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actualHours": 5.5,
    "completionNotes": "All requirements met"
  }'
```

#### 2. Admin Reviews Task
```bash
curl -X POST http://localhost:5000/api/tasks/TASK_ID/review \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "approved": true,
    "reviewNotes": "Great work!"
  }'
```

## 🔧 Troubleshooting

### Auto Clock-In Not Working

**Check:**
1. Is `auto_clockin_enabled = true`?
2. Is today a working day in `working_days`?
3. Is current time within grace period?
4. Are there employees without attendance records today?

**Debug:**
```bash
# Check cron job logs
tail -f logs/app.log | grep "Auto clock"

# Manual trigger
curl -X POST http://localhost:5000/api/admin/test/auto-clockin/COMPANY_ID \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Geofencing Not Working

**Check:**
1. Are `office_latitude` and `office_longitude` set?
2. Is `require_geofence_for_clockin = true`?
3. Is location data being sent in request?
4. Is location data valid (lat: -90 to 90, lng: -180 to 180)?

**Debug:**
```sql
SELECT 
  office_latitude,
  office_longitude,
  geofence_radius_meters,
  require_geofence_for_clockin
FROM companies
WHERE id = 'your-company-id';
```

### Email Notifications Not Sending

**Check:**
1. Are SMTP credentials correct?
2. Is Gmail "Less secure app access" enabled? (Use App Password instead)
3. Check email logs:

```bash
tail -f logs/app.log | grep "Email"
```

**Test Email:**
```bash
# Send test email
curl -X POST http://localhost:5000/api/admin/test/email \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "admin@example.com",
    "subject": "Test Email",
    "body": "This is a test"
  }'
```

### Early Departure Notifications Not Received

**Check:**
1. Is `notify_early_departure = true`?
2. Is clock-out time before `work_end_time - early_departure_threshold_minutes`?
3. Are there active admins in the company?

**Debug:**
```sql
SELECT 
  ar.*,
  c.work_end_time,
  c.early_departure_threshold_minutes,
  c.notify_early_departure
FROM attendance_records ar
JOIN companies c ON ar.company_id = c.id
WHERE ar.id = 'attendance-record-id';
```

## 📱 Mobile App Integration

### Getting User Location (React Native)

```typescript
import Geolocation from '@react-native-community/geolocation';

const getCurrentLocation = (): Promise<{latitude: number, longitude: number}> => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  });
};

// Clock in with location
const clockIn = async () => {
  try {
    const location = await getCurrentLocation();
    
    const response = await fetch('https://api.teemplot.com/attendance/clock-in', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ location }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      alert(data.message); // Show geofence error
    }
  } catch (error) {
    console.error('Clock in failed:', error);
  }
};
```

### Web App (Browser)

```typescript
const getCurrentLocation = (): Promise<{latitude: number, longitude: number}> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};
```

## 🎯 Best Practices

### Geofence Radius
- **Urban areas**: 50-100m (buildings close together)
- **Suburban**: 100-200m (more space)
- **Campus/Industrial**: 200-500m (large area)

### Grace Period
- **Strict**: 5-10 minutes
- **Standard**: 15 minutes (recommended)
- **Flexible**: 30 minutes

### Early Departure Threshold
- **Strict**: 15 minutes
- **Standard**: 30 minutes (recommended)
- **Flexible**: 60 minutes

### Working Hours
- Set realistic hours
- Consider time zones
- Account for breaks
- Match company policy

## 📊 Monitoring

### Key Metrics to Track

```sql
-- Geofence compliance rate
SELECT 
  COUNT(*) FILTER (WHERE is_within_geofence = true) * 100.0 / COUNT(*) as compliance_rate
FROM attendance_records
WHERE company_id = 'your-company-id'
  AND created_at >= NOW() - INTERVAL '30 days';

-- Early departure frequency
SELECT 
  COUNT(*) FILTER (WHERE is_early_departure = true) * 100.0 / COUNT(*) as early_departure_rate
FROM attendance_records
WHERE company_id = 'your-company-id'
  AND created_at >= NOW() - INTERVAL '30 days';

-- Average review time (hours)
SELECT 
  AVG(EXTRACT(EPOCH FROM (reviewed_at - marked_complete_at)) / 3600) as avg_review_hours
FROM tasks
WHERE company_id = 'your-company-id'
  AND reviewed_at IS NOT NULL;
```

## 🔐 Security Checklist

- [ ] SMTP credentials stored securely
- [ ] Location data encrypted at rest
- [ ] Admin-only access to sensitive endpoints
- [ ] Rate limiting enabled
- [ ] Audit logs enabled
- [ ] HTTPS enforced in production
- [ ] CORS configured correctly
- [ ] JWT tokens with expiry
- [ ] Input validation on all endpoints

---

**Need Help?** Check the full documentation in `FEATURES.md` or contact support.

**Last Updated**: November 16, 2024
