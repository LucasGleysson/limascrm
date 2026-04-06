

## Plano de Implementação: Reativação Completa da Recepcionista + Campo `id_recepcionista`

### Resumo

Implementação completa do perfil de recepcionista com rastreabilidade de quem atendeu cada lead, incluindo novo campo no banco de dados, correção de permissões, e nova aba nos painéis de gestão.

### 1. Migration SQL (2 alterações)

**a) Nova coluna `id_recepcionista`:**
```sql
ALTER TABLE public.leads ADD COLUMN id_recepcionista uuid;
```
- Nullable, sem foreign key (mesmo padrão do `id_agente`)
- Não quebra nada: registros existentes ficam com `NULL`

**b) Atualizar política INSERT de leads:**
```sql
DROP POLICY "Users can insert leads" ON public.leads;
CREATE POLICY "Users can insert leads" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (
    id_agente = auth.uid()
    OR has_role(auth.uid(), 'gestor'::app_role)
    OR has_role(auth.uid(), 'supervisor'::app_role)
    OR has_role(auth.uid(), 'recepcionista'::app_role)
  );
```

### 2. Tipo Lead (`mockData.ts`)
- Adicionar `id_recepcionista?: string | null`

### 3. LeadContext (`LeadContext.tsx`)
- Remover bloqueio `if (isRecepcionista) { setLoading(false); return; }` (linha 142-144)
- Habilitar realtime para recepcionistas (além de agentes)
- Adicionar `id_recepcionista` no `mapLead` e no `addLead`

### 4. Notas rastreáveis (`notasUtils.ts`)
- Adicionar parâmetro opcional `autor` ao `appendNota`:
```typescript
export function appendNota(existing, label, text, autor?: string): string {
  const prefix = autor ? `[${autor}] ` : "";
  const entry = `[${timestamp}] ${prefix}${label}: ${text}`;
  ...
}
```

### 5. NewLeadModal (`NewLeadModal.tsx`)
- Tornar OS opcional para recepcionista (remover `!numeroOs` da validação)
- Quando `isReceptionist`, incluir `id_recepcionista: currentUser.id` no `addLead`
- Manter etapa padrão `na_loja` e remover seletor de status

### 6. ReceptionistDashboard (`ReceptionistDashboard.tsx`)
- Em todas as ações (checkin, emServico, dispensar, checkout): incluir `id_recepcionista: currentUser.id` e passar `currentUser.nome` como `autor` no `appendNota`

### 7. AgentReceptionPanel (`AgentReceptionPanel.tsx`)
- Mesma lógica: quando o agente faz ações na recepção, não precisa preencher `id_recepcionista` (só recepcionistas preenchem)

### 8. Nova aba "Recepção" no Supervisor e Gestor
- Adicionar tab `{ id: "recepcao", label: "Recepção", icon: LogIn }` nos `SIDEBAR_TABS` de ambos
- Conteúdo: tabela de recepcionistas com métricas (check-ins, concluídos, dispensados, total de leads)
- Filtro por unidade
- Ao clicar numa recepcionista, expandir detalhes (mesmo padrão da aba "por agente")

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | `ADD COLUMN id_recepcionista uuid` + RLS INSERT |
| `mockData.ts` | Campo na interface Lead |
| `LeadContext.tsx` | Remover bloqueio, realtime, mapear campo |
| `notasUtils.ts` | Parâmetro `autor` |
| `NewLeadModal.tsx` | OS opcional, `id_recepcionista` na criação |
| `ReceptionistDashboard.tsx` | `id_recepcionista` + nome em notas |
| `SupervisorDashboard.tsx` | Nova aba "Recepção" |
| `ManagerDashboard.tsx` | Nova aba "Recepção" |

