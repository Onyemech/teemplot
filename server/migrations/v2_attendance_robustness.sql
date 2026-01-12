
-- Enterprise Attendance Robustness Migration
-- Fixes: Timezones, Multi-location Geofencing, Automated Metrics Calculation

BEGIN;

-- 1. Improved Component: Multi-location Geofence Check
-- Returns JSONB with is_within, distance_meters, and location_id
CREATE OR REPLACE FUNCTION check_geofence(
    p_company_id UUID,
    p_latitude NUMERIC,
    p_longitude NUMERIC
) RETURNS TABLE (
    is_within BOOLEAN,
    distance_meters NUMERIC,
    location_id UUID,
    location_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH distances AS (
        -- Primary Office
        SELECT 
            (6371000 * acos(
                LEAST(1.0, GREATEST(-1.0, 
                    cos(radians(office_latitude)) * cos(radians(p_latitude)) *
                    cos(radians(p_longitude) - radians(office_longitude)) +
                    sin(radians(office_latitude)) * sin(radians(p_latitude))
                ))
            )) as dist,
            NULL::UUID as loc_id,
            'Main Office'::VARCHAR as loc_name,
            geofence_radius_meters as radius
        FROM companies
        WHERE id = p_company_id AND office_latitude IS NOT NULL
        
        UNION ALL
        
        -- Secondary Locations
        SELECT 
            (6371000 * acos(
                LEAST(1.0, GREATEST(-1.0, 
                    cos(radians(latitude)) * cos(radians(p_latitude)) *
                    cos(radians(p_longitude) - radians(longitude)) +
                    sin(radians(latitude)) * sin(radians(p_latitude))
                ))
            )) as dist,
            id as loc_id,
            name as loc_name,
            geofence_radius_meters as radius
        FROM company_locations
        WHERE company_id = p_company_id AND is_active = true
    )
    SELECT 
        (dist <= radius) as is_within,
        dist as distance_meters,
        loc_id as location_id,
        loc_name as location_name
    FROM distances
    ORDER BY (dist <= radius) DESC, dist ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 2. Automated Metrics Calculation Trigger
CREATE OR REPLACE FUNCTION calculate_attendance_metrics()
RETURNS TRIGGER AS $$
DECLARE
    v_timezone TEXT;
    v_work_start TIME;
    v_work_end TIME;
    v_grace_period INTEGER;
    v_threshold INTEGER;
    v_local_time TIME;
BEGIN
    -- Get company configuration (Note: using company_settings table if possible, fallback to companies)
    -- Based on schema audit, both exist. Let's use companies as primary for basic schedule.
    SELECT 
        COALESCE(timezone, 'UTC'), 
        COALESCE(work_start_time, '09:00:00'), 
        COALESCE(work_end_time, '17:00:00'), 
        COALESCE(grace_period_minutes, 15), 
        COALESCE(early_departure_threshold_minutes, 0)
    INTO v_timezone, v_work_start, v_work_end, v_grace_period, v_threshold
    FROM companies
    WHERE id = NEW.company_id;

    -- Handle Check-in Metrics
    IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.clock_in_time IS NOT NULL AND OLD.clock_in_time IS NULL)) THEN
        v_local_time := (NEW.clock_in_time AT TIME ZONE v_timezone)::TIME;
        
        NEW.minutes_late := GREATEST(0, (EXTRACT(EPOCH FROM (v_local_time - v_work_start)) / 60)::INTEGER);
        NEW.is_late_arrival := (NEW.minutes_late > v_grace_period);
        
        -- Default status if not provided
        IF NEW.status IS NULL OR NEW.status = '' THEN
            IF NEW.is_late_arrival THEN NEW.status := 'late_arrival';
            ELSE NEW.status := 'present';
            END IF;
        END IF;
    END IF;

    -- Handle Check-out Metrics
    IF (TG_OP = 'UPDATE' AND NEW.clock_out_time IS NOT NULL AND OLD.clock_out_time IS NULL) THEN
        v_local_time := (NEW.clock_out_time AT TIME ZONE v_timezone)::TIME;
        
        NEW.minutes_early := GREATEST(0, (EXTRACT(EPOCH FROM (v_work_end - v_local_time)) / 60)::INTEGER);
        NEW.is_early_departure := (NEW.minutes_early > v_threshold);
        
        -- Update record status to present if it was 'on_break'
        IF NEW.status = 'on_break' THEN
            NEW.status := 'present';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_attendance_metrics ON attendance_records;
CREATE TRIGGER trg_calculate_attendance_metrics
BEFORE INSERT OR UPDATE ON attendance_records
FOR EACH ROW
EXECUTE FUNCTION calculate_attendance_metrics();

-- Add missing columns if they don't exist (safety)
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS total_break_minutes INTEGER;

COMMIT;
