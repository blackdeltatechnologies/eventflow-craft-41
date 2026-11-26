DROP POLICY IF EXISTS "Authenticated users can upload event assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload event assets" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-assets' AND (storage.foldername(name))[1] = (select auth.uid()::text));