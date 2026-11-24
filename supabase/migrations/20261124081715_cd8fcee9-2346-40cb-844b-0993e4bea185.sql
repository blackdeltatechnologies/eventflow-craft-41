ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS payment_status text;

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  merchant_reference text NOT NULL UNIQUE,
  easypay_reference text,
  amount text NOT NULL,
  currency text NOT NULL DEFAULT 'TZS',
  payer_phone text NOT NULL,
  state text NOT NULL DEFAULT 'PENDING',
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizers view payments for their events" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid()));

CREATE TABLE public.payment_webhook_events (
  event_id text PRIMARY KEY,
  event_name text,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_webhook_events TO service_role;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_payment_status(p_reference text)
RETURNS TABLE(state text, registration_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT p.state, p.registration_id FROM public.payments p WHERE p.merchant_reference = p_reference LIMIT 1 $$;
GRANT EXECUTE ON FUNCTION public.get_payment_status(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.find_registration_by_email(p_event_id uuid, p_email text)
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
    AND COALESCE(r.payment_status, 'paid') = 'paid'
  ORDER BY r.created_at DESC LIMIT 2;
$function$;