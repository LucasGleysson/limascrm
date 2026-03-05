
-- Create unidades table
CREATE TABLE public.unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read unidades"
  ON public.unidades FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestors can manage unidades"
  ON public.unidades FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'::app_role));

-- Create leads table
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text NOT NULL,
  origem text NOT NULL DEFAULT 'Porta',
  etapa text NOT NULL DEFAULT 'novo',
  data_entrada date NOT NULL DEFAULT CURRENT_DATE,
  id_agente uuid REFERENCES public.profiles(id) NOT NULL,
  id_unidade uuid REFERENCES public.unidades(id),
  data_agendamento date,
  numero_os text,
  valor_servico numeric,
  tags_servico text[],
  checkin timestamptz,
  checkout timestamptz,
  is_porta boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read leads"
  ON public.leads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert leads"
  ON public.leads FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads"
  ON public.leads FOR UPDATE TO authenticated USING (true);

-- Create eventos table
CREATE TABLE public.eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_lead uuid REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  tipo text NOT NULL DEFAULT 'followup',
  numero integer NOT NULL,
  data_prevista date NOT NULL,
  concluido boolean NOT NULL DEFAULT false,
  data_conclusao timestamptz,
  descricao_conclusao text,
  id_usuario uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read eventos"
  ON public.eventos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert eventos"
  ON public.eventos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update eventos"
  ON public.eventos FOR UPDATE TO authenticated USING (true);

-- Create interacoes table
CREATE TABLE public.interacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_lead uuid REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  tipo text NOT NULL,
  descricao text NOT NULL,
  data timestamptz NOT NULL DEFAULT now(),
  id_usuario uuid REFERENCES public.profiles(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.interacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read interacoes"
  ON public.interacoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert interacoes"
  ON public.interacoes FOR INSERT TO authenticated WITH CHECK (true);

-- Add trigger for leads updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed unidades
INSERT INTO public.unidades (id, nome) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Serrana'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'Laranjeiras'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'Grandville'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'Patrocínio'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'Araguari'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 'Catalão');

-- Enable realtime for leads, eventos, interacoes
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.eventos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.interacoes;
