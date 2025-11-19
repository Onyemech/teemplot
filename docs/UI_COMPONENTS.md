# UI Components & Design System

## 🎨 Color Palette (Extracted from Your Design)

### Primary Colors
```css
--primary: #0F5D5D          /* Dark Teal - Main brand color */
--primary-dark: #0A4040     /* Darker teal for hover states */
--primary-light: #146B6B    /* Lighter teal for backgrounds */
```

### Accent Colors
```css
--accent: #FF5722           /* Orange - Active states, CTAs */
--accent-dark: #E64A19      /* Darker orange for hover */
--accent-light: #FF7043     /* Lighter orange for backgrounds */
```

### Neutral Colors
```css
--background: #FAFAFA       /* Light gray background */
--foreground: #1A1A1A       /* Almost black text */
--muted: #6B7280           /* Gray for secondary text */
--border: #E5E7EB          /* Light gray borders */
--card: #FFFFFF            /* White cards */
```

### Status Colors
```css
--success: #10B981         /* Green for success states */
--warning: #F59E0B         /* Yellow for warnings */
--error: #EF4444           /* Red for errors */
--info: #3B82F6            /* Blue for info */
```

## 📐 Layout Structure

### Sidebar Navigation
- **Width**: 256px (16rem)
- **Background**: White (#FFFFFF)
- **Border**: Right border with light gray
- **Sections**:
  1. Logo area (96px height)
  2. Main navigation
  3. Reporting section (with label)
  4. Bottom actions (Settings, Help)

### Navigation Items
- **Height**: 40px per item
- **Padding**: 16px horizontal, 10px vertical
- **Border Radius**: 8px
- **Active State**:
  - Background: Orange/10 opacity (#FF5722 at 10%)
  - Text: Orange (#FF5722)
  - Font Weight: 500 (medium)
- **Hover State**:
  - Background: Light gray (#F3F4F6)
  - Text: Dark gray (#1A1A1A)

### Submenu Items
- **Indentation**: 48px from left (3rem)
- **Font Size**: 14px (0.875rem)
- **Same hover/active states as parent

## 🧩 Components Created

### 1. Company Setup Page ✅
**Location**: `client/src/app/onboarding/company-setup/page.tsx`

**Features**:
- Split layout (50/50 on desktop)
- Left side: Branding with gradient background
- Right side: Multi-step form
- Fields:
  - Company Name
  - Industry (dropdown)
  - Company Size (dropdown)
  - Phone Number
  - Office Address (textarea)
  - Timezone (dropdown)

**Form Styling**:
- Input height: 48px
- Border radius: 8px
- Focus state: Orange ring
- Button: Gradient orange background

### 2. Dashboard Sidebar ✅
**Location**: `client/src/components/dashboard/Sidebar.tsx`

**Navigation Structure**:
```
├── Home
├── Analytics
├── Attendance ▼
│   ├── Overview
│   ├── Manage Invites
│   └── Multiple Clock-in Setup
├── Employees
├── Departments
├── Wallet
├── [Reporting Section]
├── Audit logs
├── Reports
├── [Bottom Section]
├── Settings
└── Help & support
```

**Features**:
- Expandable/collapsible submenus
- Active state highlighting
- Smooth transitions
- Icon + text layout
- Chevron indicators for submenus

### 3. Dashboard Layout ✅
**Location**: `client/src/app/dashboard/layout.tsx`

**Structure**:
- Flex container (full height)
- Fixed sidebar (256px)
- Scrollable main content area
- Light gray background

### 4. Dashboard Home Page ✅
**Location**: `client/src/app/dashboard/page.tsx`

**Components**:
1. **Header Section**
   - Page title
   - Welcome message

2. **Stats Grid** (4 cards)
   - Total Employees
   - Present Today
   - Tasks Completed
   - Performance
   
   **Card Design**:
   - White background
   - Border with shadow on hover
   - Icon with colored background
   - Large number display
   - Change percentage (green)

3. **Activity Sections** (2 columns)
   - Recent Clock-ins
   - Tasks Awaiting Review
   
   **List Items**:
   - Avatar/initial circle
   - Name and department
   - Time and status
   - Status badges

## 🎯 Design Patterns

### Cards
```css
background: white
border: 1px solid #E5E7EB
border-radius: 12px
padding: 24px
hover: shadow-lg transition
```

### Buttons
```css
/* Primary Button */
background: linear-gradient(135deg, #FF5722, #FF7043)
color: white
padding: 12px 24px
border-radius: 8px
hover: scale(1.05) + shadow

/* Secondary Button */
border: 2px solid #FF5722
color: #FF5722
background: transparent
hover: background #FF5722, color white
```

### Input Fields
```css
height: 48px
padding: 12px 16px
border: 1px solid #E5E7EB
border-radius: 8px
focus: ring-2 ring-orange-500
```

### Status Badges
```css
padding: 4px 8px
border-radius: 4px
font-size: 12px
font-weight: 500

/* Success */
background: #10B981/10
color: #10B981

/* Warning */
background: #F59E0B/10
color: #F59E0B

/* Pending */
background: #FF5722/10
color: #FF5722
```

## 📱 Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 640px) {
  /* Hide sidebar, show mobile menu */
}

/* Tablet */
@media (min-width: 768px) {
  /* 2-column grid for stats */
}

/* Desktop */
@media (min-width: 1024px) {
  /* Show sidebar */
  /* 4-column grid for stats */
}
```

## 🎨 Typography

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
```

### Font Sizes
```css
--text-xs: 12px      /* Small labels */
--text-sm: 14px      /* Secondary text */
--text-base: 16px    /* Body text */
--text-lg: 18px      /* Large body */
--text-xl: 20px      /* Section titles */
--text-2xl: 24px     /* Card titles */
--text-3xl: 30px     /* Page titles */
--text-4xl: 36px     /* Hero titles */
```

### Font Weights
```css
--font-normal: 400   /* Body text */
--font-medium: 500   /* Emphasis */
--font-semibold: 600 /* Headings */
--font-bold: 700     /* Strong emphasis */
```

## 🔄 Animations

### Transitions
```css
/* Standard */
transition: all 200ms ease

/* Smooth */
transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1)

/* Bounce */
transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)
```

### Hover Effects
```css
/* Scale up */
hover:scale-105

/* Shadow */
hover:shadow-lg

/* Background change */
hover:bg-secondary
```

## 📦 Component Library

### Icons
Using **Lucide React** for consistent icon design:
- Home, BarChart3, Clock, Users, Building2
- Wallet, FileText, Settings, HelpCircle
- ChevronDown, ChevronRight, UserPlus, etc.

### Utilities
- Tailwind CSS for styling
- Custom color variables
- Gradient utilities
- Shadow utilities

## 🚀 Next Steps

### Pages to Create
1. ✅ Company Setup
2. ✅ Dashboard Home
3. ⏳ Attendance Overview
4. ⏳ Manage Invites
5. ⏳ Multiple Clock-in Setup
6. ⏳ Employees List
7. ⏳ Departments
8. ⏳ Settings
9. ⏳ Analytics

### Components to Build
1. ⏳ Header with user menu
2. ⏳ Search bar
3. ⏳ Notification bell
4. ⏳ Data tables
5. ⏳ Modal dialogs
6. ⏳ Form components
7. ⏳ Charts/graphs

## 📸 Screenshots Reference

Your navigation design shows:
- Clean, minimal sidebar
- Orange accent for active states
- Expandable submenus with chevrons
- Clear section separators
- Bottom-aligned settings/help

All implemented! ✅

---

**Color Extraction**: Yes, I can extract colors from images
**Design Matching**: Sidebar matches your reference exactly
**Status**: Ready for development

**Want me to create more pages based on your design?** Just share more screenshots! 📸
