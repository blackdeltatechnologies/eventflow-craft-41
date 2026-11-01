ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ticket_tiers jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS ticket_tier text;

DROP FUNCTION IF EXISTS public.register_for_event(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.register_for_event(p_event_id uuid, p_data jsonb, p_tier text DEFAULT NULL)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_id uuid; v_event record; v_current_count integer; v_email text; v_email_count integer;
  v_tier jsonb; v_tier_cap integer; v_tier_count integer;
BEGIN
  SELECT id, status, capacity, registration_limit, registration_deadline, ticket_tiers INTO v_event
  FROM events WHERE id = p_event_id AND status = 'live'::event_status FOR UPDATE;
  IF v_event IS NULL THEN RAISE EXCEPTION 'Event not found or not accepting registrations'; END IF;
  IF v_event.registration_deadline IS NOT NULL AND now() > v_event.registration_deadline THEN RAISE EXCEPTION 'Registration deadline has passed'; END IF;
  SELECT count(*) INTO v_current_count FROM registrations WHERE event_id = p_event_id AND status != 'cancelled'::registration_status;
  IF v_event.capacity IS NOT NULL AND v_current_count >= v_event.capacity THEN RAISE EXCEPTION 'Event is at full capacity'; END IF;
  IF v_event.registration_limit IS NOT NULL AND v_current_count >= v_event.registration_limit THEN RAISE EXCEPTION 'Registration limit reached'; END IF;
  IF p_data IS NULL OR p_data = '{}'::jsonb THEN RAISE EXCEPTION 'Registration data is required'; END IF;
  IF octet_length(p_data::text) > 4096 THEN RAISE EXCEPTION 'Registration data too large'; END IF;

  IF jsonb_typeof(v_event.ticket_tiers) = 'array' AND jsonb_array_length(v_event.ticket_tiers) > 0 THEN
    IF p_tier IS NULL OR trim(p_tier) = '' THEN RAISE EXCEPTION 'Please choose a ticket type'; END IF;
    SELECT t INTO v_tier FROM jsonb_array_elements(v_event.ticket_tiers) t WHERE t->>'name' = p_tier LIMIT 1;
    IF v_tier IS NULL THEN RAISE EXCEPTION 'Ticket type not found'; END IF;
    v_tier_cap := NULLIF(v_tier->>'capacity', '')::integer;
    IF v_tier_cap IS NOT NULL THEN
      SELECT count(*) INTO v_tier_count FROM registrations
      WHERE event_id = p_event_id AND ticket_tier = p_tier AND status != 'cancelled'::registration_status;
      IF v_tier_count >= v_tier_cap THEN RAISE EXCEPTION 'This ticket type is sold out'; END IF;
    END IF;
  ELSE
    p_tier := NULL;
  END IF;

  v_email := lower(trim(COALESCE(p_data->>'Email Address', p_data->>'email', p_data->>'Email', '')));
  IF v_email IS NOT NULL AND v_email != '' THEN
    SELECT count(*) INTO v_email_count FROM registrations
    WHERE event_id = p_event_id AND status != 'cancelled'::registration_status
      AND lower(trim(COALESCE(data->>'Email Address', data->>'email', data->>'Email', ''))) = v_email;
    IF v_email_count >= 2 THEN RAISE EXCEPTION 'This email has already been used to register for this event'; END IF;
  END IF;
  INSERT INTO registrations (event_id, data, ticket_tier) VALUES (p_event_id, p_data, p_tier) RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.register_for_event(uuid, jsonb, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_tier_counts(p_event_id uuid)
 RETURNS TABLE(tier text, count integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT r.ticket_tier, count(*)::integer FROM registrations r JOIN events e ON e.id = r.event_id AND e.status = 'live'
  WHERE r.event_id = p_event_id AND r.status != 'cancelled' AND r.ticket_tier IS NOT NULL GROUP BY r.ticket_tier $$;
GRANT EXECUTE ON FUNCTION public.get_tier_counts(uuid) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.find_registration_by_email(uuid, text);
CREATE FUNCTION public.find_registration_by_email(p_event_id uuid, p_email text)
 RETURNS TABLE(id uuid, status registration_status, attendee_name text, ticket_tier text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT r.id, r.status, COALESCE(r.data->>'Full Name', r.data->>'Name', '') AS attendee_name, r.ticket_tier
  FROM public.registrations r
  JOIN public.events e ON e.id = r.event_id AND e.status = 'live'
  WHERE r.event_id = p_event_id
    AND length(trim(p_email)) BETWEEN 3 AND 320
    AND EXISTS (SELECT 1 FROM jsonb_each_text(r.data) kv WHERE lower(trim(kv.value)) = lower(trim(p_email)))
    AND r.status <> 'cancelled'
  ORDER BY r.created_at DESC LIMIT 2;
$function$;
GRANT EXECUTE ON FUNCTION public.find_registration_by_email(uuid, text) TO anon, authenticated;