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
    SELECT COALESCE(timezone, 'UTC') 
    INTO v_timezone 
    FROM public.companies 
    WHERE id = NEW.company_id;

    SELECT 
        COALESCE(cs.working_hours_start, c.work_start_time, '09:00:00'),
        COALESCE(cs.working_hours_end, c.work_end_time, '17:00:00'),
        COALESCE(cs.late_grace_period_minutes, c.grace_period_minutes, 15),
        COALESCE(c.early_departure_threshold_minutes, 0),
        COALESCE(cs.working_days, ARRAY[1,2,3,4,5])
    INTO v_work_start, v_work_end, v_grace_period, v_threshold, v_working_days
    FROM public.companies c
    LEFT JOIN public.company_settings cs ON c.id = cs.company_id
    WHERE c.id = NEW.company_id;

    IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.clock_in_time IS NOT NULL AND OLD.clock_in_time IS NULL)) THEN
        v_local_time := (NEW.clock_in_time AT TIME ZONE v_timezone)::TIME;
        v_day_of_week := EXTRACT(ISODOW FROM (NEW.clock_in_time AT TIME ZONE v_timezone));
        v_is_working_day := v_day_of_week = ANY(v_working_days);

        IF v_is_working_day THEN
            NEW.minutes_late := GREATEST(0, (EXTRACT(EPOCH FROM (v_local_time - v_work_start)) / 60)::INTEGER);
            NEW.is_late_arrival := (NEW.minutes_late > v_grace_period);
        ELSE
            NEW.minutes_late := 0;
            NEW.is_late_arrival := FALSE;
        END IF;
        
        IF NEW.status IS NULL OR NEW.status = '' THEN
            IF NEW.is_late_arrival THEN NEW.status := 'late_arrival';
            ELSE NEW.status := 'present';
            END IF;
        END IF;
    END IF;

    IF (TG_OP = 'UPDATE' AND NEW.clock_out_time IS NOT NULL AND OLD.clock_out_time IS NULL) THEN
        v_local_time := (NEW.clock_out_time AT TIME ZONE v_timezone)::TIME;
        
        v_day_of_week := EXTRACT(ISODOW FROM (NEW.clock_in_time AT TIME ZONE v_timezone));
        v_is_working_day := v_day_of_week = ANY(v_working_days);

        NEW.duration_minutes := (EXTRACT(EPOCH FROM (NEW.clock_out_time - NEW.clock_in_time)) / 60)::INTEGER;
        
        IF v_is_working_day THEN
            NEW.overtime_minutes := GREATEST(0, (EXTRACT(EPOCH FROM (v_local_time - v_work_end)) / 60)::INTEGER);
            NEW.minutes_early := GREATEST(0, (EXTRACT(EPOCH FROM (v_work_end - v_local_time)) / 60)::INTEGER);
            NEW.is_early_departure := (NEW.minutes_early > v_threshold);
        ELSE
            NEW.overtime_minutes := NEW.duration_minutes;
            NEW.minutes_early := 0;
            NEW.is_early_departure := FALSE;
        END IF;
        
        IF NEW.status = 'on_break' THEN
            NEW.status := 'present';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_attendance_metrics ON public.attendance_records;
CREATE TRIGGER trg_calculate_attendance_metrics
BEFORE INSERT OR UPDATE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.calculate_attendance_metrics();

COMMIT;

