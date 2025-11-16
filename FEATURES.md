# Teemplot Advanced Features

## 🎯 Auto Clock-In/Out with Geofencing

### Overview
Automatic attendance tracking that respects company working hours and validates employee location using GPS geofencing.

### How It Works

#### Auto Clock-In
1. **Cron Job**: Runs every minute checking for eligible companies
2. **Working Day Check**: Validates if today is a working day for the company
3. **Time Window**: Checks if current time is within grace period of work start time
4. **Geofence Validation**: 
   - Requires employee to be within configured radius of office
   - Default radius: 100 meters (configurable per company)
   - Uses Haversine formula for accurate distance calculation
5. **Auto Clock-In**: Creates attendance record if all conditions met

#### Auto Clock-Out
1. **Cron Job**: Runs every minute checking for eligible companies
2. **Working Day Check**: Validates if today is a working day
3. **Time Check**: Verifies if current time is at or past work end time
4. **Auto Clock-Out**: Updates attendance record with clock-out time

### Configuration

#### Company Settings
```typescript
{
  // Working days configuration
  working_days: {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false
  },
  
  // Work hours
  work_start_time: "09:00:00",
  work_end_time: "17:00:00",
  grace_period_minutes: 15,
  
  // Auto attendance
  auto_clockin_enabled: true,
  auto_clockout_enabled: true,
  
  // Geofencing
  office_latitude: 6.5244,
  office_longitude: 3.3792,
  geofence_radius_meters: 100,
  require_geofence_for_clockin: true
}
```

### Geofence Validation

#### Distance Calculation
Uses the Haversine formula to calculate the great-circle distance between two points on Earth:

```typescript
function calculateDistance(point1, point2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = toRadians(point1.latitude);
  const φ2 = toRadians(point2.latitude);
  const Δφ = toRadians(point2.latitude - point1.latitude);
  const Δλ = toRadians(point2.longitude - point1.longitude);

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c; // Distance in meters
}
```

#### Recommended Radius Settings
- **Small Office**: 50-100 meters
- **Medium Office/Building**: 100-200 meters
- **Large Campus**: 200-500 meters
- **Remote Work**: Disable geofencing

### API Endpoints

#### Manual Clock-In
```http
POST /api/attendance/clock-in
Authorization: Bearer <token>
Content-Type: application/json

{
  "location": {
    "latitude": 6.5244,
    "longitude": 3.3792
  },
  "accuracy": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "clock_in_time": "2024-11-16T09:05:00Z",
    "clock_in_distance_meters": 45.2,
    "is_within_geofence": true,
    "status": "present"
  },
  "message": "Clocked in successfully"
}
```

**Error Response (Outside Geofence):**
```json
{
  "success": false,
  "message": "You must be within 100m of the office to clock in. You are 250m away."
}
```

#### Manual Clock-Out
```http
POST /api/attendance/clock-out
Authorization: Bearer <token>
Content-Type: application/json

{
  "location": {
    "latitude": 6.5244,
    "longitude": 3.3792
  }
}
```

---

## 🚨 Early Departure Notifications

### Overview
Automatically detects when employees leave before scheduled end time and notifies company admins via email and push notifications.

### How It Works

1. **Clock-Out Detection**: When employee clocks out
2. **Time Comparison**: Compares clock-out time with scheduled end time
3. **Threshold Check**: Checks if departure is earlier than threshold
4. **Admin Notification**: Sends email and push notification to all company admins
5. **Audit Trail**: Records early departure in attendance record

### Configuration

```typescript
{
  notify_early_departure: true,
  early_departure_threshold_minutes: 30,
  work_end_time: "17:00:00"
}
```

**Example:**
- Work end time: 17:00 (5:00 PM)
- Threshold: 30 minutes
- Threshold time: 16:30 (4:30 PM)
- If employee clocks out before 16:30, admins are notified

### Notification Content

#### Email Notification
```
Subject: ⚠️ Early Departure Alert: John Doe

Hello Admin,

John Doe has left the office earlier than scheduled.

Details:
- Employee: John Doe
- Departure Time: Nov 16, 2024 at 4:15 PM
- Scheduled End Time: 5:00 PM
- Left Early By: 45 minutes

Please review this attendance record and take appropriate action if necessary.

[View Attendance Records]
```

#### Push Notification
```
Title: ⚠️ Early Departure Alert
Body: John Doe left 45 minutes early
Data: {
  type: "early_departure",
  userId: "uuid",
  departureTime: "2024-11-16T16:15:00Z",
  minutesEarly: 45
}
```

### Attendance Record

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "clock_in_time": "2024-11-16T09:00:00Z",
  "clock_out_time": "2024-11-16T16:15:00Z",
  "is_early_departure": true,
  "early_departure_notified": true,
  "status": "early_departure",
  "total_hours": 7.25
}
```

---

## 📋 Task Review Workflow

### Overview
Two-step task completion process where staff marks tasks complete and admins review before final approval.

### Workflow

```
┌─────────────┐
│ Task Created│
│  (Pending)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Staff Working│
│(In Progress)│
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│Staff Marks Done │
│(Awaiting Review)│
└──────┬──────────┘
       │
       ▼
┌──────────────────┐
│  Admin Reviews   │
│                  │
├────────┬─────────┤
│Approve │ Reject  │
└────┬───┴────┬────┘
     │        │
     ▼        ▼
┌─────────┐ ┌──────────────┐
│Completed│ │Back to Staff │
│(Approved│ │(In Progress) │
└─────────┘ └──────────────┘
```

### API Endpoints

#### Staff: Mark Task Complete
```http
POST /api/tasks/:taskId/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "actualHours": 5.5,
  "completionNotes": "Completed all requirements. Tested on staging."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "awaiting_review",
    "review_status": "pending_review",
    "marked_complete_at": "2024-11-16T16:00:00Z",
    "marked_complete_by": "uuid",
    "actual_hours": 5.5
  }
}
```

#### Admin: Review Task
```http
POST /api/tasks/:taskId/review
Authorization: Bearer <token>
Content-Type: application/json

{
  "approved": true,
  "reviewNotes": "Great work! Code quality is excellent."
}
```

**Approval Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "review_status": "approved",
    "reviewed_at": "2024-11-16T16:30:00Z",
    "reviewed_by": "uuid",
    "completed_at": "2024-11-16T16:30:00Z"
  }
}
```

**Rejection:**
```json
{
  "approved": false,
  "reviewNotes": "Please add unit tests",
  "rejectionReason": "Missing test coverage"
}
```

**Rejection Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "in_progress",
    "review_status": "rejected",
    "reviewed_at": "2024-11-16T16:30:00Z",
    "rejection_reason": "Missing test coverage"
  }
}
```

#### Admin: Get Tasks Awaiting Review
```http
GET /api/tasks/awaiting-review
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Implement user authentication",
      "assigned_to_name": "John Doe",
      "marked_complete_at": "2024-11-16T16:00:00Z",
      "actual_hours": 5.5,
      "metadata": {
        "completion_notes": "Completed all requirements"
      }
    }
  ]
}
```

### Task States

| Status | Review Status | Description |
|--------|--------------|-------------|
| pending | null | Task created, not started |
| in_progress | null | Staff working on task |
| awaiting_review | pending_review | Staff marked complete, waiting for admin |
| completed | approved | Admin approved, task done |
| in_progress | rejected | Admin rejected, back to staff |
| cancelled | null | Task cancelled |

### Audit Trail

All task state changes are logged in `audit_logs` table:

```sql
SELECT 
  al.*,
  u.first_name || ' ' || u.last_name as user_name
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE al.entity_type = 'task'
  AND al.entity_id = 'task-uuid'
ORDER BY al.created_at DESC;
```

---

## 🔔 Notification System

### Types of Notifications

1. **Early Departure** - When employee leaves early
2. **Geofence Violation** - When employee tries to clock in outside office
3. **Task Review** - When task needs review or is reviewed
4. **System Alerts** - General system notifications

### Delivery Channels

#### 1. Email
- Powered by Nodemailer
- HTML templates with company branding
- Configurable SMTP settings

#### 2. Push Notifications
- In-app notifications stored in database
- Future: Firebase Cloud Messaging integration
- Future: OneSignal integration

#### 3. In-App Notifications
```http
GET /api/notifications
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "⚠️ Early Departure Alert",
      "body": "John Doe left 45 minutes early",
      "type": "early_departure",
      "is_read": false,
      "created_at": "2024-11-16T16:15:00Z"
    }
  ]
}
```

#### Mark as Read
```http
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

---

## 🔒 Security & Privacy

### Data Isolation
- All queries filtered by `company_id`
- Row Level Security (RLS) enabled
- No cross-company data access

### Location Privacy
- Location data encrypted at rest
- Only stored when explicitly provided
- Admins cannot track real-time location
- Location only captured during clock-in/out

### Geofence Accuracy
- Uses device GPS accuracy
- Validates coordinates
- Logs distance for audit purposes
- Configurable per company

### Notification Privacy
- Only admins receive early departure alerts
- Employee names anonymized in logs
- Audit trail for compliance

---

## 📊 Analytics & Reporting

### Attendance Metrics
- On-time arrival rate
- Early departure frequency
- Average working hours
- Geofence compliance rate

### Task Review Metrics
- Average review time
- Approval/rejection rate
- Task completion quality
- Review backlog

### Admin Dashboard
- Real-time attendance status
- Pending reviews count
- Early departure alerts
- Geofence violations

---

## 🧪 Testing

### Test Auto Clock-In
```http
POST /api/admin/test/auto-clockin/:companyId
Authorization: Bearer <admin-token>
```

### Test Early Departure Notification
```http
POST /api/admin/test/early-departure
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "userId": "uuid",
  "minutesEarly": 45
}
```

---

## 🚀 Future Enhancements

### Planned Features
- [ ] Biometric authentication integration
- [ ] Facial recognition for clock-in
- [ ] Bluetooth beacon support (indoor geofencing)
- [ ] Shift scheduling integration
- [ ] Overtime calculation
- [ ] Leave request integration
- [ ] Mobile app with background location
- [ ] Real-time location tracking (opt-in)
- [ ] Geofence zones (multiple locations)
- [ ] Custom notification templates
- [ ] Slack/Teams integration
- [ ] SMS notifications
- [ ] Voice call alerts (critical)

---

**Last Updated**: November 16, 2024
**Version**: 2.0.0
