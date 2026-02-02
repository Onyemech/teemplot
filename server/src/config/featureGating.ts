export type Feature =
  | 'attendance'
  | 'leave'
  | 'employees'
  | 'departments'
  | 'performance'
  | 'tasks'
  | 'analytics'
  | 'reports'
  | 'wallet'
  | 'audit_logs';

export type SubscriptionPlan = 'trial' | 'silver' | 'gold';

export const PLAN_FEATURES: Record<SubscriptionPlan, Feature[]> = {
  trial: [
    'attendance',
    'leave',
    'employees',
    'departments',
    'performance',
    'tasks',
    'analytics',
    'reports',
    'wallet',
    'audit_logs'
  ],
  silver: ['attendance', 'leave', 'departments', 'employees', 'audit_logs'],
  gold: [
    'attendance',
    'leave',
    'employees',
    'departments',
    'performance',
    'tasks',
    'analytics',
    'reports',
    'wallet',
    'audit_logs'
  ]
};

export const GOLD_FEATURES: Feature[] = PLAN_FEATURES.gold;

function parseCsv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export function getDisabledFeaturesFromEnv(): Set<Feature> {
  const disabled = new Set<Feature>();
  for (const f of parseCsv(process.env.DISABLED_FEATURES)) {
    disabled.add(f as Feature);
  }
  return disabled;
}

export function isFeatureEnabled(feature: Feature): boolean {
  const disabled = getDisabledFeaturesFromEnv();
  return !disabled.has(feature);
}

export function getEnabledFeaturesForPlan(plan: SubscriptionPlan): Feature[] {
  return PLAN_FEATURES[plan].filter(isFeatureEnabled);
}

export function determineCompanyPlan(company: any): SubscriptionPlan {
  if (!company) return 'silver';

  if (company.subscription_status === 'trial' || company.subscription_plan === 'trial') return 'trial';
  if (typeof company.subscription_plan === 'string' && company.subscription_plan.includes('gold')) return 'gold';
  if (company.plan === 'gold') return 'gold';
  return 'silver';
}

export function getTrialDaysLeft(company: any): number | null {
  if (!company?.trial_end_date) return null;
  if (company.subscription_status !== 'trial' && company.subscription_plan !== 'trial') return null;
  const trialEnd = new Date(company.trial_end_date);
  const now = new Date();
  const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, daysLeft);
}

