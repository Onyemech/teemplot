BEGIN;

-- Remove denormalized columns from attendance_records
ALTER TABLE attendance_records
  DROP COLUMN IF EXISTS meal_eligible,
  DROP COLUMN IF EXISTS applied_meal_policy_id,
  DROP COLUMN IF EXISTS applied_meal_type_id;

-- Drop attendance_meals table if exists
DROP TABLE IF EXISTS attendance_meals;

-- Drop meal_policies table if exists
DROP TABLE IF EXISTS meal_policies;

-- Drop meal_types table if exists
DROP TABLE IF EXISTS meal_types;

COMMIT;
