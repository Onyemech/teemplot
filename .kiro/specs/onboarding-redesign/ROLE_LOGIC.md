# Role Assignment & Employee Counting Logic

**Version:** 2.0  
**Date:** November 19, 2025  
**Status:** 🔴 Critical - Must Implement

---

## 🎯 Core Rules

### Rule 1: Three Roles System
- **Owner** - Full control, created company
- **Admin** - Can manage Staff, cannot modify Owner
- **Staff** - Regular employees

### Rule 2: Default Role
- Person registering starts with `role = 'owner'` (default)

### Rule 3: Role Changes Based on Ownership
- If registrant IS owner → Keep `role = 'owner'`
- If registrant is NOT owner → Change to `role = 'admin'`, create actual owner

### Rule 4: Employee Counting
- Registrant = 1 employee
- If owner email ≠ registrant email → +1 employee (owner)
- Total = registrant + owner (if different)

---

## 📊 Flow Diagrams

### Scenario A: Registrant IS Owner

```
┌─────────────────────────────────────┐
│ Stage 1: Registration               │
│ Email: john@company.com             │
│ Role: owner (default)               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Stage 2: Company Setup              │
│ "Are you the owner?" ☑ YES          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Result:                             │
│ - john@company.com: role = 'owner'  │
│ - Employee count: 1                 │
│ - Skip Stage 3 (owner details)      │
└─────────────────────────────────────┘
```

### Scenario B: Registrant is NOT Owner

```
┌─────────────────────────────────────┐
│ Stage 1: Registration               │
│ Email: admin@company.com            │
│ Role: owner (default)               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Stage 2: Company Setup              │
│ "Are you the owner?" ☐ NO           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Stage 3: Owner Details              │
│ Owner Email: john@company.com       │
│ Owner Name: John Doe                │
│ Owner Phone: +234...                │
│ Owner DOB: 1980-01-01               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ System Checks:                      │
│ john@company.com ≠ admin@company.com│
│ (Different emails)                  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Result:                             │
│ 1. admin@company.com:               │
│    - Role changed: owner → admin    │
│                                     │
│ 2. john@company.com:                │
│    - New user created               │
│    - Role: owner                    │
│    - Invitation email sent          │
│                                     │
│ 3. Employee count: 2                │
└─────────────────────────────────────┘
```

---

## 💻 Implementation Code

### Backend Service

```typescript
// services/OnboardingService.ts

interface OwnershipResult {
  registrantRole: 'owner' | 'admin'
  employeeCount: number
  createOwnerRecord: boolean
  ownerData?: {
    email: string
    firstName: string
    lastName: string
    phone: string
    dateOfBirth: string
    role: 'owner'
  }
}

export class OnboardingService {
  
  async processOwnership(
    registrantId: string,
    registrantEmail: string,
    companyId: string,
    isOwner: boolean,
    ownerDetails?: {
      email: string
      firstName: string
      lastName: string
      phone: string
      dateOfBirth: string
    }
  ): Promise<OwnershipResult> {
    
    // Scenario A: Registrant IS owner
    if (isOwner) {
      return {
        registrantRole: 'owner',
        employeeCount: 1,
        createOwnerRecord: false
      }
    }
    
    // Scenario B: Registrant is NOT owner
    if (!ownerDetails) {
      throw new Error('Owner details required when registrant is not owner')
    }
    
    // Check if owner email is different
    if (ownerDetails.email !== registrantEmail) {
      // Different emails - create separate owner
      return {
        registrantRole: 'admin',
        employeeCount: 2,
        createOwnerRecord: true,
        ownerData: {
          ...ownerDetails,
          role: 'owner'
        }
      }
    }
    
    // Same email - keep as owner
    return {
      registrantRole: 'owner',
      employeeCount: 1,
      createOwnerRecord: false
    }
  }
  
  async updateRolesAndCount(
    registrantId: string,
    companyId: string,
    result: OwnershipResult
  ): Promise<void> {
    const db = DatabaseFactory.getPrimaryDatabase()
    
    // Start transaction
    await db.transaction(async (txDb) => {
      
      // 1. Update registrant role
      await txDb.update('users', 
        { role: result.registrantRole },
        { id: registrantId }
      )
      
      // 2. Create owner record if needed
      if (result.createOwnerRecord && result.ownerData) {
        const ownerId = randomUUID()
        
        await txDb.insert('users', {
          id: ownerId,
          company_id: companyId,
          email: result.ownerData.email,
          first_name: result.ownerData.firstName,
          last_name: result.ownerData.lastName,
          phone_number: result.ownerData.phone,
          date_of_birth: result.ownerData.dateOfBirth,
          role: 'owner',
          is_active: true,
          email_verified: false,
          created_at: new Date(),
          updated_at: new Date()
        })
        
        // Send invitation email to owner
        await this.sendOwnerInvitation(result.ownerData.email, companyId)
      }
      
      // 3. Update employee count
      await txDb.update('companies',
        { employee_count: result.employeeCount },
        { id: companyId }
      )
    })
  }
  
  private async sendOwnerInvitation(
    ownerEmail: string,
    companyId: string
  ): Promise<void> {
    // TODO: Implement email sending
    logger.info(`Invitation sent to owner: ${ownerEmail}`)
  }
}
```

### API Endpoint

```typescript
// routes/onboarding.routes.ts

router.post('/company-setup', async (request, reply) => {
  const { userId, companyId } = request.user
  const { isOwner, ownerDetails } = request.body
  
  const onboardingService = new OnboardingService()
  
  // Get registrant email
  const user = await db.findOne('users', { id: userId })
  
  // Process ownership logic
  const result = await onboardingService.processOwnership(
    userId,
    user.email,
    companyId,
    isOwner,
    ownerDetails
  )
  
  // Update roles and employee count
  await onboardingService.updateRolesAndCount(
    userId,
    companyId,
    result
  )
  
  return reply.send({
    success: true,
    data: {
      role: result.registrantRole,
      employeeCount: result.employeeCount,
      ownerCreated: result.createOwnerRecord
    }
  })
})
```

---

## 🗄️ Database Schema Updates

```sql
-- Ensure 3 roles are supported
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check 
CHECK (role IN ('owner', 'admin', 'staff'));

-- Add employee count to companies
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS employee_count INTEGER NOT NULL DEFAULT 1 CHECK (employee_count >= 1);

-- Remove old company_size varchar if exists
ALTER TABLE companies
DROP COLUMN IF EXISTS company_size;

-- Add invitation tracking
ALTER TABLE users
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMPTZ;
```

---

## 🧪 Test Cases

### Test 1: Registrant is Owner
```typescript
test('should keep registrant as owner when they are the owner', async () => {
  const result = await onboardingService.processOwnership(
    'user-123',
    'john@company.com',
    'company-123',
    true, // isOwner = true
    undefined
  )
  
  expect(result.registrantRole).toBe('owner')
  expect(result.employeeCount).toBe(1)
  expect(result.createOwnerRecord).toBe(false)
})
```

### Test 2: Registrant is NOT Owner (Different Email)
```typescript
test('should change registrant to admin and create owner when emails differ', async () => {
  const result = await onboardingService.processOwnership(
    'user-123',
    'admin@company.com',
    'company-123',
    false, // isOwner = false
    {
      email: 'john@company.com', // Different email
      firstName: 'John',
      lastName: 'Doe',
      phone: '+234...',
      dateOfBirth: '1980-01-01'
    }
  )
  
  expect(result.registrantRole).toBe('admin')
  expect(result.employeeCount).toBe(2)
  expect(result.createOwnerRecord).toBe(true)
  expect(result.ownerData?.email).toBe('john@company.com')
  expect(result.ownerData?.role).toBe('owner')
})
```

### Test 3: Registrant is NOT Owner (Same Email)
```typescript
test('should keep registrant as owner when emails match', async () => {
  const result = await onboardingService.processOwnership(
    'user-123',
    'john@company.com',
    'company-123',
    false, // isOwner = false
    {
      email: 'john@company.com', // Same email
      firstName: 'John',
      lastName: 'Doe',
      phone: '+234...',
      dateOfBirth: '1980-01-01'
    }
  )
  
  expect(result.registrantRole).toBe('owner')
  expect(result.employeeCount).toBe(1)
  expect(result.createOwnerRecord).toBe(false)
})
```

---

## 📋 Checklist

- [ ] Update database schema (3 roles, employee_count)
- [ ] Implement OnboardingService.processOwnership()
- [ ] Implement OnboardingService.updateRolesAndCount()
- [ ] Create API endpoint POST /api/onboarding/company-setup
- [ ] Update frontend company-setup page
- [ ] Add owner details conditional page
- [ ] Implement email invitation system
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation
- [ ] Test all scenarios

---

**Status:** 🔴 Critical Implementation Required  
**Priority:** P0  
**Estimated Time:** 8 hours  
**Dependencies:** Database migration, Email service
