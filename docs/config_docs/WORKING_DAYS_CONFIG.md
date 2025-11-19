# Working Days Configuration Guide

## 🗓️ Default vs Custom Configuration

### Default Configuration (Mon-Fri)
This is just the **starting point**! Every company can customize it.

```json
{
  "monday": true,
  "tuesday": true,
  "wednesday": true,
  "thursday": true,
  "friday": true,
  "saturday": false,
  "sunday": false
}
```

**Why this default?**
- Most common work schedule globally
- Easy starting point
- Companies customize during setup

## 🎨 Customization Examples

### Example 1: 6-Day Work Week
```json
{
  "monday": true,
  "tuesday": true,
  "wednesday": true,
  "thursday": true,
  "friday": true,
  "saturday": true,    // ✅ Working day
  "sunday": false
}
```

### Example 2: Sunday-Thursday (Middle East)
```json
{
  "monday": true,
  "tuesday": true,
  "wednesday": true,
  "thursday": true,
  "friday": false,     // ❌ Weekend
  "saturday": false,   // ❌ Weekend
  "sunday": true       // ✅ Working day
}
```

### Example 3: 4-Day Work Week
```json
{
  "monday": true,
  "tuesday": true,
  "wednesday": true,
  "thursday": true,
  "friday": false,     // ❌ Off
  "saturday": false,
  "sunday": false
}
```

### Example 4: Shift Work (All Days)
```json
{
  "monday": true,
  "tuesday": true,
  "wednesday": true,
  "thursday": true,
  "friday": true,
  "saturday": true,
  "sunday": true       // ✅ 7 days operation
}
```

## 🔧 How to Configure

### Method 1: During Company Setup (Frontend)
```typescript
// User selects working days in UI
<WorkingDaysSelector
  value={workingDays}
  onChange={setWorkingDays}
/>

// Sends to backend
POST /api/companies
{
  "name": "Acme Corp",
  "working_days": {
    "monday": true,
    "tuesday": true,
    // ... custom schedule
  }
}
```

### Method 2: Via Database (SQL)
```sql
-- Update specific company
UPDATE companies
SET working_days = '{
  "monday": true,
  "tuesday": true,
  "wednesday": true,
  "thursday": true,
  "friday": true,
  "saturday": true,
  "sunday": false
}'::jsonb
WHERE id = 'company-uuid';
```

### Method 3: Via API (Backend)
```typescript
// Admin updates company settings
PUT /api/companies/:id/settings
{
  "working_days": {
    "monday": true,
    "tuesday": true,
    "wednesday": true,
    "thursday": true,
    "friday": false,
    "saturday": false,
    "sunday": true
  }
}
```

## 🎯 How It Works

### Auto Clock-In Logic
```typescript
// System checks current day
const today = new Date().toLocaleDateString('en-US', { 
  weekday: 'lowercase',
  timeZone: company.timezone 
});
// today = "monday"

// Check if it's a working day
if (company.working_days[today] === true) {
  // ✅ Auto clock-in enabled
  await autoClockIn(employees);
} else {
  // ❌ Skip - not a working day
  logger.info('Not a working day, skipping auto clock-in');
}
```

### Example Scenarios

#### Scenario 1: Monday (Working Day)
```typescript
company.working_days.monday = true
→ Auto clock-in runs ✅
→ Employees can clock in ✅
→ Attendance tracked ✅
```

#### Scenario 2: Saturday (Non-Working Day)
```typescript
company.working_days.saturday = false
→ Auto clock-in skipped ❌
→ Employees can still manually clock in (optional)
→ Marked as overtime/special day
```

## 🌍 Regional Defaults

### North America / Europe
```json
{
  "monday": true,
  "tuesday": true,
  "wednesday": true,
  "thursday": true,
  "friday": true,
  "saturday": false,
  "sunday": false
}
```

### Middle East (UAE, Saudi Arabia)
```json
{
  "monday": true,
  "tuesday": true,
  "wednesday": true,
  "thursday": true,
  "friday": false,    // Jumu'ah
  "saturday": false,
  "sunday": true
}
```

### Israel
```json
{
  "monday": true,
  "tuesday": true,
  "wednesday": true,
  "thursday": true,
  "friday": false,
  "saturday": false,  // Shabbat
  "sunday": true
}
```

## 🏭 Industry-Specific

### Retail / Hospitality
```json
{
  "monday": true,
  "tuesday": true,
  "wednesday": true,
  "thursday": true,
  "friday": true,
  "saturday": true,
  "sunday": true      // 7 days operation
}
```

### Tech Startups
```json
{
  "monday": true,
  "tuesday": true,
  "wednesday": true,
  "thursday": true,
  "friday": false,    // 4-day week
  "saturday": false,
  "sunday": false
}
```

### Healthcare
```json
{
  "monday": true,
  "tuesday": true,
  "wednesday": true,
  "thursday": true,
  "friday": true,
  "saturday": true,
  "sunday": true      // 24/7 operation
}
```

## 🎨 UI Component Example

```typescript
// WorkingDaysSelector.tsx
const days = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

return (
  <div className="flex gap-2">
    {days.map(day => (
      <button
        key={day.key}
        onClick={() => toggleDay(day.key)}
        className={`
          px-4 py-2 rounded-lg
          ${workingDays[day.key] 
            ? 'bg-accent text-white' 
            : 'bg-gray-200 text-gray-600'
          }
        `}
      >
        {day.short}
      </button>
    ))}
  </div>
);
```

## 📊 Database Storage

### In Database (JSONB)
```sql
SELECT 
  name,
  working_days,
  work_start_time,
  work_end_time
FROM companies
WHERE id = 'company-uuid';

-- Result:
-- name: "Acme Corp"
-- working_days: {"monday": true, "tuesday": true, ...}
-- work_start_time: "09:00:00"
-- work_end_time: "17:00:00"
```

### Query Working Days
```sql
-- Find companies that work on Saturday
SELECT name
FROM companies
WHERE working_days->>'saturday' = 'true';

-- Find companies with 5-day work week
SELECT name
FROM companies
WHERE (
  (working_days->>'monday')::boolean = true AND
  (working_days->>'tuesday')::boolean = true AND
  (working_days->>'wednesday')::boolean = true AND
  (working_days->>'thursday')::boolean = true AND
  (working_days->>'friday')::boolean = true AND
  (working_days->>'saturday')::boolean = false AND
  (working_days->>'sunday')::boolean = false
);
```

## 🔄 Migration from Default

### If Company Wants to Change
```typescript
// Admin updates settings
const updateWorkingDays = async (companyId, newSchedule) => {
  await db.update('companies', 
    { working_days: newSchedule },
    { id: companyId }
  );
  
  // Notify employees
  await notifyEmployees(companyId, {
    title: 'Working Days Updated',
    message: 'Your company work schedule has been updated'
  });
};
```

## ✅ Summary

**Key Points**:
1. ✅ Mon-Fri is just the **default**
2. ✅ Every company can **customize**
3. ✅ Stored as **JSONB** (flexible)
4. ✅ Easy to **update** anytime
5. ✅ Supports **any schedule**

**The default is NOT a limitation - it's a starting point!**

---

**Your company can work:**
- 4 days a week ✅
- 5 days a week ✅
- 6 days a week ✅
- 7 days a week ✅
- Any custom schedule ✅
