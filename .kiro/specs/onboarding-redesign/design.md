# Onboarding Redesign - Design Document

**Spec ID:** ONBOARD-001  
**Status:** 🔴 Draft  
**Priority:** P0 - Critical  
**Created:** November 19, 2025

---

## 🎨 Design System

### Color Palette

#### Primary Colors (Brand Green)
```css
--primary-50: #e6f7f0;   /* Lightest - backgrounds */
--primary-100: #b3e6d4;  /* Very light */
--primary-200: #80d5b8;  /* Light */
--primary-300: #4dc49c;  /* Medium light */
--primary-400: #1ab380;  /* Medium */
--primary-500: #16a06e;  /* Main brand color */
--primary-600: #128d5e;  /* Medium dark */
--primary-700: #0e7a4e;  /* Dark */
--primary-800: #0a673e;  /* Very dark */
--primary-900: #06542e;  /* Darkest */
```

#### Accent Colors (Orange/Amber)
```css
--accent-50: #fff3e0;    /* Lightest */
--accent-100: #ffe0b2;   /* Very light */
--accent-200: #ffcc80;   /* Light */
--accent-300: #ffb74d;   /* Medium light */
--accent-400: #ffa726;   /* Medium */
--accent-500: #ff9800;   /* Main accent color */
--accent-600: #fb8c00;   /* Medium dark */
--accent-700: #f57c00;   /* Dark */
--accent-800: #ef6c00;   /* Very dark */
--accent-900: #e65100;   /* Darkest */
```

#### Neutral Colors (Grays)
```css
--gray-50: #fafafa;      /* Almost white */
--gray-100: #f5f5f5;     /* Very light gray */
--gray-200: #eeeeee;     /* Light gray */
--gray-300: #e0e0e0;     /* Medium light gray */
--gray-400: #bdbdbd;     /* Medium gray */
--gray-500: #9e9e9e;     /* True gray */
--gray-600: #757575;     /* Medium dark gray */
--gray-700: #616161;     /* Dark gray */
--gray-800: #424242;     /* Very dark gray */
--gray-900: #212121;     /* Almost black */
```

#### Semantic Colors
```css
--success: #4caf50;      /* Green - success states */
--warning: #ff9800;      /* Orange - warnings */
--error: #f44336;        /* Red - errors */
--info: #2196f3;         /* Blue - information */
```

#### Background Colors
```css
--bg-primary: #ffffff;   /* Main background */
--bg-secondary: #fafafa; /* Secondary background */
--bg-tertiary: #f5f5f5;  /* Tertiary background */
--bg-overlay: rgba(0, 0, 0, 0.5); /* Modal overlay */
```

#### Text Colors
```css
--text-primary: #212121;    /* Main text */
--text-secondary: #757575;  /* Secondary text */
--text-tertiary: #9e9e9e;   /* Tertiary text */
--text-disabled: #bdbdbd;   /* Disabled text */
--text-inverse: #ffffff;    /* Text on dark backgrounds */
```

---

### Typography

#### Font Families
```css
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

#### Font Sizes
```css
--text-xs: 0.75rem;      /* 12px - captions, labels */
--text-sm: 0.875rem;     /* 14px - small text */
--text-base: 1rem;       /* 16px - body text */
--text-lg: 1.125rem;     /* 18px - large body */
--text-xl: 1.25rem;      /* 20px - subheadings */
--text-2xl: 1.5rem;      /* 24px - headings */
--text-3xl: 1.875rem;    /* 30px - large headings */
--text-4xl: 2.25rem;     /* 36px - hero text */
--text-5xl: 3rem;        /* 48px - display text */
```

#### Font Weights
```css
--font-normal: 400;      /* Regular text */
--font-medium: 500;      /* Medium emphasis */
--font-semibold: 600;    /* Strong emphasis */
--font-bold: 700;        /* Bold text */
```

#### Line Heights
```css
--leading-tight: 1.25;   /* Tight spacing */
--leading-normal: 1.5;   /* Normal spacing */
--leading-relaxed: 1.75; /* Relaxed spacing */
```

---

### Spacing System

```css
--spacing-0: 0;          /* 0px */
--spacing-1: 0.25rem;    /* 4px */
--spacing-2: 0.5rem;     /* 8px */
--spacing-3: 0.75rem;    /* 12px */
--spacing-4: 1rem;       /* 16px */
--spacing-5: 1.25rem;    /* 20px */
--spacing-6: 1.5rem;     /* 24px */
--spacing-8: 2rem;       /* 32px */
--spacing-10: 2.5rem;    /* 40px */
--spacing-12: 3rem;      /* 48px */
--spacing-16: 4rem;      /* 64px */
--spacing-20: 5rem;      /* 80px */
--spacing-24: 6rem;      /* 96px */
```

---

### Border Radius

```css
--radius-none: 0;        /* No rounding */
--radius-sm: 0.375rem;   /* 6px - small elements */
--radius-md: 0.5rem;     /* 8px - default */
--radius-lg: 0.75rem;    /* 12px - inputs, buttons */
--radius-xl: 1rem;       /* 16px - cards */
--radius-2xl: 1.5rem;    /* 24px - large cards */
--radius-3xl: 2rem;      /* 32px - hero elements */
--radius-full: 9999px;   /* Full circle */
```

---

### Shadows

```css
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
--shadow-glow: 0 0 20px rgba(22, 160, 110, 0.3);
--shadow-glow-accent: 0 0 20px rgba(255, 152, 0, 0.3);
```

---

### Transitions

```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slower: 500ms cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 🧩 Component Specifications

### 1. Input Component

#### Visual Design
```
┌─────────────────────────────────────┐
│ Label *                             │
├─────────────────────────────────────┤
│ [icon] Placeholder text...          │
└─────────────────────────────────────┘
  Helper text or error message
```

#### States
- **Default:** Gray border, white background
- **Focus:** Primary color border, subtle glow
- **Error:** Red border, red text
- **Success:** Green border, green icon
- **Disabled:** Gray background, gray text

#### Specifications
```typescript
interface InputProps {
  label: string
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'date'
  placeholder?: string
  value: string
  onChange: (value: string) => void
  error?: string
  success?: boolean
  required?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  helperText?: string
  maxLength?: number
}
```

#### Styling
- Height: 48px (3rem)
- Padding: 12px 16px
- Border: 1px solid
- Border radius: --radius-lg (12px)
- Font size: --text-base (16px)
- Transition: --transition-base

---

### 2. Select/Dropdown Component

#### Visual Design
```
┌─────────────────────────────────────┐
│ Label *                             │
├─────────────────────────────────────┤
│ Selected option              [▼]    │
└─────────────────────────────────────┘
```

**Dropdown Open:**
```
┌─────────────────────────────────────┐
│ Selected option              [▲]    │
├─────────────────────────────────────┤
│ ✓ Option 1                          │
│   Option 2                          │
│   Option 3                          │
└─────────────────────────────────────┘
```

#### Specifications
```typescript
interface SelectProps {
  label: string
  options: Array<{ value: string; label: string; icon?: React.ReactNode }>
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  searchable?: boolean
}
```

#### Styling
- Height: 48px (3rem)
- Padding: 12px 16px
- Border: 1px solid
- Border radius: --radius-lg (12px)
- Dropdown: --shadow-lg, --radius-lg
- Max height: 300px (scrollable)
- Transition: --transition-base

#### Features
- Custom arrow icon
- Smooth open/close animation
- Keyboard navigation
- Search functionality (optional)
- Checkmark for selected item

---

### 3. Button Component

#### Variants

**Primary Button:**
```
┌─────────────────────────┐
│   Continue   →          │
└─────────────────────────┘
```
- Background: Gradient (primary-500 to primary-600)
- Text: White
- Hover: Lift effect + glow
- Active: Slightly darker

**Secondary Button:**
```
┌─────────────────────────┐
│   Go Back               │
└─────────────────────────┘
```
- Background: Gray-100
- Text: Gray-900
- Hover: Gray-200
- Active: Gray-300

**Outline Button:**
```
┌─────────────────────────┐
│   Cancel                │
└─────────────────────────┘
```
- Background: Transparent
- Border: 1px solid gray-300
- Text: Gray-700
- Hover: Gray-50 background

**Ghost Button:**
```
  Edit  ✎
```
- Background: Transparent
- No border
- Text: Primary-600
- Hover: Primary-50 background

#### Specifications
```typescript
interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}
```

#### Sizing
- **Small:** Height 36px, padding 8px 16px, text-sm
- **Medium:** Height 48px, padding 12px 24px, text-base
- **Large:** Height 56px, padding 16px 32px, text-lg

#### Styling
- Border radius: --radius-lg (12px)
- Font weight: --font-semibold (600)
- Transition: --transition-base
- Hover: transform: translateY(-2px)
- Active: transform: translateY(0)

---

### 4. Checkbox Component

#### Visual Design
```
☐ Label text
☑ Label text (checked)
```

#### Specifications
```typescript
interface CheckboxProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  error?: string
  helperText?: string
}
```

#### Styling
- Size: 20px × 20px
- Border: 2px solid
- Border radius: --radius-sm (6px)
- Checkmark: Custom SVG icon
- Transition: --transition-fast
- Checked: Primary-500 background

---

### 5. File Upload Component

#### Visual Design

**Empty State:**
```
┌─────────────────────────────────────┐
│                                     │
│         📁                          │
│                                     │
│   Drag and drop file here          │
│   or click to browse                │
│                                     │
│   PDF, PNG, JPEG • Max 1MB         │
│                                     │
└─────────────────────────────────────┘
```

**Uploading:**
```
┌─────────────────────────────────────┐
│  document.pdf                  45%  │
│  ████████████░░░░░░░░░░░░░░░░       │
└─────────────────────────────────────┘
```

**Uploaded:**
```
┌─────────────────────────────────────┐
│  ✓ document.pdf            [×]      │
│  Preview | Download                 │
└─────────────────────────────────────┘
```

#### Specifications
```typescript
interface FileUploadProps {
  label: string
  accept: string
  maxSize: number // in MB
  value?: File
  onChange: (file: File) => void
  onRemove?: () => void
  error?: string
  preview?: boolean
  helperText?: string
}
```

#### Styling
- Min height: 200px
- Border: 2px dashed gray-300
- Border radius: --radius-xl (16px)
- Hover: Border primary-500
- Drag over: Background primary-50

---

### 6. Progress Stepper Component

#### Visual Design

**Desktop:**
```
1 ━━━━ 2 ━━━━ 3 ━━━━ 4 ━━━━ 5
✓      ●      ○      ○      ○
Auth   Setup  Owner  Business Docs
```

**Mobile:**
```
Step 2 of 9
Company Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
22% Complete
```

#### Specifications
```typescript
interface StepperProps {
  steps: Array<{
    label: string
    description?: string
    icon?: React.ReactNode
  }>
  currentStep: number
  completedSteps: number[]
}
```

#### Styling
- Circle size: 40px
- Line thickness: 2px
- Completed: Primary-500
- Current: Primary-500 with pulse animation
- Pending: Gray-300
- Font size: --text-sm

---

### 7. Card Component

#### Visual Design
```
┌─────────────────────────────────────┐
│  Title                              │
│  Subtitle                           │
├─────────────────────────────────────┤
│                                     │
│  Content goes here                  │
│                                     │
├─────────────────────────────────────┤
│  Footer content                     │
└─────────────────────────────────────┘
```

#### Specifications
```typescript
interface CardProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  footer?: React.ReactNode
  padding?: 'sm' | 'md' | 'lg'
  shadow?: boolean
  hover?: boolean
  selected?: boolean
}
```

#### Styling
- Border radius: --radius-xl (16px)
- Shadow: --shadow-md
- Hover: --shadow-lg + translateY(-4px)
- Padding: 24px (default)
- Background: White
- Border: 1px solid gray-200

---

## 📱 Layout Specifications

### Onboarding Layout

```
┌─────────────────────────────────────────────────────┐
│  [Logo]                            Step 2 of 9      │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │                                               │ │
│  │  Progress Stepper                             │ │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │                                               │ │
│  │  Stage Title                                  │ │
│  │  Stage Description                            │ │
│  │                                               │ │
│  │  Form Content                                 │
│  │                                               │ │
│  │                                               │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  [Back]                          [Continue →]      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Specifications
- Max width: 800px
- Centered on page
- Padding: 24px (mobile), 48px (desktop)
- Background: White card on gray-50 background

---

### Two-Column Layout (Register/Login)

```
┌─────────────────────────────────────────────────────┐
│                         │                           │
│  Brand Section          │  Form Section             │
│  (Green gradient)       │  (White)                  │
│                         │                           │
│  Logo                   │  Title                    │
│  Tagline                │  Subtitle                 │
│  Features               │                           │
│                         │  Form Fields              │
│                         │                           │
│                         │  [Submit Button]          │
│                         │                           │
└─────────────────────────────────────────────────────┘
```

#### Specifications
- Left: 50% width (hidden on mobile)
- Right: 50% width (100% on mobile)
- Min height: 100vh
- Responsive breakpoint: 1024px

---

## 🎭 Animations

### Page Transitions
```css
.page-enter {
  opacity: 0;
  transform: translateY(20px);
}

.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: all 300ms ease-out;
}
```

### Button Hover
```css
.button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow);
  transition: all 200ms ease-out;
}
```

### Input Focus
```css
.input:focus {
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(22, 160, 110, 0.1);
  transition: all 150ms ease-out;
}
```

### Loading Spinner
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}
```

### Success Checkmark
```css
@keyframes checkmark {
  0% {
    stroke-dashoffset: 100;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

.checkmark {
  animation: checkmark 500ms ease-out;
}
```

---

## 📐 Responsive Breakpoints

```css
/* Mobile First */
.container {
  padding: 16px;
}

/* Tablet (640px+) */
@media (min-width: 640px) {
  .container {
    padding: 24px;
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .container {
    padding: 48px;
  }
}

/* Large Desktop (1280px+) */
@media (min-width: 1280px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

---

## ♿ Accessibility

### Focus Indicators
```css
*:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}
```

### Skip Links
```html
<a href="#main-content" class="skip-link">
  Skip to main content
</a>
```

### ARIA Labels
```html
<button aria-label="Close dialog">
  <CloseIcon />
</button>
```

### Color Contrast
- Text on white: Minimum 4.5:1
- Large text: Minimum 3:1
- Interactive elements: Minimum 3:1

---

## 🎨 Design Tokens Export

```typescript
// design-tokens.ts
export const tokens = {
  colors: {
    primary: {
      50: '#e6f7f0',
      // ... rest of colors
    },
    // ... rest of color scales
  },
  spacing: {
    1: '0.25rem',
    // ... rest of spacing
  },
  // ... rest of tokens
}
```

---

**Status:** ✅ Design Complete  
**Next Step:** Create implementation tasks  
**Approved By:** Pending  
**Date:** November 19, 2025
