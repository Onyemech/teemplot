
-- Fix for "relation companies does not exist" error
-- explicitly qualifying table names with public schema

BEGIN;

CREATE OR REPLACE FUNCTION public.calculate_attendance_metrics()
RETURNS TRIGGER AS $$
DECLARE
    v_timezone TEXT;
    v_work_start TIME;
    v_work_end TIME;
    v_grace_period INTEGER;
    v_threshold INTEGER;
    v_local_time TIME;
    v_working_days INTEGER[];
    v_day_of_week INTEGER;
    v_is_working_day BOOLEAN;
BEGIN
    -- 1. Fetch Configuration
    -- Timezone comes from companies table
    SELECT COALESCE(timezone, 'UTC') 
    INTO v_timezone 
    FROM public.companies 
    WHERE id = NEW.company_id;

    -- Schedule comes from company_settings (priority) or companies (legacy fallback)
    SELECT 
        COALESCE(cs.working_hours_start, c.work_start_time, '09:00:00'),
        COALESCE(cs.working_hours_end, c.work_end_time, '17:00:00'),
        COALESCE(cs.late_grace_period_minutes, c.grace_period_minutes, 15),
        COALESCE(c.early_departure_threshold_minutes, 0),
        COALESCE(cs.working_days, ARRAY[1,2,3,4,5]) -- Default Mon-Fri
    INTO v_work_start, v_work_end, v_grace_period, v_threshold, v_working_days
    FROM public.companies c
    LEFT JOIN public.company_settings cs ON c.id = cs.company_id
    WHERE c.id = NEW.company_id;

    -- 2. Handle Check-in Metrics
    IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.clock_in_time IS NOT NULL AND OLD.clock_in_time IS NULL)) THEN
        v_local_time := (NEW.clock_in_time AT TIME ZONE v_timezone)::TIME;
        
        -- Check if today is a working day
        -- ISODOW: 1=Monday, 7=Sunday
        v_day_of_week := EXTRACT(ISODOW FROM (NEW.clock_in_time AT TIME ZONE v_timezone));
        v_is_working_day := v_day_of_week = ANY(v_working_days);

        -- Late Calculation
        -- Only mark late if it is a working day. If coming in on weekend, not late.
        IF v_is_working_day THEN
            NEW.minutes_late := GREATEST(0, (EXTRACT(EPOCH FROM (v_local_time - v_work_start)) / 60)::INTEGER);
            NEW.is_late_arrival := (NEW.minutes_late > v_grace_period);
        ELSE
            NEW.minutes_late := 0;
            NEW.is_late_arrival := FALSE;
        END IF;
        
        -- Default status
        IF NEW.status IS NULL OR NEW.status = '' THEN
            IF NEW.is_late_arrival THEN NEW.status := 'late_arrival';
            ELSE NEW.status := 'present';
            END IF;
        END IF;
    END IF;

    -- 3. Handle Check-out Metrics
    IF (TG_OP = 'UPDATE' AND NEW.clock_out_time IS NOT NULL AND OLD.clock_out_time IS NULL) THEN
        v_local_time := (NEW.clock_out_time AT TIME ZONE v_timezone)::TIME;
        
        v_day_of_week := EXTRACT(ISODOW FROM (NEW.clock_in_time AT TIME ZONE v_timezone));
        v_is_working_day := v_day_of_week = ANY(v_working_days);

        -- Duration
        NEW.duration_minutes := (EXTRACT(EPOCH FROM (NEW.clock_out_time - NEW.clock_in_time)) / 60)::INTEGER;
        
        -- Overtime Calculation
        -- If working day: Overtime is time past work_end_time
        -- If non-working day: Overtime is TOTAL duration
        IF v_is_working_day THEN
            NEW.overtime_minutes := GREATEST(0, (EXTRACT(EPOCH FROM (v_local_time - v_work_end)) / 60)::INTEGER);
            
            -- Early Departure
            NEW.minutes_early := GREATEST(0, (EXTRACT(EPOCH FROM (v_work_end - v_local_time)) / 60)::INTEGER);
            NEW.is_early_departure := (NEW.minutes_early > v_threshold);
        ELSE
            NEW.overtime_minutes := NEW.duration_minutes;
            NEW.minutes_early := 0;
            NEW.is_early_departure := FALSE;
        END IF;
        
        -- Fix status from break
        IF NEW.status = 'on_break' THEN
            NEW.status := 'present';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create trigger to ensure it uses the new function
DROP TRIGGER IF EXISTS trg_calculate_attendance_metrics ON attendance_records;
CREATE TRIGGER trg_calculate_attendance_metrics
BEFORE INSERT OR UPDATE ON attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.calculate_attendance_metrics();

COMMIT;
