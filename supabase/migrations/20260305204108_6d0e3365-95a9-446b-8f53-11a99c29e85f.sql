
-- Tighten leads INSERT: only authenticated users who set themselves as agent or have gestor role
DROP POLICY "Authenticated users can insert leads" ON public.leads;
CREATE POLICY "Users can insert leads" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (id_agente = auth.uid() OR public.has_role(auth.uid(), 'gestor'::app_role) OR public.has_role(auth.uid(), 'supervisor'::app_role));

-- Tighten leads UPDATE: own leads or gestor/supervisor/recepcionista
DROP POLICY "Authenticated users can update leads" ON public.leads;
CREATE POLICY "Users can update leads" ON public.leads FOR UPDATE TO authenticated
  USING (id_agente = auth.uid() OR public.has_role(auth.uid(), 'gestor'::app_role) OR public.has_role(auth.uid(), 'supervisor'::app_role) OR public.has_role(auth.uid(), 'recepcionista'::app_role));

-- Tighten eventos INSERT
DROP POLICY "Authenticated users can insert eventos" ON public.eventos;
CREATE POLICY "Users can insert eventos" ON public.eventos FOR INSERT TO authenticated
  WITH CHECK (id_usuario = auth.uid() OR public.has_role(auth.uid(), 'gestor'::app_role));

-- Tighten eventos UPDATE
DROP POLICY "Authenticated users can update eventos" ON public.eventos;
CREATE POLICY "Users can update eventos" ON public.eventos FOR UPDATE TO authenticated
  USING (id_usuario = auth.uid() OR public.has_role(auth.uid(), 'gestor'::app_role));

-- Tighten interacoes INSERT
DROP POLICY "Authenticated users can insert interacoes" ON public.interacoes;
CREATE POLICY "Users can insert interacoes" ON public.interacoes FOR INSERT TO authenticated
  WITH CHECK (id_usuario = auth.uid() OR public.has_role(auth.uid(), 'gestor'::app_role));
