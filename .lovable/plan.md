

## Plano: Tags de Motivo — com edição posterior

### Resumo

Implementar `tags_motivo` como campo estruturado na base, com seleção no momento da ação (dispensa/perda/desqualificação) **e** edição posterior na ficha do cliente.

### 1. Migration SQL

```sql
ALTER TABLE public.leads ADD COLUMN tags_motivo text[] DEFAULT NULL;
```

### 2. Constantes (`mockData.ts`)

- **`TAGS_MOTIVO_OS`**: "Loja Cheia", "Aguardando Orçamento", "Orçamento Alto", "Mal Atendimento", "Reagendado pelo Gerente", "Falta de Peça"
- **`TAGS_MOTIVO_NOVO`**: "Não Fazemos Serviço", "Retirada de Peças", "Delicado", "Outra Cidade", "Em Breve"

### 3. Interface Lead + mapLead

Adicionar `tags_motivo?: string[] | null` na interface e no mapeamento do `LeadContext.tsx`.

### 4. Componente reutilizável `MotivoTagSelector`

Badges clicáveis (igual tags de serviço) que recebe lista de opções e retorna selecionadas.

### 5. Integração nos modais de ação

| Modal | Arquivo | Tags |
|-------|---------|------|
| Desqualificar (novo) | `LeadDetailSheet.tsx` | `TAGS_MOTIVO_NOVO` |
| Desqualificar (agendado) | `LeadDetailSheet.tsx` | `TAGS_MOTIVO_OS` |
| Marcar como Perda | `LeadDetailSheet.tsx`, `EventoPanel.tsx` | `TAGS_MOTIVO_OS` |
| Dispensar | `AgentReceptionPanel.tsx`, `ReceptionistDashboard.tsx` | `TAGS_MOTIVO_OS` |

### 6. Edição posterior na ficha do cliente

No `LeadDetailSheet.tsx`, quando o lead estiver em status terminal (dispensado, perdido, desqualificado*), exibir as `tags_motivo` como badges com um botão "Editar" ao lado. Ao clicar, abre um mini-modal ou inline editor com o `MotivoTagSelector` pré-preenchido, permitindo adicionar/remover tags e salvar via `updateLead`.

### 7. Exibição visual

Tags de motivo aparecem na ficha com cor `destructive`/`outline` vermelho, visualmente distintas das tags de serviço.

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | `ADD COLUMN tags_motivo text[]` |
| `mockData.ts` | Interface Lead + constantes |
| `LeadContext.tsx` | mapLead + addLead/updateLead |
| Novo `MotivoTagSelector.tsx` | Componente reutilizável |
| `LeadDetailSheet.tsx` | Tags nos modais + exibição editável |
| `AgentReceptionPanel.tsx` | Tags no modal de dispensar |
| `ReceptionistDashboard.tsx` | Tags no modal de dispensar |
| `EventoPanel.tsx` | Tags no modal de perda |

