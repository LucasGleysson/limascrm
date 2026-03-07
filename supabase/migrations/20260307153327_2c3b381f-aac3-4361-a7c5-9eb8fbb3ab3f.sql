
CREATE TABLE public.metas_agentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_agente uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mes_ref date NOT NULL,
  meta_carros integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id_agente, mes_ref)
);

ALTER TABLE public.metas_agentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read metas"
  ON public.metas_agentes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Supervisors and gestors can manage metas"
  ON public.metas_agentes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

CREATE TRIGGER update_metas_agentes_updated_at
  BEFORE UPDATE ON public.metas_agentes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
