-- Colunas extras para onboarding
ALTER TABLE public.company_context
  ADD COLUMN IF NOT EXISTS post_examples TEXT,
  ADD COLUMN IF NOT EXISTS slide_style   TEXT DEFAULT 'moderno';

-- Buckets de Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('logos',         'logos',         true, 5242880,  ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('media-library', 'media-library', true, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage
CREATE POLICY "logos_public_read"  ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "logos_anon_insert"  ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'logos');
CREATE POLICY "media_public_read"  ON storage.objects FOR SELECT USING (bucket_id = 'media-library');
CREATE POLICY "media_anon_insert"  ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'media-library');

-- Políticas RLS para onboarding (sem auth)
CREATE POLICY "anon_insert_companies"       ON public.companies       FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_companies"       ON public.companies       FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_companies"       ON public.companies       FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_insert_company_context" ON public.company_context FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_company_context" ON public.company_context FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_company_context" ON public.company_context FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_insert_media_library"   ON public.media_library   FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_media_library"   ON public.media_library   FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_content_themes"  ON public.content_themes  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_content_themes"  ON public.content_themes  FOR SELECT TO anon USING (true);
