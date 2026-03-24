UPDATE leads SET etapa = 'desqualificado_novo' WHERE fup_concluido = true AND etapa = 'novo';
UPDATE leads SET etapa = 'desqualificado_agendado' WHERE fup_concluido = true AND etapa IN ('agendado', 'reagendado');
UPDATE leads SET etapa = 'perdido' WHERE fup_concluido = true AND etapa = 'dispensado';