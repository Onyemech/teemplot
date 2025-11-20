# Onboarding Redesign - Requirements

**Spec ID:** ONBOARD-001  
**Status:** 🔴 Draft  
**Priority:** P0 - Critical  
**Created:** November 19, 2025

---

## 📋 Overview

Complete redesign of the Teemplot onboarding flow to match documentation specifications, implement missing fields, and create a comprehensive design system with reusable components.

---

## 🎯 Business Goals

1. **Increase Conversion Rate** - Streamlined multi-stage flow reduces drop-off
2. **Collect Complete Data** - All required fields for proper system operation
3. **Professional Branding** - Consistent, polished UI that builds trust
4. **Enable Monetization** - Proper plan selection and payment integration
5. **Reduce Support Tickets** - Clear, intuitive flow with proper validation

---

## 👥 User Stories

### US-1: New Company Registration
**As a** company administrator  
**I want to** register my company in clear, manageable steps  
**So that** I don't feel overwhelmed and can complete the process successfully

**Acceptance Criteria:**
- Registration split into 9 clear stages
- Progress indicator shows current position
- Can save and resume later
- Clear error messages guide me
- Mobile-friendly interface

### US-2: Role-Based Onboarding
**As a** company representative who is not the owner  
**I want to** provide owner details separately  
**So that** the system correctly identifies roles and permissions

**Acceptance Criteria:**
- Checkbox to indicate if I'm the owner
- Conditional owner details form appears if needed
- Role correctly assigned (owner vs admin)
- Owner receives notification email

### US-3: Document Upload
**As a** company administrator  
**I want to** upload required legal documents easily  
**So that** my company can be verified and approved

**Acceptance Criteria:**
- Drag-and-drop file upload
- File preview before submission
- Clear file size and type requirements
- Progress indicator during upload
- Can replace uploaded files

### US-4: Plan Selection
**As a** company administrator  
**I want to** see clear pricing based on my company size  
**So that** I can choose the right plan for my needs

**Acceptance Criteria:**
- Pricing automatically calculated based on company size
- Clear feature comparison between plans
- FREE trial option highlighted
- Savings shown for yearly plans
- Can change selection before payment

### US-5: Trial Activation
**As a** new company  
**I want to** start with a free trial  
**So that** I can evaluate the system before committing

**Acceptance Criteria:**
- Gold plan offers 30-day free trial
- Trial countdown visible in dashboard
- No payment required for trial
- Clear notification before trial expires
- Easy upgrade path after trial

---

## 📊 Functional Requirements

### FR-1: Multi-Stage Onboarding Flow

**Description:** Split registration into 9 sequential stages

**Stages:**
1. **Authentication** - Email + Password
2. **Email Verification** - 6-digit code
3. **Company Setup** - Personal details + ownership
4. **Owner Details** - Conditional owner information
5. **Business Info** - Company details, TIN, location
6. **Documents** - Upload 3 required documents
7. **Review** - Confirm all information
8. **Plans** - Select subscription plan
9. **Payment** - Process payment or start trial

**Requirements:**
- Each stage is a separate page
- Progress saved after each stage
- Can navigate back to edit
- Cannot skip required stages
- Clear progress indicator

**Priority:** P0  
**Complexity:** High

---

### FR-2: Required Field Collection

**Description:** Collect all fields specified in documentation

**User Fields:**
- ✅ First Name (min 2 chars)
- ✅ Last Name (min 2 chars)
- ✅ Email (valid format)
- ✅ Password (min 8 chars, strength validation)
- ⚠️ Phone Number (with country code)
- ⚠️ Date of Birth (must be 18+)
- ⚠️ "Are you the company owner?" (checkbox)

**Company Fields:**
- ✅ Company Name (min 2 chars)
- ⚠️ Tax Identification Number (TIN)
- ⚠️ Employee Count (manual number input, min 1) - NOT dropdown/range
- ✅ Industry (optional)
- ⚠️ Website (optional, valid URL)
- ⚠️ Office Location (latitude/longitude via GPS)
- ⚠️ Company Logo (optional, PNG/JPEG, max 2MB)

**Owner Fields (Conditional):**
- ⚠️ Owner First Name
- ⚠️ Owner Last Name
- ⚠️ Owner Email
- ⚠️ Owner Phone
- ⚠️ Owner Date of Birth

**Document Fields:**
- ⚠️ CAC Document (PDF/PNG/JPEG, max 1MB)
- ⚠️ Proof of Address (PDF/PNG/JPEG, max 1MB)
- ⚠️ Company Policy (PDF/PNG/JPEG, max 1MB)

**Priority:** P0  
**Complexity:** Medium

---

### FR-3: Role Assignment & Employee Counting Logic

**Description:** Automatically assign correct role based on ownership and calculate employee count

**Logic:**
```
INITIAL: Registrant role = 'owner' (default)

IF "Are you the company owner?" = YES
  THEN 
    - Registrant role = 'owner' (keep)
    - Employee count = 1
    - Skip owner details stage
    
ELSE IF "Are you the company owner?" = NO
  THEN
    - Show owner details stage
    - Collect owner information (email, name, phone, DOB)
    
    IF owner email ≠ registrant email
      THEN
        - Registrant role = 'admin' (change from owner)
        - Create new user with role = 'owner' (actual owner)
        - Employee count = 2 (registrant + owner)
        - Send invitation email to owner
      ELSE
        - Registrant role = 'owner' (keep)
        - Employee count = 1
    END IF
END IF
```

**Requirements:**
- Checkbox clearly labeled: "I am the company owner"
- Helper text explains the difference
- Role stored in database
- Owner receives invitation email if different from registrant
- Employee count automatically calculated
- Registrant role updated based on ownership

**Priority:** P0  
**Complexity:** Medium

---

### FR-4: Geolocation Integration

**Description:** Automatically fetch office location via GPS

**Requirements:**
- Request browser geolocation permission
- Fetch latitude and longitude
- Display location on map (optional)
- Allow manual entry if GPS fails
- Validate coordinates are valid
- Store in database for geofencing

**Use Cases:**
- Attendance geofencing
- Location-based features
- Compliance requirements

**Priority:** P0  
**Complexity:** Medium

---

### FR-5: Document Upload System

**Description:** Upload and store 3 required legal documents

**Requirements:**
- Support drag-and-drop
- Support click to browse
- File type validation (PDF, PNG, JPEG)
- File size validation (max 1MB each)
- Upload to Cloudinary
- Store URLs in database
- Show upload progress
- Allow file replacement
- Preview uploaded files
- Continue button enabled only when all 3 uploaded

**Documents:**
1. CAC Document (Corporate Affairs Commission)
2. Proof of Address
3. Company Policy Document

**Priority:** P0  
**Complexity:** High

---

### FR-6: Plan Selection & Pricing

**Description:** Display plans with dynamic pricing calculation

**Plans:**

| Plan | Duration | Price per Employee | Features |
|------|----------|-------------------|----------|
| Silver Monthly | 30 days | ₦1,200/month | Attendance, Leave |
| Silver Yearly | 365 days | ₦12,000/year | Same + 16.7% discount |
| Gold Monthly | 30 days | ₦2,500/month | All + Tasks, Metrics, **FREE TRIAL** |
| Gold Yearly | 365 days | ₦25,000/year | Same + 16.7% discount |

**Pricing Formula:**
```
Total Price = (Price per Employee) × (Company Size)
```

**Requirements:**
- Display all 4 plans
- Calculate total based on company size
- Highlight FREE TRIAL for Gold Monthly
- Show savings for yearly plans
- Feature comparison table
- Clear CTA buttons
- Selected plan highlighted

**Priority:** P0  
**Complexity:** Medium

---

### FR-7: Payment Integration

**Description:** Process payments via Paystack

**Requirements:**
- Initialize Paystack transaction
- Redirect to Paystack payment page
- Handle payment callback
- Verify payment status
- Update subscription in database
- Send payment confirmation email
- Handle payment failures
- Skip payment for Gold trial

**Trial Logic:**
- New companies selecting Gold Monthly get 30-day trial
- Set `trial_start_date` = now
- Set `trial_end_date` = now + 30 days
- Set `subscription_plan` = 'trial'
- Set `subscription_status` = 'active'
- No payment required

**Priority:** P0  
**Complexity:** High

---

### FR-8: Email Verification

**Description:** Verify email address before proceeding

**Requirements:**
- Send 6-digit verification code
- Code expires in 10 minutes
- Allow resend (max 3 times per hour)
- Store code in database
- Validate code on submission
- Mark email as verified
- Block login until verified

**Priority:** P0  
**Complexity:** Medium

---

### FR-9: Data Persistence

**Description:** Save progress throughout onboarding

**Requirements:**
- Save after each stage completion
- Store in localStorage (frontend)
- Store in database (backend)
- Resume from last completed stage
- Clear data after completion
- Handle session expiry

**Priority:** P1  
**Complexity:** Medium

---

### FR-10: Review & Confirmation

**Description:** Display all collected information for review

**Requirements:**
- Show all user details
- Show all company details
- Show owner details (if applicable)
- Show uploaded documents with preview
- Edit buttons for each section
- Terms and conditions checkbox
- "Agree and Continue" button
- Cannot proceed without agreement

**Priority:** P0  
**Complexity:** Low

---

## 🎨 Non-Functional Requirements

### NFR-1: Design System

**Description:** Create comprehensive, reusable design system

**Requirements:**
- Consistent color palette
- Typography system
- Spacing system
- Component library
- No sharp edges (rounded corners)
- Smooth transitions
- Hover states
- Focus states
- Disabled states
- Loading states
- Error states
- Success states

**Components Needed:**
- Input (text, email, password, tel, number, date)
- Select/Dropdown (custom styled)
- Button (primary, secondary, outline, ghost)
- Checkbox
- Radio button
- File upload
- Progress stepper
- Card
- Modal
- Toast notifications
- Loading spinner
- Error message
- Success message

**Priority:** P0  
**Complexity:** High

---

### NFR-2: Responsive Design

**Description:** Work seamlessly on all devices

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Requirements:**
- Mobile-first approach
- Touch-friendly targets (min 44x44px)
- Readable text on all screens
- Optimized images
- Fast load times
- No horizontal scroll

**Priority:** P0  
**Complexity:** Medium

---

### NFR-3: Accessibility

**Description:** WCAG 2.1 AA compliance

**Requirements:**
- Keyboard navigation
- Screen reader support
- ARIA labels
- Focus indicators
- Color contrast (min 4.5:1)
- Alt text for images
- Form labels
- Error announcements
- Skip links

**Priority:** P1  
**Complexity:** Medium

---

### NFR-4: Performance

**Description:** Fast, smooth user experience

**Metrics:**
- Page load: < 2 seconds
- Time to interactive: < 3 seconds
- Form validation: Instant feedback
- File upload: Progress indicator
- API calls: Loading states
- Transitions: 60fps

**Requirements:**
- Code splitting
- Lazy loading
- Image optimization
- Caching strategy
- Debounced inputs
- Optimistic updates

**Priority:** P1  
**Complexity:** Medium

---

### NFR-5: Security

**Description:** Protect user data and prevent attacks

**Requirements:**
- Password strength validation
- Input sanitization
- XSS prevention
- CSRF protection
- SQL injection prevention
- Secure file uploads
- JWT token authentication
- HTTPS only
- Rate limiting
- Session management

**Priority:** P0  
**Complexity:** Medium

---

### NFR-6: Error Handling

**Description:** Graceful error handling and recovery

**Requirements:**
- Clear error messages
- Actionable guidance
- Retry mechanisms
- Fallback UI
- Error logging
- User-friendly language
- No technical jargon
- Contact support option

**Priority:** P1  
**Complexity:** Low

---

## 🔄 User Flow

```
START
  ↓
[1. Register] → Email + Password
  ↓
[2. Verify Email] → 6-digit code
  ↓
[3. Company Setup] → Personal details + "Are you owner?"
  ↓
  ├─ YES (Owner) ──────────────────┐
  │                                 ↓
  └─ NO (Admin) → [4. Owner Details]
                        ↓
[5. Business Info] → TIN, Size, Location, Logo
  ↓
[6. Documents] → Upload 3 files
  ↓
[7. Review] → Confirm all information
  ↓
[8. Plans] → Select subscription plan
  ↓
  ├─ Gold Trial → Skip payment ────┐
  │                                 ↓
  └─ Other Plans → [9. Payment]
                        ↓
[10. Complete] → Redirect to Dashboard
  ↓
END
```

---

## ✅ Acceptance Criteria

### Overall Success Criteria

- [ ] All 9 stages implemented and functional
- [ ] All required fields collected
- [ ] Role assignment logic working correctly
- [ ] Conditional owner details stage working
- [ ] Geolocation integration functional
- [ ] Document upload working with all validations
- [ ] Review page displays all information correctly
- [ ] Pricing calculation accurate
- [ ] Payment integration working
- [ ] Trial activation working
- [ ] Email verification working
- [ ] Data persistence working
- [ ] Mobile responsive
- [ ] Accessibility compliant
- [ ] Performance metrics met
- [ ] Security requirements met
- [ ] Error handling comprehensive
- [ ] Design system complete and reusable

### Stage-Specific Criteria

**Stage 1 - Registration:**
- [ ] Email and password fields only
- [ ] Password strength indicator
- [ ] Form validation
- [ ] Error messages
- [ ] Loading state
- [ ] Redirect to verification

**Stage 2 - Email Verification:**
- [ ] 6-digit code input
- [ ] Resend code button
- [ ] Code expiry handling
- [ ] Success message
- [ ] Redirect to company setup

**Stage 3 - Company Setup:**
- [ ] All personal fields present
- [ ] Phone number with country code
- [ ] Date of birth picker (18+ validation)
- [ ] "Are you owner?" checkbox
- [ ] Helper text for checkbox
- [ ] Form validation
- [ ] Save and continue

**Stage 4 - Owner Details (Conditional):**
- [ ] Only shown if user is not owner
- [ ] All owner fields present
- [ ] Form validation
- [ ] Save and continue

**Stage 5 - Business Info:**
- [ ] Company name field
- [ ] Tax ID field
- [ ] Company size (number input)
- [ ] Website field (optional)
- [ ] Geolocation button
- [ ] Location display
- [ ] Logo upload
- [ ] Form validation

**Stage 6 - Documents:**
- [ ] 3 file upload components
- [ ] Drag-and-drop working
- [ ] File type validation
- [ ] File size validation
- [ ] Upload progress
- [ ] File preview
- [ ] Replace file option
- [ ] Continue enabled only when all uploaded

**Stage 7 - Review:**
- [ ] All information displayed
- [ ] Documents with preview
- [ ] Edit buttons functional
- [ ] Terms checkbox
- [ ] Cannot proceed without agreement

**Stage 8 - Plans:**
- [ ] All 4 plans displayed
- [ ] Pricing calculated correctly
- [ ] FREE TRIAL highlighted
- [ ] Savings shown
- [ ] Feature comparison
- [ ] Plan selection working

**Stage 9 - Payment:**
- [ ] Paystack integration working
- [ ] Payment form functional
- [ ] Skip for trial
- [ ] Payment confirmation
- [ ] Error handling

**Stage 10 - Completion:**
- [ ] Success message
- [ ] Trial countdown (if applicable)
- [ ] Dashboard redirect
- [ ] Welcome email sent
- [ ] onboarding_completed flag set

---

## 📏 Constraints

### Technical Constraints
- Must use existing tech stack (Next.js, TypeScript, Tailwind)
- Must integrate with existing database schema
- Must use Supabase for database
- Must use Cloudinary for file uploads
- Must use Paystack for payments

### Business Constraints
- Must match documentation exactly
- Must collect all required fields
- Must support Nigerian currency (₦)
- Must comply with local regulations

### Time Constraints
- Target completion: 2-3 weeks
- Must be production-ready
- Must include tests

---

## 🚫 Out of Scope

- Google OAuth integration (future phase)
- Multi-language support (future phase)
- Dark mode (future phase)
- Advanced analytics (future phase)
- Bulk user import (future phase)
- API documentation (separate spec)
- Admin dashboard updates (separate spec)

---

## 📚 References

- [ONBOARDING_COMPLETE.md](../../../docs/ONBOARDING_COMPLETE.md)
- [onboarding.md](../../../docs/onboarding.md)
- [DATABASE_CONFIGURATION.md](../../../docs/db_docs/DATABASE_CONFIGURATION.md)
- [Supabase Database Schema](via MCP)

---

## 📝 Notes

- All pricing in Nigerian Naira (₦)
- Company size includes the registering user
- Trial is 30 days from activation
- Documents reviewed by super admin
- Email verification required before proceeding
- Role determines dashboard permissions

---

**Status:** ✅ Requirements Complete  
**Next Step:** Create design document  
**Approved By:** Pending  
**Date:** November 19, 2025
