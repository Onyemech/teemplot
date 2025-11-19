# Onboarding Redesign - Implementation Tasks

**Spec ID:** ONBOARD-001  
**Status:** 🔴 Ready to Start  
**Priority:** P0 - Critical  
**Created:** November 19, 2025

---

## 📊 Task Overview

**Total Tasks:** 45  
**Estimated Time:** 90 hours (2-3 weeks)  
**Phases:** 5

---

## 🎯 Phase 1: Design System Foundation

**Priority:** P0  
**Estimated Time:** 16 hours  
**Dependencies:** None

### Task 1.1: Create Design System CSS Variables
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 2 hours

**Description:**  
Create comprehensive CSS file with all design tokens (colors, typography, spacing, shadows, etc.)

**Acceptance Criteria:**
- [ ] Create `client/src/styles/design-system.css`
- [ ] Define all color variables (primary, accent, gray, semantic)
- [ ] Define typography variables (fonts, sizes, weights)
- [ ] Define spacing scale (0-24)
- [ ] Define border radius scale
- [ ] Define shadow scale
- [ ] Define transition variables
- [ ] Import in `globals.css`
- [ ] Test variables work in components

**Files to Create:**
- `client/src/styles/design-system.css`

**Files to Modify:**
- `client/src/styles/globals.css`

---

### Task 1.2: Build Input Component
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 3 hours

**Description:**  
Create reusable Input component with all states and variants

**Acceptance Criteria:**
- [ ] Create `client/src/components/ui/Input.tsx`
- [ ] Support all input types (text, email, password, tel, number, date)
- [ ] Implement all states (default, focus, error, success, disabled)
- [ ] Add icon support (left side)
- [ ] Add helper text support
- [ ] Add error message display
- [ ] Add required indicator
- [ ] Implement smooth transitions
- [ ] Add TypeScript types
- [ ] Test all states

**Files to Create:**
- `client/src/components/ui/Input.tsx`

---

### Task 1.3: Build Select/Dropdown Component
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 4 hours

**Description:**  
Create custom Select component with branded styling (NO SHARP EDGES!)

**Acceptance Criteria:**
- [ ] Create `client/src/components/ui/Select.tsx`
- [ ] Custom dropdown arrow icon
- [ ] Rounded corners (--radius-lg)
- [ ] Smooth open/close animation
- [ ] Keyboard navigation support
- [ ] Hover states for options
- [ ] Selected state with checkmark
- [ ] Error state support
- [ ] Disabled state support
- [ ] TypeScript types
- [ ] Test all interactions

**Files to Create:**
- `client/src/components/ui/Select.tsx`

---

### Task 1.4: Build Button Component
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 2 hours

**Description:**  
Create Button component with all variants and sizes

**Acceptance Criteria:**
- [ ] Create `client/src/components/ui/Button.tsx`
- [ ] Implement variants (primary, secondary, outline, ghost)
- [ ] Implement sizes (sm, md, lg)
- [ ] Add loading state with spinner
- [ ] Add disabled state
- [ ] Add icon support (left/right)
- [ ] Add fullWidth option
- [ ] Implement hover effects (lift + glow)
- [ ] TypeScript types
- [ ] Test all variants

**Files to Create:**
- `client/src/components/ui/Button.tsx`

---

### Task 1.5: Build Checkbox Component
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 1 hour

**Description:**  
Create Checkbox component with custom styling

**Acceptance Criteria:**
- [ ] Create `client/src/components/ui/Checkbox.tsx`
- [ ] Custom checkmark icon
- [ ] Rounded corners (--radius-sm)
- [ ] Smooth check animation
- [ ] Error state support
- [ ] Disabled state support
- [ ] Helper text support
- [ ] TypeScript types
- [ ] Test all states

**Files to Create:**
- `client/src/components/ui/Checkbox.tsx`

---

### Task 1.6: Build Card Component
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 1 hour

**Description:**  
Create Card component for content containers

**Acceptance Criteria:**
- [ ] Create `client/src/components/ui/Card.tsx`
- [ ] Support title and subtitle
- [ ] Support footer section
- [ ] Padding variants (sm, md, lg)
- [ ] Shadow support
- [ ] Hover effect (optional lift)
- [ ] Selected state support
- [ ] TypeScript types
- [ ] Test all variants

**Files to Create:**
- `client/src/components/ui/Card.tsx`

---

### Task 1.7: Build FileUpload Component
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 3 hours

**Description:**  
Create FileUpload component with drag-and-drop

**Acceptance Criteria:**
- [ ] Create `client/src/components/ui/FileUpload.tsx`
- [ ] Drag-and-drop functionality
- [ ] Click to browse
- [ ] File type validation
- [ ] File size validation
- [ ] Upload progress indicator
- [ ] File preview
- [ ] Remove file button
- [ ] Error state display
- [ ] TypeScript types
- [ ] Test all scenarios

**Files to Create:**
- `client/src/components/ui/FileUpload.tsx`

---

## 🔧 Phase 2: Specialized Components

**Priority:** P0  
**Estimated Time:** 12 hours  
**Dependencies:** Phase 1

### Task 2.1: Build DatePicker Component
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 3 hours

**Description:**  
Create DatePicker component with calendar UI

**Acceptance Criteria:**
- [ ] Create `client/src/components/ui/DatePicker.tsx`
- [ ] Calendar dropdown
- [ ] Date validation (18+ for DOB)
- [ ] Min/max date support
- [ ] Keyboard navigation
- [ ] Error state support
- [ ] TypeScript types
- [ ] Test date selection

**Files to Create:**
- `client/src/components/ui/DatePicker.tsx`

---

### Task 2.2: Build PhoneInput Component
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 3 hours

**Description:**  
Create PhoneInput with country code selector

**Acceptance Criteria:**
- [ ] Create `client/src/components/ui/PhoneInput.tsx`
- [ ] Country code dropdown
- [ ] Flag icons
- [ ] Phone number formatting
- [ ] Validation
- [ ] Error state support
- [ ] TypeScript types
- [ ] Test with different countries

**Files to Create:**
- `client/src/components/ui/PhoneInput.tsx`

---

### Task 2.3: Build Progress Stepper Component
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 3 hours

**Description:**  
Create Progress Stepper for onboarding flow

**Acceptance Criteria:**
- [ ] Create `client/src/components/ui/Stepper.tsx`
- [ ] Horizontal layout (desktop)
- [ ] Vertical layout (mobile)
- [ ] Numbered circles
- [ ] Connecting lines
- [ ] Completed/current/pending states
- [ ] Responsive design
- [ ] TypeScript types
- [ ] Test all states

**Files to Create:**
- `client/src/components/ui/Stepper.tsx`

---

### Task 2.4: Build Loading & Error Components
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 2 hours

**Description:**  
Create LoadingSpinner and ErrorMessage components

**Acceptance Criteria:**
- [ ] Create `client/src/components/shared/LoadingSpinner.tsx`
- [ ] Create `client/src/components/shared/ErrorMessage.tsx`
- [ ] Spinner animation
- [ ] Size variants
- [ ] Error message with icon
- [ ] Retry button support
- [ ] TypeScript types
- [ ] Test all variants

**Files to Create:**
- `client/src/components/shared/LoadingSpinner.tsx`
- `client/src/components/shared/ErrorMessage.tsx`

---

### Task 2.5: Create UI Components Index
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 1 hour

**Description:**  
Create index file for easy component imports

**Acceptance Criteria:**
- [ ] Create `client/src/components/ui/index.ts`
- [ ] Export all UI components
- [ ] Add JSDoc comments
- [ ] Test imports work

**Files to Create:**
- `client/src/components/ui/index.ts`

---

## 🗄️ Phase 3: State Management & Backend

**Priority:** P0  
**Estimated Time:** 23 hours  
**Dependencies:** None (can run parallel with Phase 1-2)

### Task 3.1: Create Onboarding Store
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 4 hours

**Description:**  
Set up Zustand store for onboarding state management

**Acceptance Criteria:**
- [ ] Install Zustand: `npm install zustand`
- [ ] Create `client/src/lib/store/onboardingStore.ts`
- [ ] Define OnboardingState interface
- [ ] Implement state actions for each stage
- [ ] Add localStorage persistence
- [ ] Add validation helpers
- [ ] TypeScript types
- [ ] Test state updates

**Files to Create:**
- `client/src/lib/store/onboardingStore.ts`

---

### Task 3.2: Create Custom Hooks
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 3 hours

**Description:**  
Create custom React hooks for common functionality

**Acceptance Criteria:**
- [ ] Create `client/src/lib/hooks/useOnboarding.ts`
- [ ] Create `client/src/lib/hooks/useGeolocation.ts`
- [ ] Create `client/src/lib/hooks/useFileUpload.ts`
- [ ] Create `client/src/lib/hooks/useFormValidation.ts`
- [ ] TypeScript types
- [ ] Test hooks

**Files to Create:**
- `client/src/lib/hooks/useOnboarding.ts`
- `client/src/lib/hooks/useGeolocation.ts`
- `client/src/lib/hooks/useFileUpload.ts`
- `client/src/lib/hooks/useFormValidation.ts`

---

### Task 3.3: Create API Client
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 2 hours

**Description:**  
Create API client for onboarding endpoints

**Acceptance Criteria:**
- [ ] Create `client/src/lib/api/onboarding.ts`
- [ ] Implement all API methods
- [ ] Add error handling
- [ ] Add TypeScript types
- [ ] Test API calls

**Files to Create:**
- `client/src/lib/api/onboarding.ts`

---

### Task 3.4: Update Registration Service (Backend)
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 4 hours

**Description:**  
Update RegistrationService to support multi-stage flow

**Acceptance Criteria:**
- [ ] Modify `server/src/services/RegistrationService.ts`
- [ ] Split registration into email-only first step
- [ ] Add updateUserDetails method
- [ ] Add updateOwnerDetails method
- [ ] Add updateBusinessInfo method
- [ ] Update database queries
- [ ] Add validation
- [ ] Test all methods

**Files to Modify:**
- `server/src/services/RegistrationService.ts`

---

### Task 3.5: Create Onboarding Service (Backend)
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 6 hours

**Description:**  
Create new OnboardingService for document upload and completion

**Acceptance Criteria:**
- [ ] Create `server/src/services/OnboardingService.ts`
- [ ] Implement document upload handler
- [ ] Integrate Cloudinary
- [ ] Implement plan selection logic
- [ ] Implement trial date calculation
- [ ] Implement onboarding completion
- [ ] Add validation
- [ ] TypeScript types
- [ ] Test all methods

**Files to Create:**
- `server/src/services/OnboardingService.ts`

---

### Task 3.6: Create Payment Service (Backend)
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 4 hours

**Description:**  
Create PaymentService for Paystack integration

**Acceptance Criteria:**
- [ ] Create `server/src/services/PaymentService.ts`
- [ ] Implement Paystack initialization
- [ ] Implement payment verification
- [ ] Implement subscription update
- [ ] Implement webhook handler
- [ ] Add error handling
- [ ] TypeScript types
- [ ] Test payment flow

**Files to Create:**
- `server/src/services/PaymentService.ts`

---

## 📄 Phase 4: Frontend Pages Implementation

**Priority:** P0  
**Estimated Time:** 32 hours  
**Dependencies:** Phase 1, 2, 3

### Task 4.1: Update Registration Page (Stage 1)
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 3 hours

**Description:**  
Simplify registration to email + password only

**Acceptance Criteria:**
- [ ] Modify `client/src/app/onboarding/register/page.tsx`
- [ ] Remove company fields
- [ ] Keep only email and password
- [ ] Add password strength indicator
- [ ] Use new Input and Button components
- [ ] Implement form validation
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test registration flow

**Files to Modify:**
- `client/src/app/onboarding/register/page.tsx`

---

### Task 4.2: Create Company Setup Page (Stage 2)
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 4 hours

**Description:**  
Create company-setup page with personal details and ownership checkbox

**Acceptance Criteria:**
- [ ] Create/update `client/src/app/onboarding/company-setup/page.tsx`
- [ ] Add first name, last name fields
- [ ] Add PhoneInput component
- [ ] Add DatePicker for DOB (18+ validation)
- [ ] Add "Are you the company owner?" checkbox
- [ ] Add helper text for checkbox
- [ ] Implement role logic
- [ ] Use onboarding store
- [ ] Add validation
- [ ] Test all fields

**Files to Create/Modify:**
- `client/src/app/onboarding/company-setup/page.tsx`

---

### Task 4.3: Update Owner Details Page (Stage 3)
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 3 hours

**Description:**  
Update owner-details page with conditional rendering

**Acceptance Criteria:**
- [ ] Modify `client/src/app/onboarding/owner-details/page.tsx`
- [ ] Add conditional rendering (only if not owner)
- [ ] Add all owner fields
- [ ] Use PhoneInput and DatePicker
- [ ] Implement validation
- [ ] Use onboarding store
- [ ] Add skip logic
- [ ] Test conditional flow

**Files to Modify:**
- `client/src/app/onboarding/owner-details/page.tsx`

---

### Task 4.4: Update Business Info Page (Stage 4)
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 5 hours

**Description:**  
Update business-info page with all missing fields

**Acceptance Criteria:**
- [ ] Modify `client/src/app/onboarding/business-info/page.tsx`
- [ ] Add Tax ID input
- [ ] Change company size to number input
- [ ] Add website input (optional)
- [ ] Add geolocation button
- [ ] Display location on map (optional)
- [ ] Add logo upload (FileUpload component)
- [ ] Implement validation
- [ ] Use onboarding store
- [ ] Test all fields

**Files to Modify:**
- `client/src/app/onboarding/business-info/page.tsx`

---

### Task 4.5: Update Documents Page (Stage 5)
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 5 hours

**Description:**  
Implement document upload functionality

**Acceptance Criteria:**
- [ ] Modify `client/src/app/onboarding/documents/page.tsx`
- [ ] Add 3 FileUpload components
- [ ] Implement Cloudinary upload
- [ ] Show upload progress
- [ ] Add file preview
- [ ] Enable continue only when all uploaded
- [ ] Implement validation
- [ ] Use onboarding store
- [ ] Test upload flow

**Files to Modify:**
- `client/src/app/onboarding/documents/page.tsx`

---

### Task 4.6: Update Review Page (Stage 6)
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 4 hours

**Description:**  
Build review page to display all collected information

**Acceptance Criteria:**
- [ ] Modify `client/src/app/onboarding/review/page.tsx`
- [ ] Display all user details
- [ ] Display all company details
- [ ] Display owner details (if applicable)
- [ ] Display uploaded documents with preview
- [ ] Add edit buttons for each section
- [ ] Add terms and conditions checkbox
- [ ] Add "Agree and Continue" button
- [ ] Use onboarding store
- [ ] Test review flow

**Files to Modify:**
- `client/src/app/onboarding/review/page.tsx`

---

### Task 4.7: Update Plans Page (Stage 7)
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 5 hours

**Description:**  
Implement plans page with pricing calculation

**Acceptance Criteria:**
- [ ] Modify `client/src/app/onboarding/plans/page.tsx`
- [ ] Display 4 plan cards
- [ ] Implement pricing calculation
- [ ] Highlight FREE TRIAL
- [ ] Show savings for yearly plans
- [ ] Add feature comparison table
- [ ] Implement plan selection
- [ ] Use onboarding store
- [ ] Test pricing logic

**Files to Modify:**
- `client/src/app/onboarding/plans/page.tsx`

---

### Task 4.8: Create Payment Page (Stage 8)
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 6 hours

**Description:**  
Create payment page with Paystack integration

**Acceptance Criteria:**
- [ ] Create `client/src/app/onboarding/payment/page.tsx`
- [ ] Integrate Paystack
- [ ] Add payment form
- [ ] Implement skip logic for trial
- [ ] Add payment confirmation
- [ ] Handle payment callbacks
- [ ] Add error handling
- [ ] Use onboarding store
- [ ] Test payment flow

**Files to Create:**
- `client/src/app/onboarding/payment/page.tsx`

---

### Task 4.9: Create Completion Page (Stage 9)
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 3 hours

**Description:**  
Create completion page with success message

**Acceptance Criteria:**
- [ ] Create `client/src/app/onboarding/complete/page.tsx`
- [ ] Add success animation
- [ ] Show trial countdown (if applicable)
- [ ] Add "Go to Dashboard" button
- [ ] Trigger welcome email
- [ ] Update onboarding_completed flag
- [ ] Clear onboarding store
- [ ] Test completion flow

**Files to Create:**
- `client/src/app/onboarding/complete/page.tsx`

---

## 🧪 Phase 5: Testing & Polish

**Priority:** P1  
**Estimated Time:** 14 hours  
**Dependencies:** Phase 4

### Task 5.1: Write Component Unit Tests
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 6 hours

**Description:**  
Write unit tests for all UI components

**Acceptance Criteria:**
- [ ] Test Input component
- [ ] Test Select component
- [ ] Test Button component
- [ ] Test Checkbox component
- [ ] Test FileUpload component
- [ ] Test DatePicker component
- [ ] Test PhoneInput component
- [ ] Test Stepper component
- [ ] Test Card component
- [ ] 80%+ coverage

**Files to Create:**
- `client/src/components/ui/__tests__/*.test.tsx`

---

### Task 5.2: Write Integration Tests
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 4 hours

**Description:**  
Write integration tests for onboarding flow

**Acceptance Criteria:**
- [ ] Test complete onboarding flow
- [ ] Test conditional logic (owner vs admin)
- [ ] Test payment flow
- [ ] Test trial activation
- [ ] Test error scenarios

**Files to Create:**
- `client/src/__tests__/onboarding.test.tsx`

---

### Task 5.3: UI/UX Polish
**Status:** ⬜ Todo  
**Assignee:** Unassigned  
**Estimated Time:** 4 hours

**Description:**  
Polish UI with animations and improvements

**Acceptance Criteria:**
- [ ] Add page transitions
- [ ] Add loading skeletons
- [ ] Improve error messages
- [ ] Add success feedback
- [ ] Optimize for mobile
- [ ] Test on different devices
- [ ] Fix any UI bugs

---

## 📋 Task Checklist

### Phase 1: Design System Foundation (16h)
- [ ] Task 1.1: Create Design System CSS Variables (2h)
- [ ] Task 1.2: Build Input Component (3h)
- [ ] Task 1.3: Build Select/Dropdown Component (4h)
- [ ] Task 1.4: Build Button Component (2h)
- [ ] Task 1.5: Build Checkbox Component (1h)
- [ ] Task 1.6: Build Card Component (1h)
- [ ] Task 1.7: Build FileUpload Component (3h)

### Phase 2: Specialized Components (12h)
- [ ] Task 2.1: Build DatePicker Component (3h)
- [ ] Task 2.2: Build PhoneInput Component (3h)
- [ ] Task 2.3: Build Progress Stepper Component (3h)
- [ ] Task 2.4: Build Loading & Error Components (2h)
- [ ] Task 2.5: Create UI Components Index (1h)

### Phase 3: State Management & Backend (23h)
- [ ] Task 3.1: Create Onboarding Store (4h)
- [ ] Task 3.2: Create Custom Hooks (3h)
- [ ] Task 3.3: Create API Client (2h)
- [ ] Task 3.4: Update Registration Service (4h)
- [ ] Task 3.5: Create Onboarding Service (6h)
- [ ] Task 3.6: Create Payment Service (4h)

### Phase 4: Frontend Pages (32h)
- [ ] Task 4.1: Update Registration Page (3h)
- [ ] Task 4.2: Create Company Setup Page (4h)
- [ ] Task 4.3: Update Owner Details Page (3h)
- [ ] Task 4.4: Update Business Info Page (5h)
- [ ] Task 4.5: Update Documents Page (5h)
- [ ] Task 4.6: Update Review Page (4h)
- [ ] Task 4.7: Update Plans Page (5h)
- [ ] Task 4.8: Create Payment Page (6h)
- [ ] Task 4.9: Create Completion Page (3h)

### Phase 5: Testing & Polish (14h)
- [ ] Task 5.1: Write Component Unit Tests (6h)
- [ ] Task 5.2: Write Integration Tests (4h)
- [ ] Task 5.3: UI/UX Polish (4h)

---

## 📊 Progress Tracking

**Total Progress:** 0/45 tasks (0%)

**Phase Progress:**
- Phase 1: 0/7 tasks (0%)
- Phase 2: 0/5 tasks (0%)
- Phase 3: 0/6 tasks (0%)
- Phase 4: 0/9 tasks (0%)
- Phase 5: 0/3 tasks (0%)

---

**Status:** ✅ Tasks Defined - Ready to Start  
**Next Step:** Begin Phase 1 implementation  
**Estimated Completion:** 2-3 weeks  
**Date:** November 19, 2025
