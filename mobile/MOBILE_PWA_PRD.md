# Teemplot Mobile PWA - Product Requirements Document

## 1. Executive Summary

### 1.1 Product Overview
Teemplot Mobile PWA is a production-grade Progressive Web Application designed for employees to manage their daily workforce activities on mobile devices. The app provides seamless attendance tracking with automatic clock-in/out based on geofencing, task management, leave requests, and performance analytics.

### 1.2 Target Users
- **Employees**: Front-line workers who need mobile access to clock in/out, view tasks, request leave
- **Admins**: Managers who oversee employee activities, approve requests, assign tasks
- **Owners**: Company owners who control company-wide settings and configurations

### 1.3 Key Differentiators
- **Auto Clock-In/Out**: Leverages geofencing to automatically track attendance when employees enter/leave office premises
- **Offline-First**: Works without internet connection, syncs when online
- **Native-Like Experience**: Installable PWA with custom app icon, push notifications, and fullscreen mode
- **Real-Time Updates**: Live attendance tracking and instant task notifications

---

## 2. User Roles & Permissions

### 2.1 Role Hierarchy
```
Owner (Company Level)
  ├── Admin (Employee Management)
  └── Employee (Self Management)
```

### 2.2 Permission Matrix

| Feature | Employee | Admin | Owner |
|---------|----------|-------|-------|
| **Attendance** |
| Clock In/Out (Manual) | ✅ Self | ✅ All Employees | ✅ All Employees |
| View Own Attendance | ✅ | ✅ | ✅ |
| View Team Attendance | ❌ | ✅ | ✅ |
| Edit Attendance Records | ❌ | ✅ | ✅ |
| **Tasks** |
| View Assigned Tasks | ✅ | ✅ All | ✅ All |
| Create Tasks | ❌ | ✅ | ✅ |
| Mark Task Complete | ✅ Own Tasks | ✅ | ✅ |
| Review/Approve Tasks | ❌ | ✅ | ✅ |
| Delete Tasks | ❌ | ✅ | ✅ |
| **Leave Management** |
| Request Leave | ✅ | ✅ | ✅ |
| View Own Leave | ✅ | ✅ | ✅ |
| View Team Leave | ❌ | ✅ | ✅ |
| Approve/Reject Leave | ❌ | ✅ | ✅ |
| **Settings** |
| Personal Profile | ✅ Edit Own | ✅ Edit Own | ✅ Edit Own |
| Employee Profiles | ❌ | ✅ View/Edit | ✅ View/Edit |
| Company Settings | ❌ | ❌ | ✅ Full Control |
| Work Schedule | ❌ | ❌ | ✅ |
| Geofencing Config | ❌ | ❌ | ✅ |
| Auto-Attendance | ❌ | ❌ | ✅ |
| **Analytics** |
| Personal Performance | ✅ | ✅ | ✅ |
| Team Analytics | ❌ | ✅ | ✅ |
| Company Dashboard | ❌ | ✅ Limited | ✅ Full |

### 2.3 Role-Specific Notes
- **Owners** cannot be managed by Admins (company ownership details are protected)
- **Admins** can manage all employees but cannot modify company-level settings
- **Employees** have full control over their personal settings and self-service features

---

## 3. Core Features

### 3.1 Attendance Management

#### 3.1.1 Manual Clock-In/Out
**Description**: Employees can manually clock in/out with location tracking

**Fields**:
- `clock_in_time`: Timestamp (auto-captured)
- `clock_in_location`: { latitude, longitude, address }
- `clock_in_distance_meters`: Distance from office (calculated)
- `is_within_geofence`: Boolean (auto-validated)
- `clock_in_method`: 'manual' | 'auto'
- `notes`: Optional text field for employee notes

**User Flow**:
1. Employee opens app
2. Taps "Clock In" button (large, prominent)
3. App requests location permission (if not granted)
4. App captures GPS coordinates
5. Validates against office geofence
6. If outside geofence and `require_geofence_for_clockin` = true → Show error
7. If valid → Record attendance with timestamp
8. Show success confirmation with clock-in time

**Validation Rules**:
- Cannot clock in if already clocked in today
- Must be within geofence radius if `require_geofence_for_clockin` enabled
- Location permission must be granted

#### 3.1.2 Automatic Clock-In/Out
**Description**: Background service automatically clocks employees in/out based on geofence entry/exit

**Configuration Fields** (Owner Only):
- `auto_clockin_enabled`: Boolean
- `auto_clockout_enabled`: Boolean
- `office_latitude`: Decimal(10,8)
- `office_longitude`: Decimal(11,8)
- `geofence_radius_meters`: Integer (default: 100m)
- `work_start_time`: Time (e.g., "09:00:00")
- `work_end_time`: Time (e.g., "17:00:00")
- `working_days`: JSON { monday: true, tuesday: true, ... }
- `grace_period_minutes`: Integer (default: 15)

**How It Works**:
1. PWA registers background geolocation tracking (with user permission)
2. Service worker monitors location every 1-5 minutes (configurable)
3. When employee enters geofence during work hours → Auto clock-in
4. When employee exits geofence after work hours → Auto clock-out
5. Push notification sent to confirm action
6. Employee can view auto-attendance in history

**Permissions Required**:
- Location (Always/Background)
- Push Notifications
- Background Sync

**Edge Cases**:
- If employee manually clocked in, auto clock-in is skipped
- If employee leaves early, flag as `is_early_departure` and notify admin
- If GPS unavailable, fall back to manual clock-in

#### 3.1.3 Attendance History
**Description**: View past attendance records with filters

**Display Fields**:
- Date
- Clock In Time
- Clock Out Time
- Total Hours
- Status (Present, Late, Early Departure, Absent)
- Location (distance from office)
- Method (Manual/Auto)

**Filters**:
- Date range picker
- Status filter (All, Present, Late, Absent)
- Month view calendar

---

### 3.2 Task Management

#### 3.2.1 Task List View
**Description**: Employees see tasks assigned to them; Admins/Owners see all tasks

**Task Card Fields**:
- `title`: String (max 255 chars)
- `description`: Text
- `priority`: Badge (Low/Medium/High/Urgent) with color coding
  - Low: Gray
  - Medium: Blue
  - High: Orange
  - Urgent: Red
- `status`: Chip (Pending/In Progress/Completed/Awaiting Review/Approved/Rejected)
- `due_date`: Date with countdown (e.g., "Due in 2 days")
- `assigned_to`: User avatar + name
- `estimated_hours`: Decimal
- `category`: Tag

**Filters** (Employee):
- Status (All, Pending, In Progress, Completed)
- Priority
- Due date (Overdue, Today, This Week, This Month)

**Filters** (Admin/Owner):
- All employee filters +
- Assigned to (dropdown of employees)
- Department filter

#### 3.2.2 Task Detail View
**Fields**:
- All task card fields (expanded)
- `assigned_by`: User who created task
- `created_at`: Timestamp
- `attachments`: Array of file URLs
- `comments`: Array of comment objects
- `actual_hours`: Decimal (if completed)
- `review_status`: If awaiting review
- `review_notes`: Admin feedback
- `rejection_reason`: If rejected

**Actions** (Employee):
- Mark as In Progress
- Mark as Complete (triggers review workflow)
- Add Comment
- Upload Attachment

**Actions** (Admin/Owner):
- All employee actions +
- Edit Task
- Reassign Task
- Approve/Reject (if awaiting review)
- Delete Task

#### 3.2.3 Task Review Workflow
**Description**: When employee marks task complete, it goes to admin for review

**Flow**:
1. Employee marks task complete
2. Task status → "Awaiting Review"
3. `marked_complete_at` timestamp recorded
4. Push notification sent to Admin/Owner
5. Admin reviews task
6. Admin can:
   - **Approve**: Status → "Approved", `reviewed_at` recorded
   - **Reject**: Status → "Rejected", must provide `rejection_reason`
7. Employee receives notification of review decision
8. If rejected, employee can resubmit

**Fields**:
- `review_status`: 'pending_review' | 'approved' | 'rejected'
- `reviewed_by`: UUID of reviewer
- `reviewed_at`: Timestamp
- `review_notes`: Text (optional feedback)
- `rejection_reason`: Text (required if rejected)

---

### 3.3 Leave Management

#### 3.3.1 Leave Request Form
**Description**: Employees can request time off

**Fields**:
- `leave_type`: Dropdown
  - Annual Leave
  - Sick Leave
  - Casual Leave
  - Maternity/Paternity Leave
  - Unpaid Leave
- `start_date`: Date picker
- `end_date`: Date picker
- `half_day`: Boolean toggle
- `total_days`: Auto-calculated (read-only)
- `reason`: Text area (required, max 500 chars)
- `annual_leave_balance`: Display current balance (read-only)

**Validation**:
- End date must be after start date
- Cannot request leave for past dates
- If annual leave, check balance: `balance >= total_days`
- Show warning if balance insufficient

**Submission**:
- Status set to "Pending"
- Notification sent to Admin/Owner
- Employee can view in "My Leave Requests"

#### 3.3.2 Leave Request List
**Employee View**:
- List of own leave requests
- Status badges (Pending/Approved/Rejected)
- Date range
- Total days
- Approval/rejection notes

**Admin/Owner View**:
- All employee leave requests
- Filter by:
  - Status
  - Employee
  - Date range
  - Leave type
- Bulk actions (Approve/Reject multiple)

#### 3.3.3 Leave Approval/Rejection
**Admin/Owner Actions**:
- View leave request details
- Check employee's leave balance
- View employee's attendance history
- Approve or Reject with notes
- `approved_by` / `rejected_by` recorded
- `approved_at` / `rejected_at` timestamp
- Employee receives push notification

**Fields**:
- `status`: 'pending' | 'approved' | 'rejected'
- `approved_by`: UUID
- `approved_at`: Timestamp
- `rejection_reason`: Text (required if rejected)
- `admin_notes`: Text (optional)

---

### 3.4 Performance Analytics

#### 3.4.1 Employee Dashboard (Self)
**Metrics Displayed**:
- **Attendance Summary** (Current Month):
  - Total Days Present
  - Total Working Days
  - Attendance Rate (%)
  - Total Hours Worked
  - Average Hours/Day
  - Late Arrivals Count
  - Early Departures Count

- **Task Performance**:
  - Tasks Assigned (Current Month)
  - Tasks Completed
  - Tasks On Time
  - Tasks Overdue
  - Completion Rate (%)
  - Average Completion Time

- **Leave Balance**:
  - Annual Leave Remaining
  - Sick Leave Used
  - Total Leave Days (YTD)

**Visualizations**:
- Attendance calendar heatmap
- Task completion trend (line chart)
- Hours worked per week (bar chart)

#### 3.4.2 Admin Dashboard
**Metrics Displayed**:
- **Team Overview**:
  - Total Employees
  - Present Today
  - Absent Today
  - On Leave Today
  - Late Today

- **Task Overview**:
  - Total Active Tasks
  - Pending Review
  - Overdue Tasks
  - Completed This Week

- **Performance**:
  - Team Attendance Rate
  - Team Task Completion Rate
  - Average Performance Score

**Employee List**:
- Sortable table with:
  - Name
  - Status (Present/Absent/On Leave)
  - Clock In Time
  - Tasks Pending
  - Performance Score

#### 3.4.3 Owner Dashboard
**All Admin metrics +**:
- **Company-Wide Stats**:
  - Total Departments
  - Total Employees
  - Subscription Status
  - Storage Used

- **Financial**:
  - Subscription Plan
  - Next Billing Date
  - Payment History

---

## 4. Settings & Configuration

### 4.1 Employee Settings (Self-Management)
**Personal Profile**:
- `first_name`: String
- `last_name`: String
- `email`: String (read-only, verified)
- `phone_number`: String
- `avatar_url`: Image upload
- `date_of_birth`: Date
- `position`: String (read-only, set by admin)
- `department`: String (read-only, set by admin)

**Preferences**:
- `language`: Dropdown (English, etc.)
- `timezone`: Auto-detected, can override
- `notification_preferences`: JSON
  - Push notifications: Boolean
  - Email notifications: Boolean
  - Task reminders: Boolean
  - Leave updates: Boolean

**Security**:
- Change Password
- Two-Factor Authentication (future)
- Active Sessions
- Login History

### 4.2 Admin Settings (Employee Management)
**Employee Management**:
- View all employees
- Edit employee profiles:
  - `role`: 'admin' | 'employee'
  - `department_id`: Dropdown
  - `position`: String
  - `hire_date`: Date
  - `is_active`: Boolean
- Invite new employees
- Deactivate employees

**Cannot Edit**:
- Owner profile
- Company settings
- Subscription details

### 4.3 Owner Settings (Company Control)
**Company Profile**:
- `name`: String
- `email`: String
- `phone_number`: String
- `address`: Text
- `logo_url`: Image upload
- `industry`: Dropdown
- `company_size`: Dropdown (1-10, 11-50, 51-200, 201-500, 500+)

**Work Schedule Configuration**:
- `work_start_time`: Time picker (e.g., 09:00 AM)
- `work_end_time`: Time picker (e.g., 05:00 PM)
- `working_days`: Multi-select checkboxes
  - Monday ☑️
  - Tuesday ☑️
  - Wednesday ☑️
  - Thursday ☑️
  - Friday ☑️
  - Saturday ☐
  - Sunday ☐
- `timezone`: Dropdown (auto-detected)
- `grace_period_minutes`: Number input (default: 15)
  - Allows employees to clock in X minutes late without penalty

**Geofencing Configuration**:
- `office_latitude`: Auto-filled from address or manual input
- `office_longitude`: Auto-filled from address or manual input
- `office_address`: Text (with Google Maps autocomplete)
- `geofence_radius_meters`: Slider (50m - 500m, default: 100m)
  - Visual map showing radius circle
- `require_geofence_for_clockin`: Toggle
  - If ON: Employees must be within radius to clock in manually
  - If OFF: Employees can clock in from anywhere (location still recorded)

**Auto-Attendance Settings**:
- `auto_clockin_enabled`: Toggle
  - Automatically clock in employees when they enter geofence during work hours
- `auto_clockout_enabled`: Toggle
  - Automatically clock out employees when they leave geofence after work hours
- `notify_early_departure`: Toggle
  - Send notification to admin if employee leaves early
- `early_departure_threshold_minutes`: Number input (default: 30)
  - Define "early" as leaving X minutes before work_end_time

**Notification Settings**:
- Email notifications for:
  - Leave requests
  - Task reviews
  - Early departures
  - Geofence violations
- Push notification preferences

**Subscription & Billing**:
- Current plan display
- Upgrade/Downgrade options
- Payment method
- Billing history
- Invoice downloads

---

## 5. PWA-Specific Features

### 5.1 Installation
**App Manifest** (`manifest.json`):
```json
{
  "name": "Teemplot",
  "short_name": "Teemplot",
  "description": "Workforce Management & Attendance Tracking",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0F5D5D",
  "theme_color": "#0F5D5D",
  "icons": [
    {
      "src": "/logo.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/logo.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

**Installation Prompt**:
- Show custom "Add to Home Screen" banner after 2nd visit
- Explain benefits: "Install for faster access and offline support"
- Dismiss option (don't show again)

### 5.2 Offline Support
**Service Worker Strategy**:
- **Cache First**: Static assets (CSS, JS, images, logo)
- **Network First**: API calls (with offline fallback)
- **Background Sync**: Queue failed requests, retry when online

**Offline Capabilities**:
- View cached attendance history
- View cached tasks
- Draft leave requests (submit when online)
- View profile
- Show "Offline Mode" indicator

**Sync When Online**:
- Auto-sync queued actions
- Show sync status notification
- Resolve conflicts (server wins)

### 5.3 Push Notifications
**Notification Types**:
1. **Task Assigned**: "New task: [Title]"
2. **Task Approved**: "Your task '[Title]' was approved"
3. **Task Rejected**: "Your task '[Title]' needs revision"
4. **Leave Approved**: "Your leave request was approved"
5. **Leave Rejected**: "Your leave request was declined"
6. **Auto Clock-In**: "You were automatically clocked in at [Time]"
7. **Auto Clock-Out**: "You were automatically clocked out at [Time]"
8. **Early Departure Alert** (Admin): "[Employee] left early at [Time]"
9. **Geofence Violation** (Admin): "[Employee] clocked in outside office area"

**Notification Permissions**:
- Request on first app launch
- Explain value: "Get instant updates on tasks and attendance"
- Allow users to customize in settings

### 5.4 Background Geolocation
**Permission Request**:
- Request "Location (Always)" permission
- Explain: "Required for automatic clock-in/out when you arrive at/leave the office"
- Show visual example of how it works

**Battery Optimization**:
- Use significant location changes (not continuous tracking)
- Check location every 5 minutes when near office hours
- Pause tracking outside work hours
- Use geofencing API (native) for efficiency

**Privacy**:
- Location only tracked during work hours
- Data encrypted in transit
- User can disable auto-attendance anytime
- Clear privacy policy link

---

## 6. UI/UX Design Guidelines

### 6.1 Design System
**Colors**:
- Primary: `#0F5D5D` (Teal)
- Secondary: `#FF5722` (Orange)
- Success: `#4CAF50` (Green)
- Warning: `#FFC107` (Amber)
- Error: `#F44336` (Red)
- Background: `#F5F5F5` (Light Gray)
- Text: `#212121` (Dark Gray)

**Typography**:
- Font Family: Inter, system-ui, sans-serif
- Headings: Bold, 24-32px
- Body: Regular, 14-16px
- Captions: Regular, 12px

**Spacing**:
- Base unit: 8px
- Small: 8px
- Medium: 16px
- Large: 24px
- XLarge: 32px

### 6.2 Mobile-First Components
**Bottom Navigation** (Primary):
- Home (Dashboard)
- Tasks
- Attendance
- Profile

**Clock-In Button**:
- Large, circular FAB (Floating Action Button)
- Fixed at bottom center
- Primary color with pulse animation
- Shows "Clock In" or "Clock Out" based on status

**Cards**:
- Rounded corners (12px)
- Shadow elevation
- Swipe actions (e.g., swipe task to mark complete)

**Forms**:
- Large touch targets (min 44px)
- Clear labels above inputs
- Inline validation
- Error messages below fields

### 6.3 Responsive Breakpoints
- Mobile: < 768px (primary focus)
- Tablet: 768px - 1024px
- Desktop: > 1024px (web fallback)

---

## 7. Technical Architecture

### 7.1 Tech Stack
**Frontend**:
- React 18+ with TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- React Query (data fetching)
- Zustand (state management)
- React Router (navigation)

**PWA**:
- Workbox (service worker)
- Web Push API (notifications)
- Geolocation API
- Background Sync API
- IndexedDB (offline storage)

**Backend** (Existing):
- Fastify (Node.js)
- PostgreSQL (Supabase)
- JWT Authentication

### 7.2 API Endpoints (Mobile-Specific)
```
POST   /api/attendance/clock-in
POST   /api/attendance/clock-out
GET    /api/attendance/history
GET    /api/attendance/status

GET    /api/tasks
GET    /api/tasks/:id
POST   /api/tasks/:id/complete
POST   /api/tasks/:id/comments

POST   /api/leave/request
GET    /api/leave/requests
PATCH  /api/leave/:id/approve
PATCH  /api/leave/:id/reject

GET    /api/dashboard/employee
GET    /api/dashboard/admin
GET    /api/dashboard/owner

GET    /api/profile
PATCH  /api/profile
PATCH  /api/profile/avatar

POST   /api/notifications/register-device
POST   /api/notifications/subscribe
```

### 7.3 Data Sync Strategy
**Optimistic Updates**:
- Update UI immediately
- Send request to server
- Rollback if fails
- Show error toast

**Conflict Resolution**:
- Server data always wins
- Merge non-conflicting changes
- Notify user of conflicts

---

## 8. Security & Privacy

### 8.1 Authentication
- JWT tokens stored in secure HTTP-only cookies
- Refresh token rotation
- Auto-logout after 30 days inactivity
- Biometric login (fingerprint/face ID) - future

### 8.2 Data Protection
- All API calls over HTTPS
- Location data encrypted
- No sensitive data in localStorage
- GDPR compliant

### 8.3 Permissions
- Request permissions with clear explanations
- Allow users to revoke anytime
- Graceful degradation if denied

---

## 9. Performance Requirements

### 9.1 Metrics
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse PWA Score: > 90
- Offline functionality: 100%

### 9.2 Optimization
- Code splitting by route
- Lazy load images
- Compress assets
- Cache static resources
- Minimize bundle size

---

## 10. Success Metrics

### 10.1 Adoption
- 80% of employees install PWA within 1 month
- 90% daily active users
- < 5% uninstall rate

### 10.2 Engagement
- Average 5+ sessions per day
- 95% attendance tracked via app
- 80% tasks managed via mobile

### 10.3 Performance
- 99.9% uptime
- < 2s average API response time
- < 1% error rate

---

## 11. Future Enhancements

### Phase 2
- Biometric authentication
- Voice commands
- Offline task creation
- Team chat/messaging

### Phase 3
- AI-powered performance insights
- Predictive attendance alerts
- Smart task prioritization
- Integration with calendar apps

---

## 12. Appendix

### 12.1 Database Schema Reference
See `server/database/schema.sql` for complete schema

### 12.2 API Documentation
See `server/src/routes/` for endpoint implementations

### 12.3 Design Mockups
To be provided by design team

---

**Document Version**: 1.0  
**Last Updated**: December 1, 2025  
**Author**: Teemplot Product Team
