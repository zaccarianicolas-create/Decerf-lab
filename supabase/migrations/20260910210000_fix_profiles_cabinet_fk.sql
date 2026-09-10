-- Fix: ensure fk_profiles_cabinet exists so PostgREST can resolve profiles -> cabinets relationship
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'fk_profiles_cabinet'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT fk_profiles_cabinet
      FOREIGN KEY (cabinet_id) REFERENCES public.cabinets(id) ON DELETE SET NULL;
  END IF;
END $$;
