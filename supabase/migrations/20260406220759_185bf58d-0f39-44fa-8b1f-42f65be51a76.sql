ALTER TABLE public.leads ADD COLUMN id_recepcionista uuid;

DROP POLICY "Users can insert leads" ON public.leads;
CREATE POLICY "Users can insert leads" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (
    id_agente = auth.uid()
    OR has_role(auth.uid(), 'gestor'::app_role)
    OR has_role(auth.uid(), 'supervisor'::app_role)
    OR has_role(auth.uid(), 'recepcionista'::app_role)
  );