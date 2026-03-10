
CREATE TABLE public.metas_unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_unidade uuid NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  mes_ref date NOT NULL,
  meta_carros integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id_unidade, mes_ref)
);

ALTER TABLE public.metas_unidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read metas_unidades"
  ON public.metas_unidades FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Supervisors and gestors can manage metas_unidades"
  ON public.metas_unidades FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));
