# Complete Onboarding Flow Documentation

## Overview
This document describes the complete onboarding flow for Teemplot, including all stages, roles, pricing plans, and technical implementation details.

## Onboarding Stages

### Stage 1: Authentication
**Route**: `/onboarding/auth`

Users can authenticate using:
1. **Google OAuth** - No email verification required
2. **Email + Password** - Requires email verification

**For Email Authentication**:
- System sends 6-digit verification code to email
- Code expires in 10 minutes
- User must verify before proceeding

### Stage 2: Company Setup (Basic Info)
**Route**: `/onboarding/company-setup`

Collect basic user/company representative details:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Legal First Name | String | Yes | Min 2 chars |
| Legal Last Name | String | Yes | Min 2 chars |
| Email Address | Email | Yes | Valid email format |
| Phone Number | String | Yes | Valid phone format |
| Date of Birth | Date | Yes | Must be 18+ |
| Are you the company owner? | Checkbox | Yes | Determines role |

**Role Assignment**:
- If checkbox selected → Role = `owner`
- If checkbox not selected → Role = `admin`

**Note**: If user is NOT the owner, they will need to provide owner details in the next stage.

### Stage 3: Company Owner Details (Conditional)
**Route**: `/onboarding/owner-details`

**Shown only if**: User indicated they are NOT the owner in Stage 2

Collect dedicated owner information:

| Field | Type | Required |
|-------|------|----------|
| Owner First Name | String | Yes |
| Owner Last Name | String | Yes |
| Owner Email Address | Email | Yes |
| Owner Phone Number | String | Yes |
| Owner Date of Birth | Date | Yes |

### Stage 4: Business Information
**Route**: `/onboarding/business-info`

Collect complete company data:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Company Legal Name | String | Yes | Min 2 chars |
| Tax Identification Number (TIN) | String | Yes | Valid TIN format |
| Company Size | Number | Yes | Must be ≥ 1 |
| Website | URL | No | Valid URL format |
| Head Office Location | Geolocation | Yes | Auto-fetched via GPS |
| Company Logo | File | No | PNG/JPEG, max 2MB |

**Company Size Note**: 
- Number includes the registering user
- Used for pricing calculation
- Minimum value: 1

**Head Office Location**:
- Automatically fetched via browser geolocation API
- Stored as latitude/longitude
- Used for geofencing attendance tracking

### Stage 5: Document Upload
**Route**: `/onboarding/documents`

Users must upload required legal documents:

| Document Type | Purpose | Format | Max Size | Required |
|--------------|---------|--------|----------|----------|
| CAC Document | Verify business registration | PDF/PNG/JPEG | 1 MB | Yes |
| Proof of Address | Verify business address | PDF/PNG/JPEG | 1 MB | Yes |
| Company Policy Document | HR/operational policies | PDF/PNG/JPEG | 1 MB | Yes |

**Upload Process**:
1. Files uploaded to Cloudinary
2. URLs stored in database
3. Continue button enabled only when all 3 documents uploaded
4. Documents reviewed by super admin

### Stage 6: Review Page
**Route**: `/onboarding/review`

Users review all provided information:

**Sections Displayed**:
- Company Logo (if uploaded)
- Company Legal Name
- Tax Identification Number (TIN)
- Company Size
- Website (if provided)
- Head Office Address
- Company Owner Details
- Uploaded Documents (with preview links)

**Button**:
- Label: "Agree and Continue"
- Background: Dark Green (#1a5f3f)
- Text: White
- Action: Proceed to plan selection

### Stage 7: Plans & Pricing
**Route**: `/onboarding/plans`

**Pricing Model**: Per employee billing
```
Total Price = (Price per Employee) × (Company Size)
```

**Plans Offered**:

#### Silver Monthly (30 Days)
- **Price**: ₦1,200 per employee/month
- **Features**:
  - ✅ Clock-in/Clock-out (Attendance Management)
  - ✅ Leave Management
  - ✅ Leave Balance Configuration
  - ✅ Attendance Data Access
  - ❌ Task Assignment
  - ❌ Performance Metrics
  - ❌ Advanced Features

#### Silver Yearly (365 Days)
- **Price**: ₦12,000 per employee/year
- **Savings**: 16.7% discount (₦2,400 saved per employee)
- **Features**: Same as Silver Monthly
- **Duration**: 12 months

#### Gold Monthly (30 Days) ⭐ FREE TRIAL
- **Price**: ₦2,500 per employee/month
- **Trial**: 30 days FREE for new companies
- **Features**:
  - ✅ Everything in Silver
  - ✅ Task Assignment and Tracking
  - ✅ Task Review Workflow
  - ✅ Performance Metrics
  - ✅ Access to New Features
  - ✅ Priority Support

**After Trial**:
- Access restricted after 30 days
- Must select and pay for a plan to continue

#### Gold Yearly (365 Days)
- **Price**: ₦25,000 per employee/year
- **Savings**: 16.7% discount (₦5,000 saved per employee)
- **Features**: Same as Gold Monthly
- **Duration**: 12 months

**Pricing Examples**:

| Company Size | Silver Monthly | Silver Yearly | Gold Monthly | Gold Yearly |
|--------------|----------------|---------------|--------------|-------------|
| 5 employees | ₦6,000/mo | ₦60,000/yr | ₦12,500/mo | ₦125,000/yr |
| 10 employees | ₦12,000/mo | ₦120,000/yr | ₦25,000/mo | ₦250,000/yr |
| 50 employees | ₦60,000/mo | ₦600,000/yr | ₦125,000/mo | ₦1,250,000/yr |
| 100 employees | ₦120,000/mo | ₦1,200,000/yr | ₦250,000/mo | ₦2,500,000/yr |

### Stage 8: Payment (If not trial)
**Route**: `/onboarding/payment`

**Payment Gateway**: Paystack

**For Silver Plans**:
- Immediate payment required
- No trial period

**For Gold Plans**:
- New companies: Start 30-day FREE trial
- Existing companies: Immediate payment required

**Payment Process**:
1. Calculate total amount
2. Initialize Paystack transaction
3. Redirect to Paystack payment page
4. Handle payment callback
5. Update subscription status

### Stage 9: Completion
**Route**: `/dashboard`

After successful onboarding:
1. Company record created with `onboarding_completed = true`
2. User redirected to dashboard
3. Welcome email sent
4. Trial countdown starts (for Gold trial)

## Database Schema

### Companies Table (Updated)
```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    address TEXT,
    logo_url TEXT,
    industry VARCHAR(100),
    company_size VARCHAR(50),
    
    -- New onboarding fields
    tax_identification_number VARCHAR(100),
    website VARCHAR(255),
    cac_document_url TEXT,
    proof_of_address_url TEXT,
    company_policy_url TEXT,
    onboarding_completed BOOLEAN DEFAULT false,
    
    -- Owner details (if registering user is not owner)
    owner_first_name VARCHAR(100),
    owner_last_name VARCHAR(100),
    owner_email VARCHAR(255),
    owner_phone VARCHAR(20),
    owner_date_of_birth DATE,
    
    -- Subscription
    subscription_plan VARCHAR(50) DEFAULT 'trial',
    subscription_status VARCHAR(50) DEFAULT 'active',
    subscription_start_date TIMESTAMPTZ,
    subscription_end_date TIMESTAMPTZ,
    trial_start_date TIMESTAMPTZ,
    trial_end_date TIMESTAMPTZ,
    
    -- Geofencing
    office_latitude DECIMAL(10, 8),
    office_longitude DECIMAL(11, 8),
    geofence_radius_meters INTEGER DEFAULT 100,
    
    -- Settings
    timezone VARCHAR(50) DEFAULT 'UTC',
    working_days JSONB DEFAULT '{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": false, "sunday": false}',
    work_start_time TIME DEFAULT '09:00:00',
    work_end_time TIME DEFAULT '17:00:00',
    time_format VARCHAR(10) DEFAULT '24h',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    currency VARCHAR(3) DEFAULT 'NGN',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

### Users Table (Updated)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    date_of_birth DATE,
    avatar_url TEXT,
    
    -- Role: owner, admin, or staff
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
    
    -- Authentication
    email_verified BOOLEAN DEFAULT false,
    google_id VARCHAR(255),
    last_login_at TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    UNIQUE(company_id, email)
);
```

## API Endpoints

### POST /api/auth/register
Register new company and user

**Request Body**:
```json
{
  "email": "admin@company.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+234 800 000 0000",
  "dateOfBirth": "1990-01-01",
  "isOwner": true,
  "companyName": "Acme Corp",
  "taxId": "12345678",
  "companySize": 10,
  "website": "https://acme.com",
  "officeLocation": {
    "latitude": 6.5244,
    "longitude": 3.3792
  },
  "ownerDetails": {
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "owner@company.com",
    "phoneNumber": "+234 800 000 0001",
    "dateOfBirth": "1985-05-15"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "companyId": "uuid",
    "email": "admin@company.com",
    "verificationRequired": true
  }
}
```

### POST /api/auth/verify-email
Verify email with code

**Request Body**:
```json
{
  "email": "admin@company.com",
  "code": "123456"
}
```

### POST /api/onboarding/upload-document
Upload company documents

**Request**: Multipart form data
- `documentType`: "cac" | "proof_of_address" | "company_policy"
- `file`: File upload

**Response**:
```json
{
  "success": true,
  "data": {
    "url": "https://cloudinary.com/...",
    "documentType": "cac"
  }
}
```

### POST /api/onboarding/complete
Complete onboarding and select plan

**Request Body**:
```json
{
  "plan": "gold_monthly",
  "paymentMethod": "paystack"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "companyId": "uuid",
    "subscriptionPlan": "gold_monthly",
    "trialEndDate": "2024-12-16T00:00:00Z",
    "redirectUrl": "/dashboard"
  }
}
```

## Environment Variables

```env
# Pricing (loaded from ENV)
SILVER_MONTHLY_PLAN=1200
SILVER_YEARLY_PLAN=12000
GOLD_MONTHLY_PLAN=2500
GOLD_YEARLY_PLAN=25000

# Payment
PAYSTACK_SECRET_KEY=sk_live_xxx
PAYSTACK_PUBLIC_KEY=pk_live_xxx

# File Upload
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
```

## Security Considerations

### Data Validation
- All inputs validated with Zod schemas
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitized inputs)
- File upload validation (type, size, content)

### Authentication
- Passwords hashed with bcrypt (12 rounds)
- JWT tokens for session management
- Email verification required
- Google OAuth integration

### Multi-Tenancy
- All queries filtered by `company_id`
- Row Level Security (RLS) enabled
- No cross-company data access
- Isolated data per company

### Document Security
- Documents uploaded to Cloudinary
- Secure URLs with expiration
- Access controlled by authentication
- Super admin review required

## Testing

### Unit Tests
```bash
cd server
npm test
```

### Test Coverage
- Registration flow
- Email verification
- Document upload
- Plan selection
- Payment processing

### Manual Testing
See `docs/TESTING_GUIDE.md` for complete manual testing procedures.

## Deployment

### Database Migration
```bash
# Apply migrations
npm run db:migrate

# Verify tables
psql $DATABASE_URL -c "\dt"
```

### Environment Setup
1. Set all environment variables
2. Configure Cloudinary
3. Configure Paystack
4. Set up email SMTP

### Health Checks
```bash
# Check API
curl https://api.teemplot.com/health

# Check database
curl https://api.teemplot.com/health/db
```

## Support

### Common Issues

**Issue**: Email verification not working
**Solution**: Check SMTP configuration in `.env`

**Issue**: Document upload failing
**Solution**: Verify Cloudinary credentials

**Issue**: Payment not processing
**Solution**: Check Paystack API keys and webhook URL

### Contact
- Technical Support: tech@teemplot.com
- Documentation: https://docs.teemplot.com

---

**Last Updated**: November 19, 2025
**Version**: 1.0.0
**Status**: ✅ Production Ready
