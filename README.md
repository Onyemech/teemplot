# Teemplot - Enterprise Workforce Management Platform

A high-performance, scalable SaaS platform for workforce management built with modern technologies and enterprise-grade architecture.

## 🏗️ Architecture

### Backend (Fastify + TypeScript)
- **Clean Architecture** with separation of concerns
- **Domain-Driven Design** with entities and repositories
- **Dependency Injection** for loose coupling
- **Repository Pattern** for data access abstraction
- **Service Layer** for business logic
- **High Performance** with Fastify framework
- **Security First** with Helmet, Rate Limiting, JWT

### Frontend (Next.js 14 + TypeScript)
- **App Router** for optimal performance
- **Server Components** where applicable
- **Client-side State Management** with Zustand
- **Data Fetching** with TanStack Query
- **Responsive Design** with Tailwind CSS
- **Type Safety** with TypeScript
- **Form Validation** with React Hook Form + Zod

### Database (PostgreSQL via Supabase)
- **Table Partitioning** for multi-tenancy
- **Sharding Strategy** for horizontal scaling
- **Comprehensive Indexing** for query optimization
- **Row Level Security** (RLS)
- **Materialized Views** for dashboard performance
- **Triggers & Functions** for automated calculations
- **Soft Deletes** for data recovery

## 📊 Database Schema Highlights

### Partitioning Strategy
- **Users Table**: Hash partitioned by `company_id` (8 partitions)
- **Attendance Records**: Range partitioned by `created_at` (monthly)
- **Audit Logs**: Range partitioned by `created_at` (monthly)

### Indexing Strategy
- B-tree indexes on foreign keys
- Composite indexes for common query patterns
- Partial indexes with `WHERE deleted_at IS NULL`
- GIN indexes for JSONB columns

## 🚀 Features

### 1. Multi-Tenant Architecture
- ✅ SuperAdmin manages all companies
- ✅ Company isolation with dedicated dashboards
- ✅ Role-based access control (SuperAdmin, Admin, Staff)

### 2. Authentication & Authorization
- ✅ Email/Password authentication with bcrypt
- ✅ Google OAuth integration ready
- ✅ JWT-based token system
- ✅ Email verification with OTP
- ✅ Refresh token rotation
- ✅ Secure session management

### 3. Subscription & Payments
- 🔄 Paystack integration
- 🔄 Multiple pricing tiers (Trial, Starter, Professional, Enterprise)
- 🔄 Subscription tracking
- 🔄 Automated billing

### 4. Attendance Management
- 🔄 Clock-in/Clock-out functionality
- 🔄 Geolocation validation
- 🔄 Biometric data capture
- 🔄 Attendance statistics
- 🔄 Automatic hour calculation
- 🔄 Late/Absent tracking

### 5. Task Management
- 🔄 Task assignment
- 🔄 Priority levels (Low, Medium, High, Urgent)
- 🔄 Status tracking (Pending, In Progress, Completed)
- 🔄 Due date management
- 🔄 Task comments
- 🔄 File attachments

### 6. Performance Metrics
- 🔄 Task completion rate
- 🔄 On-time delivery tracking
- 🔄 Attendance percentage
- 🔄 Performance scoring
- 🔄 Trend analysis

### 7. Employee Management
- 🔄 Employee onboarding
- 🔄 Department management
- 🔄 Invitation system
- 🔄 Profile management

### 8. Reporting & Analytics
- 🔄 Attendance reports
- 🔄 Performance reports
- 🔄 Audit logs
- 🔄 Export functionality

Legend: ✅ Implemented | 🔄 In Progress

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Fastify
- **Language**: TypeScript
- **Database**: PostgreSQL (Supabase)
- **Authentication**: JWT, Passport.js
- **Validation**: Zod
- **Encryption**: bcrypt
- **Email**: Nodemailer
- **Payment**: Paystack

### Frontend
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Forms**: React Hook Form
- **Validation**: Zod
- **HTTP Client**: Axios

### DevOps & Infrastructure
- **Database Hosting**: Supabase
- **Environment Management**: dotenv
- **Logging**: Pino
- **Security**: Helmet, CORS, Rate Limiting

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL (or Supabase account)
- npm or yarn

### Backend Setup

```bash
cd server

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your credentials
# - Supabase credentials
# - JWT secrets (generate with: openssl rand -base64 32)
# - SMTP credentials
# - Paystack keys

# Run database migration
npm run db:migrate

# Start development server
npm run dev

# Production build
npm run build
npm start
```

### Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local

# Update .env.local with your API URL

# Start development server
npm run dev

# Production build
npm run build
npm start
```

## 🗄️ Database Setup

### Using Supabase

1. Create a new Supabase project
2. Copy the connection details
3. Run the SQL schema:
   ```bash
   # Connect to Supabase SQL Editor
   # Copy and run: server/database/schema.sql
   ```

### Manual PostgreSQL

```bash
# Create database
createdb teemplot

# Run schema
psql teemplot < server/database/schema.sql
```

## 🔐 Environment Variables

### Backend (.env)

```env
NODE_ENV=development
PORT=5000

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT (Generate with: openssl rand -base64 32)
JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxx
PAYSTACK_PUBLIC_KEY=pk_test_xxx

# Pricing (in kobo)
PLAN_STARTER_PRICE=500000
PLAN_PROFESSIONAL_PRICE=1500000
PLAN_ENTERPRISE_PRICE=5000000

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

## 🎨 Design System

### Colors
- **Primary**: #0F5D5D (Dark Teal)
- **Primary Dark**: #0A4040
- **Accent**: #FF5722 (Orange)
- **Accent Dark**: #E64A19

### Typography
- **Font**: Inter (sans-serif)
- **Headings**: Bold, 600-700 weight
- **Body**: Regular, 400 weight

### Components
- Consistent border radius (rounded-lg, rounded-xl)
- Shadow system for depth
- Smooth transitions (200-300ms)
- Responsive breakpoints (sm, md, lg, xl)

## 📱 Key Screens

1. **Onboarding**
   - Email/Google sign-up
   - Email verification (6-digit OTP)
   - Company account creation

2. **Dashboard**
   - Sidebar navigation
   - Overview statistics
   - Quick actions

3. **Attendance**
   - Clock-in/out interface
   - Location capture
   - Attendance history

4. **Tasks**
   - Task list
   - Task details
   - Task assignment

5. **Reports**
   - Performance metrics
   - Attendance reports
   - Export functionality

## 🔒 Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Tokens**: Access (15min) + Refresh (7days)
- **Rate Limiting**: 100 requests per 15 minutes
- **CORS**: Configured for specific origin
- **Helmet**: Security headers
- **Input Validation**: Zod schemas
- **SQL Injection Prevention**: Parameterized queries
- **XSS Prevention**: Input sanitization
- **HTTPS**: Enforced in production

## 🚀 Performance Optimizations

### Database
- **Partitioning**: Users (8 partitions), Attendance (monthly)
- **Indexing**: Strategic B-tree and GIN indexes
- **Materialized Views**: Pre-computed dashboard stats
- **Connection Pooling**: Supabase built-in

### Backend
- **Fastify**: One of the fastest Node.js frameworks
- **Async/Await**: Non-blocking I/O
- **Response Caching**: Strategic cache implementation
- **Gzip Compression**: Reduced payload size

### Frontend
- **Next.js App Router**: Automatic code splitting
- **Server Components**: Reduced client bundle
- **Image Optimization**: Next.js Image component
- **Lazy Loading**: Components and routes
- **React Query**: Smart caching and deduplication

## 📈 Scalability Strategy

### Horizontal Scaling
- Stateless API design
- Load balancer ready
- Database read replicas
- CDN for static assets

### Vertical Scaling
- Optimized queries
- Database indexing
- Connection pooling
- Memory management

### Data Partitioning
- Multi-tenant isolation
- Shard by company_id
- Time-series partitioning

## 🧪 Testing Strategy

### Backend
```bash
npm test                  # Run all tests
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests
```

### Frontend
```bash
npm test                 # Jest + React Testing Library
npm run test:e2e        # Playwright/Cypress
```

## 📚 API Documentation

### Authentication Endpoints

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/superadmin/login
POST /api/auth/send-verification-code
POST /api/auth/verify-email
POST /api/auth/logout
GET  /api/auth/me
```

### User Endpoints
```http
GET    /api/users
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
```

### Company Endpoints
```http
GET    /api/companies
GET    /api/companies/:id
PUT    /api/companies/:id
DELETE /api/companies/:id
```

### Attendance Endpoints
```http
POST   /api/attendance/clock-in
POST   /api/attendance/clock-out
GET    /api/attendance
GET    /api/attendance/:id
GET    /api/attendance/stats
```

### Task Endpoints
```http
GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
PUT    /api/tasks/:id
DELETE /api/tasks/:id
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - See LICENSE file for details

## 👥 Team

Built with excellence by the Teemplot team

## 🆘 Support

For support, email support@teemplot.com or create an issue on GitHub

---

**Note**: This is an enterprise-grade application built with security, scalability, and performance as top priorities. All software engineering principles including Clean Architecture, SOLID, DI, Repository Pattern, and proper separation of concerns have been implemented throughout the codebase.
