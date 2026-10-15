CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer');
CREATE TYPE public.event_status AS ENUM ('draft', 'live', 'past');
CREATE TYPE public.registration_status AS ENUM ('registered', 'checked_in', 'cancelled');
CREATE TYPE public.email_template_type AS ENUM ('confirmation', 'reminder', 'followup');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT, company TEXT, avatar_url TEXT, website TEXT,
  company_description TEXT, social_links JSONB DEFAULT '[]'::jsonb, company_slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Public can view company profiles by slug" ON public.profiles FOR SELECT TO anon, authenticated USING (company_slug IS NOT NULL);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$ BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL, UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, description TEXT,
  event_date TIMESTAMPTZ, event_end_date TIMESTAMPTZ, timezone TEXT DEFAULT 'America/New_York',
  event_type TEXT DEFAULT 'webinar', status event_status NOT NULL DEFAULT 'draft',
  template TEXT DEFAULT 'minimal', primary_color TEXT DEFAULT '#7C3AED', color_mode TEXT DEFAULT 'light',
  logo_url TEXT, background_image_url TEXT,
  location_type TEXT, location_value TEXT, ticket_price NUMERIC,
  requires_approval BOOLEAN DEFAULT false, capacity INTEGER,
  registration_limit INT, registration_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own events" ON public.events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON public.events FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON public.events FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Public can view live events" ON public.events FOR SELECT TO anon, authenticated USING (status = 'live'::event_status);
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_events_user_id ON public.events (user_id);

CREATE TABLE public.form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label TEXT NOT NULL, field_type TEXT NOT NULL DEFAULT 'text', placeholder TEXT,
  required BOOLEAN NOT NULL DEFAULT true, position INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.form_fields TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_fields TO authenticated;
GRANT ALL ON public.form_fields TO service_role;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view form fields for live events" ON public.form_fields FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = form_fields.event_id AND e.status = 'live'::event_status));
CREATE POLICY "Users can manage form fields via event ownership" ON public.form_fields FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = form_fields.event_id AND e.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = form_fields.event_id AND e.user_id = auth.uid()));
CREATE INDEX idx_form_fields_event_id ON public.form_fields (event_id);

CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}', status registration_status NOT NULL DEFAULT 'registered',
  checked_in_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.registrations TO anon;
GRANT SELECT, INSERT, UPDATE ON public.registrations TO authenticated;
GRANT ALL ON public.registrations TO service_role;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow registration for live events" ON public.registrations FOR INSERT TO anon, authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = registrations.event_id AND e.status = 'live'::event_status));
CREATE POLICY "Event owners can view registrations" ON public.registrations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = registrations.event_id AND e.user_id = auth.uid()));
CREATE POLICY "Event owners can update registrations" ON public.registrations FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = registrations.event_id AND e.user_id = auth.uid()));
CREATE INDEX idx_registrations_event_id ON public.registrations (event_id);

CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  template_type email_template_type NOT NULL, subject TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true, UNIQUE (event_id, template_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage email templates via event ownership" ON public.email_templates FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = email_templates.event_id AND e.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = email_templates.event_id AND e.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.get_registration_count(p_event_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT count(*)::integer FROM registrations WHERE event_id = p_event_id AND status != 'cancelled'::registration_status $$;

CREATE OR REPLACE FUNCTION public.register_for_event(p_event_id uuid, p_data jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_id uuid; v_event record; v_current_count integer; v_email text; v_email_count integer;
BEGIN
  SELECT id, status, capacity, registration_limit, registration_deadline INTO v_event
  FROM events WHERE id = p_event_id AND status = 'live'::event_status FOR UPDATE;
  IF v_event IS NULL THEN RAISE EXCEPTION 'Event not found or not accepting registrations'; END IF;
  IF v_event.registration_deadline IS NOT NULL AND now() > v_event.registration_deadline THEN RAISE EXCEPTION 'Registration deadline has passed'; END IF;
  SELECT count(*) INTO v_current_count FROM registrations WHERE event_id = p_event_id AND status != 'cancelled'::registration_status;
  IF v_event.capacity IS NOT NULL AND v_current_count >= v_event.capacity THEN RAISE EXCEPTION 'Event is at full capacity'; END IF;
  IF v_event.registration_limit IS NOT NULL AND v_current_count >= v_event.registration_limit THEN RAISE EXCEPTION 'Registration limit reached'; END IF;
  IF p_data IS NULL OR p_data = '{}'::jsonb THEN RAISE EXCEPTION 'Registration data is required'; END IF;
  IF octet_length(p_data::text) > 4096 THEN RAISE EXCEPTION 'Registration data too large'; END IF;
  v_email := lower(trim(COALESCE(p_data->>'Email Address', p_data->>'email', p_data->>'Email', '')));
  IF v_email IS NOT NULL AND v_email != '' THEN
    SELECT count(*) INTO v_email_count FROM registrations
    WHERE event_id = p_event_id AND status != 'cancelled'::registration_status
      AND lower(trim(COALESCE(data->>'Email Address', data->>'email', data->>'Email', ''))) = v_email;
    IF v_email_count >= 2 THEN RAISE EXCEPTION 'This email has already been used to register for this event'; END IF;
  END IF;
  INSERT INTO registrations (event_id, data) VALUES (p_event_id, p_data) RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.register_for_event(uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_registration_count(uuid) TO anon, authenticated;

CREATE POLICY "Anyone can view event assets" ON storage.objects FOR SELECT USING (bucket_id = 'event-assets');
CREATE POLICY "Authenticated users can upload event assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-assets');
CREATE POLICY "Users can update own event assets" ON storage.objects FOR UPDATE USING (bucket_id = 'event-assets' AND (owner)::uuid = auth.uid());
CREATE POLICY "Users can delete own event assets" ON storage.objects FOR DELETE USING (bucket_id = 'event-assets' AND (owner)::uuid = auth.uid());

NOTIFY pgrst, 'reload schema';