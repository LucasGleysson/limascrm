# Correções no processo de Follow-up

## Diagnóstico

Investiguei o código e identifiquei 4 causas distintas para os problemas relatados:

### 1) Agente não vê leads das unidades dela (Laranjeiras / Grandville)
Arquivo: `src/pages/AgentDashboard.tsx` — linha 60.
```ts
const allMyLeads = leads.filter((l) => l.id_agente === currentUser.id);
```
A aba "Leads" do agente filtra **apenas** por `id_agente === eu`. Leads que pertencem às unidades dela mas estão sem agente (ou com outro agente) **não aparecem** — mesmo o `LeadContext` os carregando corretamente. É por isso que Dispensados/Reagendados das unidades dela ficam invisíveis.

O `EventoPanel` (eventos/followups) já usa a regra correta (id_agente OU unidade), por isso lá aparece — mas só se a edge function tiver gerado o FUP (ver item 4).

### 2) Dispensado → Perdido automático (deveria ir para Análise do Supervisor)
Arquivo: `supabase/functions/generate-followups/index.ts`.
```ts
const FINAL = { novo: "trabalhado", agendado: "desqualificado_agendado", dispensado: "perdido" };
```
Quando o ciclo automático de FUPs de um Dispensado encerra, o status vai direto para `perdido`, pulando a auditoria do supervisor. A conclusão manual (botão Encerrar) já manda para `analise_supervisor` — mas a automática não.

### 3) Lead com agendamento atualizado vira "desqualificado_agendado" sozinho
Quando o agente apenas **atualiza a data de agendamento** (sem mudar etapa), o ciclo de FUPs antigo continua contando. Categoria `agendado` tem MAX=3, então após 3 FUPs concluídos o sistema marca automaticamente como `desqualificado_agendado` — mesmo que o cliente esteja com agendamento futuro válido e OS gerada.

Causa: não existe nenhum mecanismo que **reseta** o ciclo de FUPs quando `data_agendamento` muda.

### 4) Limite de 1000 linhas na edge function de FUPs
Arquivo: `supabase/functions/generate-followups/index.ts`.
A query `.select(...).or(...)` **não pagina** — o PostgREST retorna no máximo 1000 leads por requisição. Em uma base com muitos leads elegíveis, parte deles simplesmente nunca entra no processamento, e os FUPs nunca são gerados. A consulta de `eventos` via `.in("id_lead", leadIds)` tem o mesmo problema (1000 linhas + URL longa).

---

## Correções

### A. AgentDashboard — incluir leads das unidades do agente
Em `src/pages/AgentDashboard.tsx`, trocar `allMyLeads` por:
```ts
const myUnitIds = new Set(agentUnidades.filter(au => au.id_agente === currentUser.id).map(au => au.id_unidade));
if (currentUser.unidade_padrao) myUnitIds.add(currentUser.unidade_padrao);
const allMyLeads = leads.filter(l =>
  l.id_agente === currentUser.id || (l.id_unidade && myUnitIds.has(l.id_unidade))
);
```
Isso alinha a aba "Leads" com a regra já usada em `EventoPanel`/`LeadContext`. Métricas pessoais (registrosFeitos, agendamentosFeitos, meta) continuam filtrando por `id_agente === currentUser.id` explicitamente onde aplicável (já fazem isso nas linhas 200‑204).

### B. Dispensado → Análise do Supervisor (não direto pra Perdido)
Em `supabase/functions/generate-followups/index.ts`:
```ts
const FINAL = {
  novo: "trabalhado",
  agendado: "desqualificado_agendado",
  dispensado: "analise_supervisor",  // antes: "perdido"
};
```
O supervisor então decide manualmente se vira `perdido` ou `concluido`.

### C. Reset de FUPs quando o agendamento é remarcado
Criar uma migration com trigger em `leads`:
- Quando `data_agendamento` for alterada (NEW ≠ OLD) **e** a nova data for futura (>= CURRENT_DATE), **e** a etapa estiver em `agendado`/`reagendado`:
  - Apagar `eventos` pendentes do tipo `followup` deste lead.
  - Resetar `fup_concluido = false`, `fup_concluido_em = NULL`, `fup_concluido_numero = NULL`, `fup_motivo_conclusao = NULL`.
  - Os FUPs concluídos antigos ficam preservados como histórico (não são deletados), mas a edge function passa a contar do zero pelo `MAX(numero)` apenas dos não-concluídos? Não — vamos deletar **apenas** os pendentes futuros e renumerar. Mais simples: deletar **todos** os FUPs do lead (concluídos e pendentes) na hora do reagendamento, deixando uma nota em `notas` ("Ciclo de FUPs reiniciado após novo agendamento"). Assim o próximo ciclo arranca do FUP 1 baseado no novo `data_agendamento`.

Além disso, na edge function, ajustar a categoria `agendado` para usar como âncora **sempre** a `data_agendamento` atual do lead (não a `data_conclusao` do último FUP), garantindo que se um reset ocorrer entre execuções, o FUP1 saia no dia certo.

### D. Remover limites de 1000 linhas
Em `supabase/functions/generate-followups/index.ts`:
- Implementar `fetchAllRows` (mesmo padrão do `LeadContext`) com `.range(from, from+999)` em loop até a página vir vazia, para a query de `leads`.
- Para a query de `eventos`, paginar **e** quebrar `leadIds` em chunks de 200 ids por requisição (evita URL longa) — depois unir os resultados.

---

## Arquivos alterados

- `src/pages/AgentDashboard.tsx` — ajuste de `allMyLeads`.
- `supabase/functions/generate-followups/index.ts` — `FINAL.dispensado`, paginação, âncora do agendado.
- **Nova migration** — trigger `leads_reset_fup_on_reagendamento` em `public.leads`.

## Simulação de impacto

- Visibilidade: a agente passa a ver todos os leads (incluindo Dispensados e Reagendados) das unidades Laranjeiras e Grandville, sem precisar estar como `id_agente`.
- Dispensados concluídos agora caem em "Análise do Supervisor" — coerente com a regra já aplicada manualmente, evitando perda silenciosa.
- Leads reagendados com nova data futura **não** serão mais auto-desqualificados; o ciclo recomeça do FUP1 a partir da nova data.
- A geração de FUPs deixa de ter teto invisível de 1000 leads — todos os elegíveis serão processados em cada execução.
