// CORRECT Plan Features - Enterprise Level
// Trial = 30 days of FULL Gold plan access (all features)
// Employee limit = what user declared during onboarding (NOT tied to plan)

export type SubscriptionPlan = 'trial' | 'silver' | 'gold'

export type Feature = 
  | 'attendance'
  | 'leave'
  | 'departments'
  | 'performance'
  | 'tasks'
  | 'analytics'
  | 'reports'
  | 'wallet'
  | 'audit_logs'

export interface PlanFeatures {
  features: Feature[]
  displayName: string
  description: string
}

// Feature access matrix
export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeatures> = {
  trial: {
    // 30-day trial with FULL Gold access
    features: [
      'attendance',
      'leave',
      'departments',
      'performance',
      'tasks',
      'analytics',
      'reports',
      'wallet',
      'audit_logs'
    ],
    displayName: '30-Day Trial',
    description: '30 days of full Gold plan access - all features included'
  },
  silver: {
    features: ['attendance', 'leave', 'departments'],
    displayName: 'Silver Plan',
    description: 'Attendance + Leave Management + Department Management'
  },
  gold: {
    features: [
      'attendance',
      'leave',
      'departments',
      'performance',
      'tasks',
      'analytics',
      'reports',
      'wallet',
      'audit_logs'
    ],
    displayName: 'Gold Plan',
    description: 'All features included'
  }
}

export function hasFeatureAccess(plan: SubscriptionPlan, feature: Feature): boolean {
  return PLAN_FEATURES[plan].features.includes(feature)
}

// Get all features for a plan
export function getPlanFeatures(plan: SubscriptionPlan): Feature[] {
  return PLAN_FEATURES[plan].features
}

// Get feature display name
export function getFeatureDisplayName(feature: Feature): string {
  const names: Record<Feature, string> = {
    attendance: 'Attendance Tracking',
    leave: 'Leave Management',
    departments: 'Department Management',
    performance: 'Performance Metrics',
    tasks: 'Task Management',
    analytics: 'Analytics Dashboard',
    reports: 'Advanced Reports',
    wallet: 'Wallet & Payments',
    audit_logs: 'Audit Logs'
  }
  return names[feature]
}

// Get missing features for upgrade prompt
export function getMissingFeatures(currentPlan: SubscriptionPlan, targetPlan: SubscriptionPlan): Feature[] {
  const currentFeatures = PLAN_FEATURES[currentPlan].features
  const targetFeatures = PLAN_FEATURES[targetPlan].features
  
  return targetFeatures.filter(feature => !currentFeatures.includes(feature))
}

// Check if plan is trial
export function isTrial(plan: SubscriptionPlan): boolean {
  return plan === 'trial'
}

// Get trial duration in days
export const TRIAL_DURATION_DAYS = 30
