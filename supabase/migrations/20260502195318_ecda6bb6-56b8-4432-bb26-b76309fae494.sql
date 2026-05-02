
-- 1. BACKFILL leads.id_unidade
-- 1a: agente com exatamente 1 unidade
WITH agentes_uma_unidade AS (
  SELECT id_agente, (array_agg(id_unidade))[1] AS id_unidade
  FROM public.agente_unidades
  GROUP BY id_agente
  HAVING COUNT(*) = 1
)
UPDATE public.leads l
SET id_unidade = sub.id_unidade
FROM agentes_uma_unidade sub
WHERE l.id_unidade IS NULL
  AND l.id_agente = sub.id_agente;

-- 1b: agente com profiles.unidade_padrao válido
UPDATE public.leads l
SET id_unidade = p.unidade_padrao::uuid
FROM public.profiles p
WHERE l.id_unidade IS NULL
  AND l.id_agente = p.id
  AND p.unidade_padrao IS NOT NULL
  AND p.unidade_padrao ~ '^[0-9a-f-]{36}$'
  AND EXISTS (SELECT 1 FROM public.unidades u WHERE u.id = p.unidade_padrao::uuid);

-- 1c: via recepcionista
UPDATE public.leads l
SET id_unidade = p.unidade_padrao::uuid
FROM public.profiles p
WHERE l.id_unidade IS NULL
  AND l.id_recepcionista = p.id
  AND p.unidade_padrao IS NOT NULL
  AND p.unidade_padrao ~ '^[0-9a-f-]{36}$'
  AND EXISTS (SELECT 1 FROM public.unidades u WHERE u.id = p.unidade_padrao::uuid);

-- 2. SINCRONIZAR agente_unidades a partir de profiles.unidade_padrao
INSERT INTO public.agente_unidades (id_agente, id_unidade)
SELECT p.id, p.unidade_padrao::uuid
FROM public.profiles p
WHERE p.cargo = 'agente'
  AND p.unidade_padrao IS NOT NULL
  AND p.unidade_padrao ~ '^[0-9a-f-]{36}$'
  AND EXISTS (SELECT 1 FROM public.unidades u WHERE u.id = p.unidade_padrao::uuid)
  AND NOT EXISTS (
    SELECT 1 FROM public.agente_unidades au
    WHERE au.id_agente = p.id AND au.id_unidade = p.unidade_padrao::uuid
  );

-- 3. UNIQUE + INDEXES em agente_unidades
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agente_unidades_unique_pair') THEN
    ALTER TABLE public.agente_unidades
      ADD CONSTRAINT agente_unidades_unique_pair UNIQUE (id_agente, id_unidade);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agente_unidades_agente ON public.agente_unidades(id_agente);
CREATE INDEX IF NOT EXISTS idx_agente_unidades_unidade ON public.agente_unidades(id_unidade);

-- 4. INDEXES em leads
CREATE INDEX IF NOT EXISTS idx_leads_id_unidade ON public.leads(id_unidade);
CREATE INDEX IF NOT EXISTS idx_leads_id_agente ON public.leads(id_agente);
CREATE INDEX IF NOT EXISTS idx_leads_id_recepcionista ON public.leads(id_recepcionista);
CREATE INDEX IF NOT EXISTS idx_leads_unidade_etapa ON public.leads(id_unidade, etapa);
CREATE INDEX IF NOT EXISTS idx_leads_unidade_data_agendamento ON public.leads(id_unidade, data_agendamento);

-- 5. Comentário
COMMENT ON COLUMN public.profiles.unidade_padrao IS
  'Lotação principal. Para RECEPCIONISTAS é a fonte de verdade. Para AGENTES use agente_unidades (N:N).';

-- 6. Funções utilitárias
CREATE OR REPLACE FUNCTION public.agente_unidades_de(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id_unidade FROM public.agente_unidades WHERE id_agente = _user_id
$$;

CREATE OR REPLACE FUNCTION public.pode_ver_unidade(_user_id uuid, _unidade uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    _unidade IS NOT NULL AND (
      public.has_role(_user_id, 'gestor'::app_role)
      OR public.has_role(_user_id, 'supervisor'::app_role)
      OR (
        public.has_role(_user_id, 'recepcionista'::app_role)
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = _user_id
            AND p.unidade_padrao IS NOT NULL
            AND p.unidade_padrao ~ '^[0-9a-f-]{36}$'
            AND p.unidade_padrao::uuid = _unidade
        )
      )
      OR (
        public.has_role(_user_id, 'agente'::app_role)
        AND EXISTS (
          SELECT 1 FROM public.agente_unidades au
          WHERE au.id_agente = _user_id AND au.id_unidade = _unidade
        )
      )
    )
$$;

-- 7. Trigger autofill leads.id_unidade
CREATE OR REPLACE FUNCTION public.leads_autofill_unidade()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_unidade uuid;
  v_count int;
  v_recep_un text;
BEGIN
  IF NEW.id_unidade IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.id_agente IS NOT NULL THEN
    SELECT COUNT(*), (array_agg(id_unidade))[1]
      INTO v_count, v_unidade
    FROM public.agente_unidades
    WHERE id_agente = NEW.id_agente;
    IF v_count = 1 THEN
      NEW.id_unidade := v_unidade;
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.id_recepcionista IS NOT NULL THEN
    SELECT unidade_padrao INTO v_recep_un
    FROM public.profiles WHERE id = NEW.id_recepcionista;
    IF v_recep_un IS NOT NULL AND v_recep_un ~ '^[0-9a-f-]{36}$' THEN
      NEW.id_unidade := v_recep_un::uuid;
      RETURN NEW;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_autofill_unidade ON public.leads;
CREATE TRIGGER trg_leads_autofill_unidade
BEFORE INSERT OR UPDATE OF id_agente, id_recepcionista, id_unidade ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.leads_autofill_unidade();

-- 8. RLS leads UPDATE com pode_ver_unidade
DROP POLICY IF EXISTS "Users can update leads" ON public.leads;
CREATE POLICY "Users can update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'gestor'::app_role)
  OR has_role(auth.uid(), 'supervisor'::app_role)
  OR (id_agente = auth.uid())
  OR public.pode_ver_unidade(auth.uid(), id_unidade)
)
WITH CHECK (
  has_role(auth.uid(), 'gestor'::app_role)
  OR has_role(auth.uid(), 'supervisor'::app_role)
  OR (id_agente = auth.uid())
  OR public.pode_ver_unidade(auth.uid(), id_unidade)
);

-- 9. RLS eventos via pode_ver_unidade
DROP POLICY IF EXISTS "Users can update eventos" ON public.eventos;
CREATE POLICY "Users can update eventos"
ON public.eventos
FOR UPDATE
TO authenticated
USING (
  id_usuario = auth.uid()
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR has_role(auth.uid(), 'supervisor'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = eventos.id_lead
      AND (l.id_agente = auth.uid() OR public.pode_ver_unidade(auth.uid(), l.id_unidade))
  )
);

DROP POLICY IF EXISTS "Users can insert eventos" ON public.eventos;
CREATE POLICY "Users can insert eventos"
ON public.eventos
FOR INSERT
TO authenticated
WITH CHECK (
  id_usuario = auth.uid()
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR has_role(auth.uid(), 'supervisor'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = eventos.id_lead
      AND (l.id_agente = auth.uid() OR public.pode_ver_unidade(auth.uid(), l.id_unidade))
  )
);
