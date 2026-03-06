-- Fix profiles RLS: allow all authenticated users to read basic profile info (id, nome, cargo, unidade_padrao)
-- Drop the restrictive SELECT policy and replace with one that allows all authenticated users to read
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Authenticated users can read profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);