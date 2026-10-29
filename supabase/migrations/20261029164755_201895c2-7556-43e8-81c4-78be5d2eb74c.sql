CREATE OR REPLACE FUNCTION public.find_registration_by_email(p_event_id uuid, p_email text)
RETURNS TABLE(id uuid, status registration_status, attendee_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.status,
    COALESCE(r.data->>'Full Name', r.data->>'Name', '') AS attendee_name
  FROM public.registrations r
  JOIN public.events e ON e.id = r.event_id AND e.status = 'live'
  WHERE r.event_id = p_event_id
    AND length(trim(p_email)) BETWEEN 3 AND 320
    AND EXISTS (SELECT 1 FROM jsonb_each_text(r.data) kv WHERE lower(trim(kv.value)) = lower(trim(p_email)))
    AND r.status <> 'cancelled'
  ORDER BY r.created_at DESC
  LIMIT 2;
$$;
REVOKE ALL ON FUNCTION public.find_registration_by_email(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.find_registration_by_email(uuid, text) TO anon, authenticated;