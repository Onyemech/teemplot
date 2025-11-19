# Teemplot - Product Requirements Document

## Overview
Teemplot is a multi-tenant workforce management SaaS platform designed to handle thousands of users with enterprise-grade architecture.

## User Roles
1. **SuperAdmin**: Platform owner who manages all companies, tracks payments, and monitors system-wide metrics
2. **Admin**: Company owner who manages their organization, employees, departments, and settings
3. **Staff**: Company employees who clock in/out, complete tasks, and view their performance

## Core Features

### 1. Authentication & Authorization
- Multi-role authentication (SuperAdmin, Admin, Staff)
- Google OAuth integration
- Email/password authentication
- Email verification with OTP
- Role-based access control (RBAC)

### 2. Multi-tenant Architecture
- SuperAdmin can manage multiple companies
- Each company has isolated data
- Company-specific dashboards and settings

### 3. Payment & Subscription (SuperAdmin)
- Paystack payment gateway integration
- Subscription plan management
- Payment tracking per company
- Automated billing
- Pricing from environment variables

### 4. Attendance Management
- Biometric data capture during registration
- Clock-in/clock-out functionality
- Location validation using geolocation
- Attendance history and reports
- Multiple clock-in prevention
- Overtime tracking

### 5. Task Management
- Task assignment to employees
- Due date tracking
- Task status updates
- Priority levels
- Task categories
- Task reviews

### 6. Performance Metrics
- Task completion rate
- On-time completion tracking
- Attendance percentage
- Performance scoring algorithm
- Performance trends and analytics

### 7. Employee Management
- Employee onboarding
- Department assignment
- Employee profiles
- Invite management

### 8. Reporting & Analytics
- Attendance reports
- Performance reports
- Audit logs
- Export functionality

## Technical Requirements

### Architecture Principles
- Clean Architecture
- SOLID Principles
- Dependency Injection
- Repository Pattern
- Service Layer Pattern
- Separation of Concerns
- Loose Coupling

### Database Design
- Partitioning for multi-tenancy
- Sharding for scalability
- Proper indexing for performance
- Foreign key relationships
- Optimistic locking for concurrency
- Soft deletes

### Scalability Requirements
- Support for thousands of concurrent users
- Efficient query optimization
- Caching strategies
- Background job processing
- Rate limiting

### Security Requirements
- Secure authentication
- Data encryption
- API security
- Input validation
- SQL injection prevention
- XSS prevention

### UI/UX Requirements
- Responsive design
- Consistent loading states using logo animation
- Dark green theme (#0F5D5D)
- Orange accent (#FF5722)
- Clean, modern interface
- Accessibility compliance

## Technology Stack

### Frontend
- Next
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Zustand/Redux for state management
- React Query for data fetching

### Backend
- Node.js
- TypeScript
- Express.js
- Supabase (PostgreSQL)
- Prisma/TypeORM
- JWT authentication
- Passport.js

### Payment
- Paystack API

### Infrastructure
- Supabase hosting
- Environment-based configuration
- CI/CD pipeline

## Key Screens (Based on Figma)
1. Landing/Onboarding (Get Started)
2. Email/Google Sign-up
3. Email Verification (OTP)
4. Company Account Creation
5. Dashboard with Sidebar Navigation
6. Attendance Management
7. Employee Management
8. Task Management
9. Reports & Analytics
