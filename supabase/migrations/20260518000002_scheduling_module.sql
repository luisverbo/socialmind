-- scheduled_for na tabela posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_for ON public.posts(scheduled_for);

-- Políticas anon
CREATE POLICY "anon_select_post_schedules" ON public.post_schedules FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_post_schedules" ON public.post_schedules FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_post_schedules" ON public.post_schedules FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_delete_post_schedules" ON public.post_schedules FOR DELETE TO anon USING (true);
CREATE POLICY "anon_select_posts"          ON public.posts          FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_posts"          ON public.posts          FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_posts"          ON public.posts          FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_delete_posts"          ON public.posts          FOR DELETE TO anon USING (true);
CREATE POLICY "anon_select_notifications"  ON public.notifications  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_notifications"  ON public.notifications  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_notifications"  ON public.notifications  FOR UPDATE TO anon USING (true);

-- Gera posts para N semanas de um agendamento
CREATE OR REPLACE FUNCTION public.generate_schedule_posts(p_schedule_id UUID, p_weeks INTEGER DEFAULT 4)
RETURNS INTEGER AS $$
DECLARE
  v_schedule   public.post_schedules%ROWTYPE;
  v_day_offset INTEGER;
  v_week       INTEGER;
  v_week_start DATE;
  v_target_dt  TIMESTAMPTZ;
  v_count      INTEGER := 0;
BEGIN
  SELECT * INTO v_schedule FROM public.post_schedules WHERE id = p_schedule_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF v_schedule.type = 'one_time' AND v_schedule.scheduled_date IS NOT NULL THEN
    v_target_dt := (v_schedule.scheduled_date::TEXT || ' ' || v_schedule.scheduled_time::TEXT)::TIMESTAMPTZ;
    IF NOT EXISTS (SELECT 1 FROM public.posts WHERE schedule_id = p_schedule_id AND scheduled_for = v_target_dt) THEN
      INSERT INTO public.posts (company_id, schedule_id, status, scheduled_for)
      VALUES (v_schedule.company_id, p_schedule_id, 'draft', v_target_dt);
      v_count := 1;
    END IF;
    RETURN v_count;
  END IF;
  v_day_offset := CASE v_schedule.day_of_week
    WHEN 'monday' THEN 0 WHEN 'tuesday' THEN 1 WHEN 'wednesday' THEN 2
    WHEN 'thursday' THEN 3 WHEN 'friday' THEN 4 WHEN 'saturday' THEN 5
    WHEN 'sunday' THEN 6 ELSE 0 END;
  FOR v_week IN 0..p_weeks-1 LOOP
    v_week_start := DATE_TRUNC('week', (NOW() AT TIME ZONE 'UTC') + (v_week * 7 || ' days')::INTERVAL)::DATE;
    v_target_dt  := (v_week_start + v_day_offset * INTERVAL '1 day')::TIMESTAMP + v_schedule.scheduled_time;
    IF v_target_dt > NOW() AND NOT EXISTS (
      SELECT 1 FROM public.posts WHERE schedule_id = p_schedule_id AND scheduled_for = v_target_dt
    ) THEN
      INSERT INTO public.posts (company_id, schedule_id, status, scheduled_for)
      VALUES (v_schedule.company_id, p_schedule_id, 'draft', v_target_dt);
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gera posts da próxima semana (executado pelo cron)
CREATE OR REPLACE FUNCTION public.generate_next_week_posts()
RETURNS INTEGER AS $$
DECLARE
  v_schedule   RECORD;
  v_day_offset INTEGER;
  v_week_start DATE;
  v_target_dt  TIMESTAMPTZ;
  v_count      INTEGER := 0;
BEGIN
  v_week_start := DATE_TRUNC('week', (NOW() AT TIME ZONE 'UTC') + INTERVAL '7 days')::DATE;
  FOR v_schedule IN SELECT * FROM public.post_schedules WHERE type='recurring' AND status='active' AND repeat=TRUE LOOP
    v_day_offset := CASE v_schedule.day_of_week
      WHEN 'monday' THEN 0 WHEN 'tuesday' THEN 1 WHEN 'wednesday' THEN 2
      WHEN 'thursday' THEN 3 WHEN 'friday' THEN 4 WHEN 'saturday' THEN 5
      WHEN 'sunday' THEN 6 ELSE 0 END;
    v_target_dt := (v_week_start + v_day_offset * INTERVAL '1 day')::TIMESTAMP + v_schedule.scheduled_time;
    IF NOT EXISTS (SELECT 1 FROM public.posts WHERE schedule_id = v_schedule.id AND scheduled_for = v_target_dt) THEN
      INSERT INTO public.posts (company_id, schedule_id, status, scheduled_for)
      VALUES (v_schedule.company_id, v_schedule.id, 'draft', v_target_dt);
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule('generate-weekly-posts', '0 23 * * 0', 'SELECT public.generate_next_week_posts();');
