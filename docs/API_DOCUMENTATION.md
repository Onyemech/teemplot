# Teemplot API Documentation

## Base URL
- **Development**: `http://localhost:5000/api`
- **Production**: `https://api.teemplot.com/api`

## Authentication
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### POST /auth/register
Register new company and admin user

**Request Body**:
```json
{
  "email": "admin@company.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "companyName": "Acme Corp",
  "industry": "Technology",
  "companySize": "10",
  "phoneNumber": "+234 800 000 0000",
  "address": "123 Main St, Lagos",
  "timezone": "Africa/Lagos"
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
  },
  "message": "Registration successful. Please verify your email."
}
```

### POST /auth/verify-email
Verify email with code

**Request Body**:
```json
{
  "email": "admin@company.com",
  "code": "123456"
}
```

### POST /auth/login
Login user

**Request Body**:
```json
{
  "email": "admin@company.com",
  "password": "SecurePass123!"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user": {
      "id": "uuid",
      "email": "admin@company.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "companyId": "uuid"
    }
  }
}
```

### GET /auth/me
Get current user (Protected)

---

## Onboarding Endpoints

### POST /onboarding/upload-document
Upload company document (Protected)

**Request Body**:
```json
{
  "companyId": "uuid",
  "documentType": "cac",
  "url": "https://cloudinary.com/..."
}
```

**Document Types**: `cac`, `proof_of_address`, `company_policy`

### POST /onboarding/select-plan
Select subscription plan (Protected)

**Request Body**:
```json
{
  "companyId": "uuid",
  "plan": "gold_monthly",
  "companySize": 10
}
```

**Plans**: `silver_monthly`, `silver_yearly`, `gold_monthly`, `gold_yearly`

**Response**:
```json
{
  "success": true,
  "data": {
    "totalPrice": 25000,
    "trialEndDate": "2024-12-19T00:00:00Z"
  },
  "message": "Plan selected successfully"
}
```

### POST /onboarding/complete
Complete onboarding (Protected)

**Request Body**:
```json
{
  "companyId": "uuid",
  "taxId": "12345678",
  "website": "https://company.com",
  "officeLatitude": 6.5244,
  "officeLongitude": 3.3792,
  "logoUrl": "https://cloudinary.com/...",
  "ownerDetails": {
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "owner@company.com",
    "phone": "+234 800 000 0001",
    "dateOfBirth": "1985-05-15"
  }
}
```

**Note**: `ownerDetails` is optional - only required if registering user is NOT the owner

### GET /onboarding/status/:companyId
Get onboarding status (Protected)

**Response**:
```json
{
  "success": true,
  "data": {
    "completed": false,
    "hasDocuments": true,
    "hasPlan": true
  }
}
```

---

## Super Admin Endpoints

### GET /superadmin/companies
Get all companies (Super Admin only)

**Query Parameters**:
- `plan`: Filter by plan (`silver`, `gold`, `trial`)
- `status`: Filter by status (`active`, `trial`, `pending_payment`, `suspended`)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "email": "admin@acme.com",
      "plan": "gold_monthly",
      "status": "active",
      "employeeCount": 10,
      "monthlyRevenue": 25000,
      "yearlyRevenue": 300000,
      "trialEndDate": null,
      "onboardingCompleted": true,
      "createdAt": "2024-11-19T00:00:00Z"
    }
  ]
}
```

### GET /superadmin/revenue-stats
Get revenue statistics (Super Admin only)

**Response**:
```json
{
  "success": true,
  "data": {
    "totalMonthlyRevenue": 150000,
    "totalYearlyRevenue": 1800000,
    "silverCompanies": 5,
    "goldCompanies": 10,
    "trialCompanies": 3,
    "totalCompanies": 18,
    "totalEmployees": 250
  }
}
```

### GET /superadmin/companies/:companyId
Get company details (Super Admin only)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Acme Corp",
    "email": "admin@acme.com",
    "plan": "gold_monthly",
    "users": [...],
    "departments": [...],
    "userCount": 10,
    "departmentCount": 3
  }
}
```

### POST /superadmin/expenses
Record expense (Super Admin only)

**Request Body**:
```json
{
  "description": "Office rent",
  "amount": 50000,
  "category": "Rent"
}
```

### GET /superadmin/expenses
Get expenses (Super Admin only)

**Query Parameters**:
- `startDate`: Filter by start date (ISO format)
- `endDate`: Filter by end date (ISO format)
- `category`: Filter by category

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "description": "Office rent",
      "amount": 50000,
      "category": "Rent",
      "date": "2024-11-19",
      "createdBy": "uuid"
    }
  ]
}
```

### GET /superadmin/profit-analysis
Get profit analysis (Super Admin only)

**Query Parameters**:
- `month`: Month number (1-12)
- `year`: Year (e.g., 2024)

**Response**:
```json
{
  "success": true,
  "data": {
    "revenue": 150000,
    "expenses": 80000,
    "profit": 70000,
    "profitMargin": 46.67
  }
}
```

### GET /superadmin/companies/:companyId/documents
Review company documents (Super Admin only)

**Response**:
```json
{
  "success": true,
  "data": {
    "cacDocument": "https://cloudinary.com/...",
    "proofOfAddress": "https://cloudinary.com/...",
    "companyPolicy": "https://cloudinary.com/..."
  }
}
```

### POST /superadmin/companies/:companyId/approve
Approve company (Super Admin only)

**Response**:
```json
{
  "success": true,
  "message": "Company approved successfully"
}
```

### POST /superadmin/companies/:companyId/suspend
Suspend company (Super Admin only)

**Request Body**:
```json
{
  "reason": "Payment overdue"
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

**Common HTTP Status Codes**:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

---

## Pricing Calculation

```
Total Price = (Price per Employee) × (Company Size)
```

**Prices** (from environment variables):
- Silver Monthly: ₦1,200/employee/month
- Silver Yearly: ₦12,000/employee/year
- Gold Monthly: ₦2,500/employee/month
- Gold Yearly: ₦25,000/employee/year

**Example**:
- Company Size: 10 employees
- Plan: Gold Monthly
- Total: ₦2,500 × 10 = ₦25,000/month

---

## Trial Period

- **Gold plans only**: 30 days FREE for new companies
- **Silver plans**: No trial, immediate payment required
- Trial status: `subscription_status = 'trial'`
- After trial: Status changes to `pending_payment`

---

**Last Updated**: November 19, 2025
**API Version**: 1.0.0
