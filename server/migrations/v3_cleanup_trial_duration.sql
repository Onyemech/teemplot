-- Clean up existing trial durations that were set to 365 days
-- Only update companies that are currently in 'trial' status
-- and have a current_period_end that is approximately 1 year from now (or at least more than 40 days)

UPDATE companies 
SET current_period_end = created_at + INTERVAL '30 days'
WHERE subscription_status = 'trial' 
  AND current_period_end > created_at + INTERVAL '40 days';

-- If plan is 'trial', also ensure the plan name matches
UPDATE companies
SET plan = 'trial'
WHERE subscription_status = 'trial' AND plan = 'free';
