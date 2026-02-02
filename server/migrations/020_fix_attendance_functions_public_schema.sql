BEGIN;

CREATE OR REPLACE FUNCTION public.check_geofence(
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
        FROM public.companies
        WHERE id = p_company_id AND office_latitude IS NOT NULL
        
        UNION ALL
        
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
        FROM public.company_locations
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
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.check_early_departure(
    p_company_id UUID,
    p_checkout_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE (
    is_early BOOLEAN,
    minutes_early INTEGER,
    expected_end_time TIME
) AS $$
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
    FROM public.companies
    WHERE id = p_company_id;

    v_local_time := (p_checkout_time AT TIME ZONE v_timezone)::TIME;
    v_mins_early := (EXTRACT(EPOCH FROM (v_work_end - v_local_time)) / 60)::INTEGER;
    
    RETURN QUERY SELECT 
        (v_mins_early > v_threshold) as is_early,
        GREATEST(0, v_mins_early) as minutes_early,
        v_work_end as expected_end_time;
END;
$$ LANGUAGE plpgsql;

COMMIT;

