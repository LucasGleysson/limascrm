
-- Allow gestor and supervisor to delete leads
CREATE POLICY "Gestors and supervisors can delete leads"
ON public.leads
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Allow gestor and supervisor to delete related eventos when deleting leads
CREATE POLICY "Gestors and supervisors can delete eventos"
ON public.eventos
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));
