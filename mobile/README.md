# Teemplot Mobile PWA

## Quick Start

This directory contains the mobile Progressive Web App (PWA) for Teemplot workforce management system.

## Documentation

- **[MOBILE_PWA_PRD.md](./MOBILE_PWA_PRD.md)** - Complete Product Requirements Document

## Key Features

### 🎯 Core Functionality
- ✅ **Auto Clock-In/Out** - Geofence-based automatic attendance tracking
- ✅ **Task Management** - View, complete, and review tasks with workflow
- ✅ **Leave Management** - Request and approve time off
- ✅ **Performance Analytics** - Real-time metrics and insights
- ✅ **Offline Support** - Works without internet, syncs when online

### 📱 PWA Features
- ✅ **Installable** - Add to home screen with custom icon
- ✅ **Push Notifications** - Real-time updates for tasks, attendance, leave
- ✅ **Background Geolocation** - Auto-track when entering/leaving office
- ✅ **Offline-First** - Full functionality without internet
- ✅ **Native-Like** - Fullscreen, fast, responsive

### 👥 User Roles
- **Employee** - Self-service attendance, tasks, leave requests
- **Admin** - Manage team, approve requests, assign tasks
- **Owner** - Full company control, settings, analytics

## What You Need to Provide

### 1. Firebase Setup (for Push Notifications)
```bash
# Create Firebase project at https://console.firebase.google.com
# Enable Cloud Messaging
# Get your config:
```
- API Key
- Project ID
- Messaging Sender ID
- App ID

### 2. Design/Screenshots
- Provide mobile UI designs or screenshots
- Or describe the screens you want

### 3. Geofencing Configuration
- Office address/coordinates
- Desired radius (default: 100 meters)
- Auto-attendance preferences

## Next Steps

1. **Review PRD** - Read `MOBILE_PWA_PRD.md` thoroughly
2. **Provide Firebase Credentials** - Set up Firebase project
3. **Approve Design** - Share mockups or approve default design
4. **Implementation** - I'll build the PWA based on PRD

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS
- **State**: Zustand + React Query
- **PWA**: Workbox Service Workers
- **APIs**: Geolocation, Push, Background Sync
- **Backend**: Your existing Fastify API

## Timeline Estimate

- **Phase 1** (Core Features): 2-3 weeks
  - Authentication & Navigation
  - Attendance (Manual + Auto)
  - Task Management
  - Basic Dashboard

- **Phase 2** (Advanced): 1-2 weeks
  - Leave Management
  - Analytics & Reports
  - Settings & Preferences
  - Notifications

- **Phase 3** (Polish): 1 week
  - Offline Support
  - Performance Optimization
  - Testing & Bug Fixes
  - Deployment

**Total**: 4-6 weeks for production-ready PWA

## Questions?

Review the PRD and let me know:
1. Any features to add/remove?
2. Design preferences?
3. Firebase credentials ready?
4. When do you want to start?
