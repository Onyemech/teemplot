# Critical Updates - November 19, 2025

## 🚨 IMPORTANT CHANGES TO IMPLEMENT

### 1. Company Size - Manual Input (NOT Dropdown)

**OLD (WRONG):**
```typescript
// Dropdown with ranges
<select>
  <option>1-10 employees</option>
  <option>11-50 employees</option>
  <option>51-200 employees</option>
</select>
```

**NEW (CORRECT):**
```typescript
// Manual number input
<Input
  type="number"
  label="Number of Employees"
  min={1}
  placeholder="e.g., 25"
  helperText="Total number of employees in your company"
/>
```

**Reason:** Need exact numbers for accurate pricing calculation, not ranges.

---

### 2. Three Roles System (NOT Two)

**OLD (WRONG):**
- Owner
- Admin

**NEW (CORRECT):**
- **Owner** - Person who registered the company (full control)
- **Admin** - Can manage Staff, but NOT Owner
- **Staff** - Regular employees

**Database Update:**
```sql
-- Update CHECK constraint
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check 
CHECK (role IN ('owner', 'admin', 'staff'));
```

---

### 3. Smart Employee Counting & Role Assignment Logic

**Scenario 1: Registrant IS Owner**
```
User registers: john@company.com
"Are you the owner?" → YES
Owner email: john@company.com (same)

Result:
- Registrant role: OWNER
- Employee Count: 1 (just the registrant)
- No additional owner record needed
```

**Scenario 2: Registrant is NOT Owner**
```
User registers: admin@company.com
"Are you the owner?" → NO
Owner email: john@company.com (different)

Result:
- Registrant role: ADMIN (changed from default owner)
- Owner role: Assigned to john@company.com (new user record)
- Employee Count: 2 (registrant + owner)
- System creates placeholder owner record
```

**Implementation:**
```typescript
const processOwnershipLogic = (
  registrantEmail: string,
  isOwner: boolean,
  ownerDetails?: {
    email: string,
    firstName: string,
    lastName: string,
    phone: string,
    dateOfBirth: string
  }
) => {
  if (isOwner) {
    // Scenario 1: Registrant is owner
    return {
      registrantRole: 'owner',
      employeeCount: 1,
      createOwnerRecord: false
    }
  }
  
  // Scenario 2: Registrant is NOT owner
  if (ownerDetails && ownerDetails.email !== registrantEmail) {
    return {
      registrantRole: 'admin', // Change from default 'owner' to 'admin'
      employeeCount: 2, // Registrant + Owner
      createOwnerRecord: true,
      ownerData: {
        email: ownerDetails.email,
        firstName: ownerDetails.firstName,
        lastName: ownerDetails.lastName,
        phone: ownerDetails.phone,
        dateOfBirth: ownerDetails.dateOfBirth,
        role: 'owner', // Actual owner
        isActive: true,
        emailVerified: false, // Owner needs to verify
        // Generate temporary password or send invitation
      }
    }
  }
  
  return {
    registrantRole: 'owner',
    employeeCount: 1,
    createOwnerRecord: false
  }
}
```

**Database Operations:**
```typescript
// Step 1: Create registrant user
const registrant = await db.insert('users', {
  id: registrantId,
  company_id: companyId,
  email: registrantEmail,
  role: 'owner', // Default initially
  // ... other fields
})

// Step 2: If registrant is NOT owner, update roles
if (!isOwner && ownerEmail !== registrantEmail) {
  // Update registrant role to admin
  await db.update('users', 
    { role: 'admin' },
    { id: registrantId }
  )
  
  // Create owner user record
  await db.insert('users', {
    id: ownerId,
    company_id: companyId,
    email: ownerEmail,
    first_name: ownerFirstName,
    last_name: ownerLastName,
    phone_number: ownerPhone,
    date_of_birth: ownerDateOfBirth,
    role: 'owner', // Actual owner
    is_active: true,
    email_verified: false,
    // Send invitation email to owner
  })
  
  // Update employee count
  await db.update('companies',
    { employee_count: 2 },
    { id: companyId }
  )
}
```

---

### 4. Role Assignment Rules

**Initial Registration:**
- Person registering starts with "owner" role (default)

**After Owner Verification (Stage 3):**

**IF** registrant says "I am the owner" (checkbox checked):
- ✅ Registrant keeps "owner" role
- ✅ Employee count = 1

**IF** registrant says "I am NOT the owner" (checkbox unchecked):
- ✅ Registrant role changes to "admin"
- ✅ Owner details collected (email, name, phone, DOB)
- ✅ New user record created with "owner" role
- ✅ Employee count = 2 (registrant + owner)
- ✅ Invitation email sent to actual owner

**Logic Flow:**
```typescript
// Stage 1: Registration
user.role = 'owner' // Default

// Stage 2: Company Setup
if (isOwner === true) {
  // Keep as owner
  user.role = 'owner'
  employeeCount = 1
} else {
  // Stage 3: Owner Details collected
  if (ownerEmail !== user.email) {
    // Change registrant to admin
    user.role = 'admin'
    
    // Create actual owner
    createUser({
      email: ownerEmail,
      role: 'owner',
      // ... owner details
    })
    
    employeeCount = 2
  }
}
```

---

### 5. Owner Invitation System

**Feature:** Owner can invite Admin and Staff via email

**Database Schema:**
```sql
CREATE TABLE user_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  invited_by UUID NOT NULL REFERENCES users(id),
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'staff')),
  invitation_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, email)
);
```

**Flow:**
1. Owner goes to "Team" section
2. Clicks "Invite Member"
3. Enters: Email, First Name, Last Name, Role (Admin/Staff)
4. System sends invitation email with token
5. Invitee clicks link, sets password, joins company

---

### 6. Admin Permissions

**What Admin CAN do:**
- ✅ Create Staff accounts
- ✅ Update Staff details
- ✅ Deactivate Staff accounts
- ✅ View all Staff
- ✅ Assign tasks to Staff
- ✅ View reports

**What Admin CANNOT do:**
- ❌ Modify Owner account
- ❌ Delete Owner
- ❌ Change Owner permissions
- ❌ Delete company
- ❌ Change subscription plan (Owner only)

**Implementation:**
```typescript
// Middleware check
const canModifyUser = (
  currentUser: User,
  targetUser: User
): boolean => {
  // Owner can modify anyone
  if (currentUser.role === 'owner') return true
  
  // Admin cannot modify owner
  if (currentUser.role === 'admin' && targetUser.role === 'owner') {
    return false
  }
  
  // Admin can modify staff
  if (currentUser.role === 'admin' && targetUser.role === 'staff') {
    return true
  }
  
  return false
}
```

---

### 7. Updated Database Schema

```sql
-- Companies table (updated)
ALTER TABLE companies
DROP COLUMN IF EXISTS company_size; -- Remove old varchar

ALTER TABLE companies
ADD COLUMN employee_count INTEGER NOT NULL DEFAULT 1 CHECK (employee_count >= 1);

-- Users table (updated)
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check 
CHECK (role IN ('owner', 'admin', 'staff'));

-- Add invitation tracking
ALTER TABLE users
ADD COLUMN invited_by UUID REFERENCES users(id),
ADD COLUMN invitation_accepted_at TIMESTAMPTZ;
```

---

### 8. Pricing Calculation Update

**OLD:**
```typescript
// Based on range
if (companySize === '1-10') {
  pricePerEmployee = 1200
}
```

**NEW:**
```typescript
// Based on exact count
const totalPrice = pricePerEmployee * employeeCount

// Example:
// 25 employees × ₦1,200 = ₦30,000/month
```

---

### 9. Onboarding Flow Updates

**Stage 2: Company Setup**
```typescript
{
  firstName: string
  lastName: string
  email: string // Pre-filled from registration
  phoneNumber: string
  dateOfBirth: date
  isOwner: boolean // Checkbox: "I am the company owner"
}
```

**Stage 3: Owner Details (Conditional)**
Only shown if `isOwner === false`
```typescript
{
  ownerFirstName: string
  ownerLastName: string
  ownerEmail: string
  ownerPhone: string
  ownerDateOfBirth: date
}
```

**Stage 4: Business Info**
```typescript
{
  companyName: string
  taxId: string
  employeeCount: number // MANUAL INPUT, NOT DROPDOWN
  website?: string
  officeLocation: { lat: number, lng: number }
  logo?: File
}
```

---

### 10. API Endpoints to Update

**POST /api/onboarding/company-setup**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+234...",
  "dateOfBirth": "1990-01-01",
  "isOwner": true
}
```

**POST /api/onboarding/business-info**
```json
{
  "companyName": "Acme Corp",
  "taxId": "12345678",
  "employeeCount": 25,  // NOT a range!
  "website": "https://acme.com",
  "officeLocation": {
    "latitude": 6.5244,
    "longitude": 3.3792
  }
}
```

**POST /api/team/invite**
```json
{
  "email": "staff@company.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "staff"  // or "admin"
}
```

---

## Summary of Changes

1. ✅ Company size → Manual number input
2. ✅ Roles → Owner, Admin, Staff (3 roles)
3. ✅ Smart employee counting based on owner match
4. ✅ Default role → Owner for registrant
5. ✅ Owner can invite Admin/Staff
6. ✅ Admin cannot modify Owner
7. ✅ Accurate pricing based on exact employee count

---

**Status:** 🔴 CRITICAL - Must implement before launch  
**Priority:** P0  
**Impact:** Database schema, API, Frontend, Pricing logic  
**Date:** November 19, 2025
