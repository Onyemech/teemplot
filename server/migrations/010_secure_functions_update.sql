-- Migration: Secure Functions Update
-- Date: 2026-01-30
-- Description: Updates functions to follow security best practices (search_path='', SECURITY DEFINER where appropriate)

BEGIN;

-- 1. calculate_attendance_metrics
CREATE OR REPLACE FUNCTION public.calculate_attendance_metrics()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
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
    FROM companies 
    WHERE id = NEW.company_id;

    -- Schedule comes from company_settings (priority) or companies (legacy fallback)
    SELECT 
        COALESCE(cs.working_hours_start, c.work_start_time, '09:00:00'),
        COALESCE(cs.working_hours_end, c.work_end_time, '17:00:00'),
        COALESCE(cs.late_grace_period_minutes, c.grace_period_minutes, 15),
        COALESCE(c.early_departure_threshold_minutes, 0),
        COALESCE(cs.working_days, ARRAY[1,2,3,4,5]) -- Default Mon-Fri
    INTO v_work_start, v_work_end, v_grace_period, v_threshold, v_working_days
    FROM companies c
    LEFT JOIN company_settings cs ON c.id = cs.company_id
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
$function$;

-- 2. check_early_departure
CREATE OR REPLACE FUNCTION public.check_early_departure(p_company_id uuid, p_checkout_time timestamp with time zone DEFAULT now())
RETURNS TABLE(is_early boolean, minutes_early integer, expected_end_time time without time zone)
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
    v_work_end TIME;
    v_threshold INTEGER;
    v_local_time TIME;
    v_timezone TEXT;
    v_mins_early INTEGER;
BEGIN
    SELECT 
        COALESCE(work_end_time, '17:00:00'),
        COALESCE(early_departure_threshold_minutes, 0),
        COALESCE(timezone, 'UTC')
    INTO v_work_end, v_threshold, v_timezone
    FROM companies
    WHERE id = p_company_id;

    v_local_time := (p_checkout_time AT TIME ZONE v_timezone)::TIME;
    v_mins_early := (EXTRACT(EPOCH FROM (v_work_end - v_local_time)) / 60)::INTEGER;
    
    RETURN QUERY SELECT 
        (v_mins_early > v_threshold) as is_early,
        GREATEST(0, v_mins_early) as minutes_early,
        v_work_end as expected_end_time;
END;
$function$;

-- 3. check_geofence
CREATE OR REPLACE FUNCTION public.check_geofence(p_company_id uuid, p_latitude numeric, p_longitude numeric)
RETURNS TABLE(is_within boolean, distance_meters numeric, location_id uuid, location_name character varying)
LANGUAGE plpgsql
SET search_path = ''
AS $function$
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
            ))::NUMERIC as dist,
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
            ))::NUMERIC as dist,
            id as loc_id,
            name as loc_name,
            geofence_radius_meters as radius
        FROM company_locations
        WHERE company_id = p_company_id AND is_active = true
    )
    SELECT 
        (dist <= radius) as res_is_within,
        dist as res_distance_meters,
        loc_id as res_location_id,
        loc_name as res_location_name
    FROM distances
    ORDER BY (dist <= radius) DESC, dist ASC
    LIMIT 1;
END;
$function$;

-- 4. cleanup_table_definition_cache
CREATE OR REPLACE FUNCTION public.cleanup_table_definition_cache(older_than interval DEFAULT '24:00:00'::interval)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM public.table_definition_cache 
    WHERE last_updated < (now() - older_than);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$function$;

-- 5. get_company_employee_counts
CREATE OR REPLACE FUNCTION public.get_company_employee_counts(company_uuid uuid)
RETURNS TABLE(current_count bigint, declared_limit integer, pending_invitations bigint, remaining_slots integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(active_employees.count, 0)::BIGINT as current_count,
    COALESCE(c.employee_limit, 0) as declared_limit,
    COALESCE(pending_invites.count, 0)::BIGINT as pending_invitations,
    GREATEST(0, COALESCE(c.employee_limit, 0) - COALESCE(active_employees.count, 0) - COALESCE(pending_invites.count, 0)) as remaining_slots
  FROM companies c
  LEFT JOIN (
    SELECT company_id, COUNT(*) as count
    FROM users
    WHERE company_id = company_uuid 
      AND role IN ('employee', 'manager', 'department_head', 'admin')
      AND is_active = true
      AND deleted_at IS NULL
    GROUP BY company_id
  ) active_employees ON c.id = active_employees.company_id
  LEFT JOIN (
    SELECT company_id, COUNT(*) as count
    FROM employee_invitations
    WHERE company_id = company_uuid 
      AND status = 'pending'
      AND expires_at > NOW()
    GROUP BY company_id
  ) pending_invites ON c.id = pending_invites.company_id
  WHERE c.id = company_uuid;
END;
$function$;

-- 6. get_invitation_statistics
CREATE OR REPLACE FUNCTION public.get_invitation_statistics(company_uuid uuid)
RETURNS TABLE(total_invitations bigint, pending_invitations bigint, accepted_invitations bigint, expired_invitations bigint, cancelled_invitations bigint, last_invitation_sent timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_invitations,
    COUNT(*) FILTER (WHERE status = 'pending' AND expires_at > NOW()) as pending_invitations,
    COUNT(*) FILTER (WHERE status = 'accepted') as accepted_invitations,
    COUNT(*) FILTER (WHERE status = 'expired' OR (status = 'pending' AND expires_at <= NOW())) as expired_invitations,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_invitations,
    MAX(created_at) as last_invitation_sent
  FROM employee_invitations
  WHERE company_id = company_uuid;
END;
$function$;

-- 7. insert_user_location
CREATE OR REPLACE FUNCTION public.insert_user_location(p_company_id uuid, p_user_id uuid, p_latitude numeric, p_longitude numeric, p_accuracy numeric, p_permission_state character varying)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  gf RECORD;
  new_id UUID;
BEGIN
  -- Evaluate geofence using existing helper
  SELECT * INTO gf FROM check_geofence(p_company_id, p_latitude, p_longitude) LIMIT 1;

  INSERT INTO user_locations (
    company_id, user_id, latitude, longitude, accuracy,
    permission_state, is_inside_geofence, distance_meters,
    location_id, location_name
  ) VALUES (
    p_company_id, p_user_id, p_latitude, p_longitude, p_accuracy,
    p_permission_state,
    COALESCE(gf.is_within, NULL),
    COALESCE(gf.distance_meters, NULL),
    COALESCE(gf.location_id, NULL),
    COALESCE(gf.location_name, NULL)
  )
  RETURNING id INTO new_id;

  -- Update user's last_location_verified_at when permission is granted
  IF p_permission_state = 'granted' THEN
    UPDATE users
    SET last_location_verified_at = NOW()
    WHERE id = p_user_id;
  END IF;

  RETURN new_id;
END;
$function$;

-- 8. refresh_timezone_cache
CREATE OR REPLACE FUNCTION public.refresh_timezone_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW timezone_cache;
END;
$function$;

-- 9. update_company_invitation_counter
CREATE OR REPLACE FUNCTION public.update_company_invitation_counter(company_uuid uuid, delta integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- This function is a placeholder for atomic counter updates
  -- In a production system, you might want to implement actual counter tracking
  -- For now, we'll just log the operation for audit purposes
  
  INSERT INTO audit_logs (
    user_id,
    company_id,
    action,
    details,
    created_at
  ) VALUES (
    COALESCE(current_setting('app.current_user_id', true), 'system'),
    company_uuid,
    'invitation_counter_update',
    jsonb_build_object('delta', delta, 'timestamp', NOW()),
    NOW()
  );
END;
$function$;

-- 10. update_employee_invitations_updated_at
CREATE OR REPLACE FUNCTION public.update_employee_invitations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

COMMIT;
