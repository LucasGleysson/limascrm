

Vou auditar TODOS os painéis em todos os perfis (Agente, Recepcionista, Supervisor, Gestor) procurando contagens de "Na Loja" que ainda usem a lógica antiga (`foiNaLoja(etapa)` por string ou status hardcoded como `["confirmado","na_loja","concluido","dispensado","perdido","reagendado","analise_supervisor"].includes(...)`) em vez do contador `visitas_loja > 0`.

Vou usar `code--search_files` para mapear todos os usos.

