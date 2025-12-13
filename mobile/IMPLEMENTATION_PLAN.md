# Teemplot Mobile PWA - Implementation Plan

## Security-First Approach

### ✅ NO SENSITIVE DATA CACHING
- **Authentication**: JWT tokens stored in HTTP-only cookies (server-side)
- **Biometrics**: Credential IDs stored server-side, never in localStorage
- **Location**: Never cached, always fresh from GPS
- **User Data**: Fetched on-demand, never persisted locally
- **Preferences Only**: Only non-sensitive UI preferences in localStorage

### ✅ Secure Storage Strategy
```typescript
// ❌ NEVER DO THIS
localStorage.setItem('token', jwt);
localStorage.setItem('password', password);
localStorage.setItem('location', JSON.stringify(coords));

// ✅ CORRECT APPROACH
// Tokens: HTTP-only cookies (set by server)
// Biometrics: Server-side storage
// Location: Real-time only, no caching
// Preferences: localStorage with 'pref_' prefix
secureStorage.setPreference('theme', 'dark');
```

## Phase 1: Core Infrastructure (Week 1)

### 1.1 Project Setup
- [x] Vite + React + TypeScript
- [x] PWA plugin configuration
- [x] Service Worker setup
- [x] Manifest.json
- [ ] TailwindCSS configuration
- [ ] Path aliases (@/)

### 1.2 Security Utilities
- [x] PWA utilities (pwa.ts)
- [x] Notification handling (no sensitive data)
- [x] Geolocation (real-time only)
- [x] Biometric authentication (Web Authentication API)
- [x] Secure storage (preferences only)
- [ ] API client with HTTP-only cookie auth

### 1.3 State Management
- [ ] Zustand stores:
  - `useAuthStore` - Auth state (no tokens, just user info)
  - `useAttendanceStore` - Attendance state
  - `useTaskStore` - Task state
  - `useNotificationStore` - Notification state
  - `useGeofenceStore` - Geofence monitoring

### 1.4 API Integration
- [ ] Axios instance with credentials: 'include'
- [ ] Request interceptors (no token injection - cookies handle it)
- [ ] Response interceptors (handle 401, refresh)
- [ ] Offline queue with Background Sync

## Phase 2: Authentication & Onboarding (Week 1-2)

### 2.1 Employee Invitation Flow
- [x] Accept invitation page (already implemented)
- [ ] Mobile-optimized invitation page
- [ ] Password strength indicator
- [ ] Biometric setup prompt (optional)

### 2.2 Login Flow
- [ ] Email + Password login
- [ ] Biometric login (if registered)
- [ ] Remember device (secure cookie)
- [ ] Forgot password flow

### 2.3 Onboarding Screens
- [ ] Welcome screen
- [ ] Permission requests:
  - Location (Always) - for auto attendance
  - Notifications - for task updates
  - Biometric - for quick login
- [ ] Feature tour (swipeable cards)
- [ ] Complete profile

## Phase 3: Core Features (Week 2-3)

### 3.1 Home Dashboard
**Layout:**
```
┌─────────────────────────────┐
│  Good Morning, John         │
│  Monday, Dec 1, 2025        │
├─────────────────────────────┤
│  ┌─────────────────────┐   │
│  │   CLOCK IN BUTTON   │   │ <- Large, prominent
│  │   (Pulse animation) │   │
│  └─────────────────────┘   │
├─────────────────────────────┤
│  Today's Summary            │
│  ├─ Clock In: 09:05 AM     │
│  ├─ Hours: 3h 25m          │
│  └─ Tasks: 3 pending       │
├─────────────────────────────┤
│  Quick Actions              │
│  [Tasks] [Leave] [Profile] │
└─────────────────────────────┘
```

**Features:**
- [ ] Clock in/out button (large FAB)
- [ ] Current status display
- [ ] Today's summary cards
- [ ] Quick action buttons
- [ ] Offline indicator

### 3.2 Attendance Management
**Manual Clock-In:**
- [ ] Get current location (real-time)
- [ ] Validate against geofence
- [ ] Show distance from office
- [ ] Capture timestamp
- [ ] Send to API (with offline queue)
- [ ] Show success confirmation

**Auto Clock-In (Background):**
- [ ] Service Worker geofence monitoring
- [ ] Check work hours
- [ ] Auto clock-in on entry
- [ ] Push notification confirmation
- [ ] Handle edge cases (already clocked in, etc.)

**Attendance History:**
- [ ] Calendar view
- [ ] List view with filters
- [ ] Status badges (Present, Late, Absent)
- [ ] Total hours calculation
- [ ] Export option

### 3.3 Task Management
**Task List:**
- [ ] Swipeable task cards
- [ ] Priority badges (color-coded)
- [ ] Status chips
- [ ] Due date countdown
- [ ] Filter by status/priority
- [ ] Pull-to-refresh

**Task Detail:**
- [ ] Full task information
- [ ] Comments section
- [ ] Attachments
- [ ] Mark complete button
- [ ] Add comment
- [ ] Upload photo

**Task Actions:**
- [ ] Mark as In Progress
- [ ] Mark as Complete (triggers review)
- [ ] Add comment
- [ ] Upload attachment
- [ ] Swipe actions (quick complete)

### 3.4 Leave Management
**Request Leave:**
- [ ] Leave type dropdown
- [ ] Date range picker
- [ ] Half-day toggle
- [ ] Reason text area
- [ ] Balance display
- [ ] Submit button

**Leave History:**
- [ ] List of requests
- [ ] Status badges
- [ ] Filter by status
- [ ] View details

## Phase 4: Advanced Features (Week 3-4)

### 4.1 Performance Analytics
**Employee Dashboard:**
- [ ] Attendance rate (monthly)
- [ ] Task completion rate
- [ ] Hours worked chart
- [ ] Leave balance
- [ ] Performance score

**Visualizations:**
- [ ] Calendar heatmap (attendance)
- [ ] Line chart (hours trend)
- [ ] Bar chart (tasks per week)
- [ ] Donut chart (leave breakdown)

### 4.2 Profile & Settings
**Profile:**
- [ ] Avatar upload
- [ ] Personal information
- [ ] Contact details
- [ ] Department & position

**Settings:**
- [ ] Notification preferences
- [ ] Biometric toggle
- [ ] Language selection
- [ ] Theme (light/dark)
- [ ] About & version

**Security:**
- [ ] Change password
- [ ] Active sessions
- [ ] Login history
- [ ] Logout

### 4.3 Notifications
**Push Notifications:**
- [ ] Task assigned
- [ ] Task approved/rejected
- [ ] Leave approved/rejected
- [ ] Auto clock-in/out confirmation
- [ ] Reminder notifications

**In-App Notifications:**
- [ ] Notification center
- [ ] Mark as read
- [ ] Clear all
- [ ] Notification settings

## Phase 5: Offline Support (Week 4)

### 5.1 Service Worker
- [ ] Cache static assets
- [ ] Network-first for API
- [ ] Offline fallback pages
- [ ] Background sync queue

### 5.2 Offline Capabilities
- [ ] View cached attendance
- [ ] View cached tasks
- [ ] Draft leave requests
- [ ] Queue clock-in/out
- [ ] Offline indicator

### 5.3 Sync Strategy
- [ ] Auto-sync when online
- [ ] Conflict resolution
- [ ] Sync status indicator
- [ ] Manual sync button

## Phase 6: Polish & Testing (Week 5-6)

### 6.1 UI/UX Polish
- [ ] Loading skeletons
- [ ] Empty states
- [ ] Error states
- [ ] Success animations
- [ ] Haptic feedback
- [ ] Pull-to-refresh

### 6.2 Performance
- [ ] Code splitting
- [ ] Lazy loading
- [ ] Image optimization
- [ ] Bundle size optimization
- [ ] Lighthouse audit (>90)

### 6.3 Testing
- [ ] Unit tests (utilities)
- [ ] Integration tests (API)
- [ ] E2E tests (critical flows)
- [ ] Device testing (iOS/Android)
- [ ] Offline testing
- [ ] Security audit

### 6.4 Documentation
- [ ] User guide
- [ ] Admin guide
- [ ] API documentation
- [ ] Deployment guide
- [ ] Troubleshooting guide

## Design System

### Colors (Gray Theme)
```css
--primary: #0F5D5D;      /* Teal */
--secondary: #FF5722;    /* Orange */
--success: #4CAF50;      /* Green */
--warning: #FFC107;      /* Amber */
--error: #F44336;        /* Red */

/* Gray Scale */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-600: #4B5563;
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;
```

### Typography
```css
--font-family: 'Inter', system-ui, sans-serif;
--font-size-xs: 0.75rem;    /* 12px */
--font-size-sm: 0.875rem;   /* 14px */
--font-size-base: 1rem;     /* 16px */
--font-size-lg: 1.125rem;   /* 18px */
--font-size-xl: 1.25rem;    /* 20px */
--font-size-2xl: 1.5rem;    /* 24px */
--font-size-3xl: 1.875rem;  /* 30px */
```

### Spacing
```css
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-5: 1.25rem;  /* 20px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
```

### Components
- **Cards**: Rounded (12px), shadow, gray-100 background
- **Buttons**: Rounded (8px), min-height 44px (touch-friendly)
- **Inputs**: Rounded (8px), gray-200 border, focus ring
- **Badges**: Rounded-full, small text, color-coded
- **FAB**: 64px diameter, fixed bottom-center, primary color

## Security Checklist

- [x] No tokens in localStorage
- [x] HTTP-only cookies for auth
- [x] No location caching
- [x] Biometric credentials server-side
- [x] HTTPS only
- [ ] Content Security Policy
- [ ] CORS configuration
- [ ] Rate limiting
- [ ] Input validation
- [ ] XSS protection
- [ ] CSRF protection
- [ ] SQL injection prevention

## Deployment

### Build
```bash
cd mobile
npm install
npm run build
```

### Deploy
- [ ] Vercel/Netlify for static hosting
- [ ] CDN for assets
- [ ] Service Worker registration
- [ ] HTTPS certificate
- [ ] Domain configuration

### Monitoring
- [ ] Error tracking (Sentry)
- [ ] Analytics (Google Analytics)
- [ ] Performance monitoring
- [ ] User feedback

## Success Metrics

### Adoption
- 80% employee installation rate
- 90% daily active users
- <5% uninstall rate

### Performance
- <1.5s First Contentful Paint
- <3s Time to Interactive
- >90 Lighthouse PWA score
- 99.9% uptime

### Engagement
- 5+ sessions per day
- 95% attendance via app
- 80% tasks via mobile

---

**Next Steps:**
1. Review this plan
2. Approve design system
3. Provide Firebase credentials (for push)
4. Start Phase 1 implementation

**Timeline:** 5-6 weeks for production-ready PWA
