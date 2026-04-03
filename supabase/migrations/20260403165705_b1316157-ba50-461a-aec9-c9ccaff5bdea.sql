
CREATE TABLE public.agente_unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_agente uuid NOT NULL,
  id_unidade uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id_agente, id_unidade)
);

ALTER TABLE public.agente_unidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read agente_unidades"
  ON public.agente_unidades FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Supervisors and gestors can manage agente_unidades"
  ON public.agente_unidades FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

-- Seed existing unidade_padrao assignments into agente_unidades
INSERT INTO public.agente_unidades (id_agente, id_unidade)
SELECT p.id, u.id
FROM public.profiles p
JOIN public.unidades u ON p.unidade_padrao::uuid = u.id
WHERE p.unidade_padrao IS NOT NULL AND p.cargo = 'agente'
ON CONFLICT DO NOTHING;
