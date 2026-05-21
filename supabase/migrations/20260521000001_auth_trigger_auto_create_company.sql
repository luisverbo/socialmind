-- ============================================================
-- Auto-create company record when a new user signs up via Supabase Auth
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan       TEXT;
  v_plan_limit INTEGER;
BEGIN
  v_plan := COALESCE(NEW.raw_user_meta_data->>'plan', 'starter');

  v_plan_limit := CASE v_plan
    WHEN 'pro'    THEN 30
    WHEN 'agency' THEN 90
    ELSE 12
  END;

  INSERT INTO public.companies (
    name, email, plan, posts_limit, credits_limit,
    credits_balance, credits_used_this_month, posts_used_this_month,
    active, role, user_id
  )
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_plan,
    v_plan_limit,
    v_plan_limit,
    v_plan_limit,
    0, 0, TRUE, 'user', NEW.id
  )
  ON CONFLICT (email) DO UPDATE
    SET user_id = EXCLUDED.user_id
    WHERE public.companies.user_id IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Back-fill user_id for existing companies matched by email
UPDATE public.companies c
SET user_id = u.id
FROM auth.users u
WHERE u.email = c.email
  AND c.user_id IS NULL;
