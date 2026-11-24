CREATE INDEX IF NOT EXISTS payments_event_id_idx ON public.payments(event_id);
CREATE INDEX IF NOT EXISTS payments_registration_id_idx ON public.payments(registration_id);