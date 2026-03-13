
ALTER TABLE public.leads
ADD COLUMN fup_concluido boolean NOT NULL DEFAULT false,
ADD COLUMN fup_concluido_em timestamp with time zone,
ADD COLUMN fup_concluido_numero integer,
ADD COLUMN fup_motivo_conclusao text;
