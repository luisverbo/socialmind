-- ============================================================
-- Add unsplash_credits column to posts table
-- Stores Unsplash photo attribution per slide
-- ============================================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS unsplash_credits JSONB DEFAULT NULL;

-- ============================================================
-- Update content_themes tone CHECK constraint to allow 'journalistic'
-- ============================================================

-- Drop the existing check constraint if it exists
ALTER TABLE public.content_themes
  DROP CONSTRAINT IF EXISTS content_themes_tone_check;

-- Re-add with journalistic included
ALTER TABLE public.content_themes
  ADD CONSTRAINT content_themes_tone_check
  CHECK (tone IN ('educational', 'motivational', 'promotional', 'journalistic'));

-- Same for weekly_theme_schedule
ALTER TABLE public.weekly_theme_schedule
  DROP CONSTRAINT IF EXISTS weekly_theme_schedule_tone_check;

ALTER TABLE public.weekly_theme_schedule
  ADD CONSTRAINT weekly_theme_schedule_tone_check
  CHECK (tone IN ('educational', 'motivational', 'promotional', 'journalistic'));
