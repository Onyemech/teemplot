# Teemplot - Product Requirements Document

## Overview
Teemplot is a multi-tenant workforce management SaaS platform designed to handle thousands of users with enterprise-grade architecture.

## User Roles

### Company Roles (3 Roles)
1. **Owner**: Company owner with full control
   - Created company during registration
   - Full access to all features
   - Can manage Admin and Staff
   - Can modify subscription plans
   - Cannot be modified by Admin
   
2. **Admin**: Company administrator
   - Can create, update, deactivate Staff
   - Cannot modify Owner
   - Cannot delete company
   - Cannot change subscription
   - Manages day-to-day operations
   
3. **Staff**: Regular employees
   - Clock in/out
   - Complete assigned tasks
   - View their own performance
   - Limited access

### Platform Role
4. **SuperAdmin**: Platform owner (separate database/system)
   - Manages all companies
   - Tracks payments across all companies
   - Monitors system-wide metrics
   - Reviews company documents
   - Separate authentication system

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
- **Invite System**: Owner can invite Admin/Staff via email
  - Send invitation with: Email, First Name, Last Name, Role
  - Invitee receives email with setup link
  - Invitee sets password and joins company
- **Role-Based Permissions**:
  - Owner: Full control over all users
  - Admin: Can manage Staff only (not Owner)
  - Staff: View-only access to own data

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


---

## Onboarding Flow - Detailed Stages

### Stage 1: Registration
**Route**: `/onboarding/register`

**Purpose**: Initial account creation

**Fields**:
- Email Address (required)
- Password (required, min 8 chars)
- Confirm Password (required, must match)
- Terms & Conditions checkbox (required)

**Actions**:
1. Validate email format and uniqueness
2. Hash password
3. Create user account (status: pending_verification)
4. Send OTP to email
5. Navigate to verification page

---

### Stage 2: Company Setup (Personal Details + Ownership)
**Route**: `/onboarding/company-setup`

**Purpose**: Collect registrant information and determine ownership

**Fields**:
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| First Name | String | Yes | Registrant's first name |
| Last Name | String | Yes | Registrant's last name |
| Email Address | Email | Yes | Pre-filled from registration (disabled) |
| Phone Number | String | Yes | With country code |
| Date of Birth | Date | Yes | Must be 18+ |
| **I am the company owner** | Checkbox | No | Default: checked |

**Conditional UI Behavior**:

**When "I am the company owner" is ✅ CHECKED:**
- Show success message: "Perfect! You'll have full access to all company features."
- Show info: "We'll skip the owner details section and proceed directly to business information."
- Tooltip on checkbox: "Only select this if you would like to use your information as the company owner information"
- **Next step**: Business Info (Stage 4)

**When "I am the company owner" is ☐ UNCHECKED:**
- Show warning message: "We'll need the company owner's details in the next step."
- Show info: "You'll be set up as an administrator with management permissions, but the owner will have ultimate control."
- **Next step**: Owner Details (Stage 3)

**Validation**:
- Age must be 18+
- Phone number must be valid format
- All fields required

---

### Stage 3: Company Owner Details (Conditional)
**Route**: `/onboarding/owner-details`

**Conditional Display**:
- **ONLY SHOW** if "I am the company owner" was ☐ UNCHECKED in Stage 2
- **SKIP ENTIRELY** if checkbox was ✅ CHECKED

**Purpose**: Collect actual company owner information when registrant is not the owner

**UI Design** (from image):
- Show registrant info in gray box at top: "Your Information (Administrator)"
- Clear section for "Company Owner Information"
- All fields required
- Show info box: "What happens next?"
  - Owner will receive email invitation
  - They'll need to verify email and set password
  - You'll be set up as administrator
  - Owner will have ultimate control

**Fields**:
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Owner First Name | String | Yes | Min 2 characters |
| Owner Last Name | String | Yes | Min 2 characters |
| Owner Email | Email | Yes | **Must be different from registrant email** |
| Owner Phone | String | Yes | Valid phone with country code |
| Owner Date of Birth | Date | Yes | Must be 18+ |

**Backend Logic**:
- If checkbox was checked in Stage 2: Use registrant's details as owner
- If checkbox was unchecked: Use separate owner details
- Owner receives invitation email
- Registrant becomes Admin role
- Owner becomes Owner role

---

### Stage 4: Business Information
**Route**: `/onboarding/business-info`

**Purpose**: Collect company details

**Fields**:
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Company Name | String | Yes | Legal business name |
| Tax ID / RC Number | String | Yes | Company registration number |
| Industry | Select | Yes | Dropdown of industries |
| Number of Employees | Number | Yes | Manual input (not dropdown) |
| Company Website | URL | No | Optional |
| Business Address | Text | Yes | Full address |
| City | String | Yes | |
| State/Province | String | Yes | |
| Country | Select | Yes | Dropdown |
| Postal Code | String | Yes | |

**Additional Features**:
- Geolocation capture (latitude/longitude)
- Address autocomplete (optional)

---

### Stage 5: Company Logo Upload
**Route**: `/onboarding/logo-upload`

**Purpose**: Upload company branding

**UI Design**:
- Drag and drop area
- Click to browse
- Preview uploaded logo
- Crop/resize functionality
- Remove/replace option

**Specifications**:
- Accepted formats: PNG, JPG, JPEG, SVG
- Max size: 2MB
- Recommended: Square image, min 200x200px
- Optional (can skip)

---

### Stage 6: Document Upload
**Route**: `/onboarding/documents`

**Purpose**: Upload required legal documents

**UI Design** (from image):
- Clean list layout
- Each document shows:
  - Document type icon (PDF, image, etc.)
  - File name
  - File size
  - Delete button (trash icon)
- Upload button for each document type
- Continue button at bottom

**Required Documents**:

1. **C.A.C Document** (Certificate of Incorporation)
   - Description: "This is used to verify the business detail you provided"
   - Accepted: PDF
   - Max size: 5MB
   - Required: Yes

2. **Proof of Address**
   - Description: "This is used to verify the business address"
   - Accepted: PDF, PNG, JPG
   - Max size: 5MB
   - Required: Yes

3. **Company Policies Document**
   - Description: "This is to ensure that your company adheres to standard company practices"
   - Accepted: PDF
   - Max size: 10MB
   - Required: Yes

**Upload States**:
- Empty: Show upload button
- Uploading: Show progress bar
- Uploaded: Show file info with delete option
- Error: Show error message with retry

---

### Stage 7: Subscription Plan Selection
**Route**: `/onboarding/subscription`

**Purpose**: Choose subscription tier

**Plans**:

1. **Free Plan**
   - Up to 10 employees
   - Basic features
   - Email support
   - Price: ₦0/month

2. **Silver Plan**
   - Up to 50 employees
   - Advanced features
   - Priority support
   - Price: From environment variable
   - Monthly billing

3. **Gold Plan**
   - Unlimited employees
   - All features
   - 24/7 support
   - Custom integrations
   - Price: From environment variable
   - Monthly billing
   - **14-day free trial**

**UI Features**:
- Side-by-side comparison
- Highlight recommended plan
- Feature checklist per plan
- "Start Free Trial" for Gold
- "Choose Plan" for others

---

### Stage 8: Payment (Conditional)
**Route**: `/onboarding/payment`

**Conditional Display**:
- **SKIP** if Free Plan selected
- **SKIP** if Gold Plan with trial selected (trial starts immediately)
- **SHOW** if Silver or Gold (no trial) selected

**Integration**: Paystack

**Features**:
- Secure payment form
- Card details
- Payment confirmation
- Receipt generation
- Redirect to completion

---

### Stage 9: Completion
**Route**: `/onboarding/complete`

**UI Design** (from image):
- Clean white background
- Large green circle with white checkmark (animated)
- "Congratulations!" heading
- "You're all set up" subheading
- "Go to Dashboard" button (dark green)

**Success Animation**:
1. Page loads with fade-in
2. Green circle scales in with bounce effect (0.5s)
3. Checkmark draws in with stroke animation (0.3s)
4. Text fades in (0.3s)
5. Button appears with slide-up (0.2s)
6. Optional: Confetti animation

**Backend Actions**:
1. Set `onboarding_completed = true`
2. Set company status to `active`
3. Send welcome email
4. If trial: Start trial countdown
5. If owner was separate: Send owner invitation email
6. Create initial dashboard data

**Button Action**:
- Redirect to `/dashboard`
- Clear onboarding session data
- Set user as authenticated

---

## Onboarding Progress Tracking

**Progress Calculation**:
- Stage 1 (Register): 11%
- Stage 2 (Company Setup): 22%
- Stage 3 (Owner Details): 33% (if shown)
- Stage 4 (Business Info): 44%
- Stage 5 (Logo): 55%
- Stage 6 (Documents): 66%
- Stage 7 (Subscription): 77%
- Stage 8 (Payment): 88% (if shown)
- Stage 9 (Complete): 100%

**Progress Bar**:
- Show at top of each page
- Smooth animation on progress
- Show step number: "Step X of 9"
- Show current stage name

**Session Management**:
- Store progress in sessionStorage
- Allow back navigation
- Prevent skipping stages
- Clear on completion

---

## Onboarding Validation Rules

### Email Validation
- Valid email format
- Unique in system
- Not disposable email domain

### Password Validation
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### Age Validation
- Must be 18+ years old
- Calculate from date of birth

### Phone Validation
- Valid international format
- Include country code
- Minimum 10 digits

### Document Validation
- Correct file type
- Within size limits
- Not corrupted
- Scannable/readable

### Business Validation
- Company name not already registered
- Valid tax ID format
- Valid address format

---

## Error Handling

### User-Facing Errors
- Clear, actionable error messages
- Field-level validation
- Form-level validation
- Network error handling
- Timeout handling

### Backend Errors
- Proper HTTP status codes
- Detailed error responses
- Logging for debugging
- Graceful degradation

### Recovery Options
- Retry failed uploads
- Save progress automatically
- Resume from last completed stage
- Contact support option

---

## Success Criteria

### Completion Rate
- Target: 80% of users complete onboarding
- Track drop-off at each stage
- A/B test improvements

### Time to Complete
- Target: Under 10 minutes
- Optimize slow stages
- Reduce friction

### Data Quality
- Valid business information
- Verified documents
- Accurate contact details

### User Satisfaction
- Post-onboarding survey
- NPS score
- Support ticket volume

