# Onboarding Implementation Gaps Analysis

## 🔍 Current Status

After analyzing the documentation and comparing with the Supabase database schema and frontend implementation, here are the identified gaps:

---

## ✅ What's Already in Supabase Database

The `companies` table has ALL required fields:
- ✅ `tax_identification_number`
- ✅ `website`
- ✅ `cac_document_url`
- ✅ `proof_of_address_url`
- ✅ `company_policy_url`
- ✅ `onboarding_completed`
- ✅ `owner_first_name`
- ✅ `owner_last_name`
- ✅ `owner_email`
- ✅ `owner_phone`
- ✅ `owner_date_of_birth`
- ✅ `trial_start_date`
- ✅ `trial_end_date`
- ✅ `office_latitude`
- ✅ `office_longitude`

The `users` table has:
- ✅ `date_of_birth`
- ✅ `role` (with CHECK constraint for 'owner', 'admin', 'staff')

---

## ❌ Missing in Current Registration Flow

### 1. **Registration Page (`/onboarding/register`)**

**Currently Collecting:**
- First Name, Last Name
- Email, Password
- Company Name
- Industry (optional)
- Company Size (optional - dropdown)

**MISSING According to Docs:**
- ❌ Phone Number (required)
- ❌ Date of Birth (required)
- ❌ "Are you the company owner?" checkbox (determines role)
- ❌ Tax Identification Number (TIN)
- ❌ Website
- ❌ Head Office Location (geolocation)
- ❌ Company Logo upload

**Current Issue:**
The registration page is trying to collect everything in ONE step, but according to the documentation, this should be split into multiple stages.

---

## 📋 Correct Onboarding Flow (Per Documentation)

### Stage 1: Authentication (`/onboarding/register`)
**Should collect:**
- Email
- Password
- Confirm Password

**Then:**
- Send verification code
- Redirect to `/onboarding/verify`

### Stage 2: Company Setup (`/onboarding/company-setup`)
**Should collect:**
- Legal First Name
- Legal Last Name
- Email Address (pre-filled)
- Phone Number ⚠️ MISSING
- Date of Birth ⚠️ MISSING
- "Are you the company owner?" checkbox ⚠️ MISSING

**Role Logic:**
- If checkbox selected → `role = 'owner'`
- If NOT selected → `role = 'admin'` + show Stage 3

### Stage 3: Company Owner Details (`/onboarding/owner-details`) - CONDITIONAL
**Only shown if user is NOT the owner**

**Should collect:**
- Owner First Name
- Owner Last Name
- Owner Email
- Owner Phone
- Owner Date of Birth

**Current Status:** ✅ Page exists but may need updates

### Stage 4: Business Information (`/onboarding/business-info`)
**Should collect:**
- Company Legal Name
- Tax Identification Number (TIN) ⚠️ MISSING
- Company Size (number, not dropdown) ⚠️ WRONG FORMAT
- Website (optional)
- Head Office Location (auto-fetch via GPS) ⚠️ MISSING
- Company Logo (optional upload) ⚠️ MISSING

**Current Status:** ✅ Page exists but needs fields added

### Stage 5: Document Upload (`/onboarding/documents`)
**Should collect:**
- CAC Document (PDF/PNG/JPEG, max 1MB)
- Proof of Address (PDF/PNG/JPEG, max 1MB)
- Company Policy Document (PDF/PNG/JPEG, max 1MB)

**Current Status:** ✅ Page exists but needs implementation

### Stage 6: Review Page (`/onboarding/review`)
**Should display:**
- All collected information
- Company Logo
- TIN
- Company Size
- Website
- Head Office Address
- Owner Details
- Uploaded Documents

**Current Status:** ✅ Page exists but needs implementation

### Stage 7: Plans & Pricing (`/onboarding/plans`)
**Should display:**
- Silver Monthly (₦1,200/employee/month)
- Silver Yearly (₦12,000/employee/year)
- Gold Monthly (₦2,500/employee/month) - FREE TRIAL
- Gold Yearly (₦25,000/employee/year)

**Pricing Calculation:**
```
Total = (Price per Employee) × (Company Size)
```

**Current Status:** ✅ Page exists but needs pricing logic

### Stage 8: Payment (`/onboarding/payment`)
**Should handle:**
- Paystack integration
- Skip for Gold trial
- Process payment for Silver plans

**Current Status:** ⚠️ Needs implementation

### Stage 9: Completion
**Should:**
- Set `onboarding_completed = true`
- Redirect to `/dashboard`
- Send welcome email
- Start trial countdown (if Gold)

---

## 🔧 Required Backend Changes

### 1. Update Registration Service

**File:** `server/src/services/RegistrationService.ts`

**Current:** Creates company + user in one step

**Needed:** Split into stages:
- Stage 1: Create user only (email verification)
- Stage 2: Update user with personal details + role
- Stage 3: Add owner details to company (if applicable)
- Stage 4: Update company with business info
- Stage 5: Upload documents
- Stage 6: Review (no changes)
- Stage 7: Select plan
- Stage 8: Process payment
- Stage 9: Complete onboarding

### 2. New API Endpoints Needed

```typescript
// Stage 2: Update user details
POST /api/onboarding/user-details
{
  firstName, lastName, phoneNumber, dateOfBirth, isOwner
}

// Stage 3: Add owner details (conditional)
POST /api/onboarding/owner-details
{
  ownerFirstName, ownerLastName, ownerEmail, ownerPhone, ownerDateOfBirth
}

// Stage 4: Update business info
POST /api/onboarding/business-info
{
  companyName, taxId, companySize, website, officeLocation, logoUrl
}

// Stage 5: Upload documents
POST /api/onboarding/upload-document
FormData: { documentType, file }

// Stage 7: Select plan
POST /api/onboarding/select-plan
{
  plan: 'silver_monthly' | 'silver_yearly' | 'gold_monthly' | 'gold_yearly'
}

// Stage 8: Process payment
POST /api/onboarding/process-payment
{
  plan, paymentMethod: 'paystack'
}

// Stage 9: Complete onboarding
POST /api/onboarding/complete
```

### 3. Update Database Queries

**Add to companies table inserts:**
- `tax_identification_number`
- `website`
- `office_latitude`
- `office_longitude`
- `cac_document_url`
- `proof_of_address_url`
- `company_policy_url`
- `owner_first_name`, `owner_last_name`, `owner_email`, `owner_phone`, `owner_date_of_birth`
- `trial_start_date`, `trial_end_date`

**Add to users table inserts:**
- `date_of_birth`
- `phone_number`
- `role` (based on isOwner checkbox)

---

## 🎨 Required Frontend Changes

### 1. Split Registration Page

**Current:** `/onboarding/register` - collects everything

**New Structure:**
- `/onboarding/register` - Email + Password only
- `/onboarding/verify` - Email verification
- `/onboarding/company-setup` - Personal details + ownership
- `/onboarding/owner-details` - Owner info (conditional)
- `/onboarding/business-info` - Company details
- `/onboarding/documents` - Document uploads
- `/onboarding/review` - Review all info
- `/onboarding/plans` - Select plan
- `/onboarding/payment` - Payment (if not trial)
- `/dashboard` - Completion

### 2. Add Missing Form Fields

**Company Setup Page:**
- Phone Number input
- Date of Birth input (date picker)
- "Are you the company owner?" checkbox

**Business Info Page:**
- Tax ID input
- Company Size (number input, not dropdown)
- Geolocation button/auto-fetch
- Logo upload component

**Documents Page:**
- File upload for CAC
- File upload for Proof of Address
- File upload for Company Policy
- Preview uploaded files
- Enable Continue only when all 3 uploaded

**Review Page:**
- Display all collected data
- Show uploaded documents with preview
- "Agree and Continue" button

**Plans Page:**
- Display 4 plans with pricing
- Calculate total based on company size
- Highlight FREE TRIAL for Gold Monthly
- Show savings for yearly plans

### 3. Add State Management

Use Context or Zustand to manage onboarding state across pages:

```typescript
interface OnboardingState {
  // Stage 1
  email: string
  emailVerified: boolean
  
  // Stage 2
  firstName: string
  lastName: string
  phoneNumber: string
  dateOfBirth: string
  isOwner: boolean
  
  // Stage 3 (conditional)
  ownerFirstName?: string
  ownerLastName?: string
  ownerEmail?: string
  ownerPhone?: string
  ownerDateOfBirth?: string
  
  // Stage 4
  companyName: string
  taxId: string
  companySize: number
  website?: string
  officeLocation: { latitude: number; longitude: number }
  logoUrl?: string
  
  // Stage 5
  cacDocumentUrl?: string
  proofOfAddressUrl?: string
  companyPolicyUrl?: string
  
  // Stage 7
  selectedPlan?: string
  
  // Progress
  currentStage: number
  completedStages: number[]
}
```

---

## 🚀 Implementation Priority

### Phase 1: Critical (Must Have)
1. ✅ Split registration into stages
2. ✅ Add phone number field
3. ✅ Add date of birth field
4. ✅ Add "Are you owner?" checkbox
5. ✅ Add role logic (owner vs admin)
6. ✅ Add Tax ID field
7. ✅ Fix company size (number input)

### Phase 2: Important (Should Have)
8. ✅ Add geolocation for office
9. ✅ Add logo upload
10. ✅ Implement document upload
11. ✅ Create review page
12. ✅ Add owner details page (conditional)

### Phase 3: Nice to Have
13. ✅ Implement plans page with pricing
14. ✅ Add Paystack payment integration
15. ✅ Add trial logic
16. ✅ Send welcome email

---

## 📝 Summary

**Database:** ✅ Complete - All fields exist in Supabase

**Backend:** ⚠️ Partial - Registration works but missing:
- Multi-stage flow
- Owner details handling
- Document upload
- Plan selection
- Payment processing

**Frontend:** ❌ Incomplete - Major gaps:
- Single-page registration instead of multi-stage
- Missing required fields (phone, DOB, owner checkbox)
- Missing Tax ID, geolocation, logo upload
- No document upload implementation
- No review page implementation
- No plans/pricing implementation
- No payment integration

**Next Steps:**
1. Update registration page to collect only email/password
2. Create company-setup page with all required fields
3. Implement conditional owner-details page
4. Update business-info page with missing fields
5. Implement document upload functionality
6. Build review page
7. Implement plans/pricing page
8. Add payment integration
9. Update backend to handle multi-stage flow

---

**Last Updated:** November 19, 2025
**Status:** 🔴 Significant gaps identified
**Action Required:** Implement multi-stage onboarding flow
