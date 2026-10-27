# Decisões de implementação

Este arquivo registra escolhas de implementação que complementam a especificação ResenhaMarket MVP.

| Decisão | Motivo |
|---|---|
| Login foi implementado antes dos módulos de catálogo e movimentação. | Segue a seção 12 da especificação: todas as rotas de negócio já nascem protegidas. |
| `GET /api/v1/produtos` e `GET /api/v1/movimentacoes` começam com listas simples; movimentações limitam tamanho a 100. | O contrato completo com metadados de paginação pode entrar numa próxima etapa sem complicar a primeira tela. |
| O filtro de mínimo inclui saldo igual ao mínimo. | Mantém a regra RN09 exatamente: `saldoAtual <= estoqueMinimo`, com mínimo maior que zero. |
| O seed de demonstração carrega os nove exemplos numa única inicialização, sem coluna ou regra por setor. | Permite validar unidade UN, CX, KG, L e PCT enquanto preserva a neutralidade do modelo. |
| O perfil de seed é controlado por `APP_SEED_ENABLED`; em Compose local o valor padrão é ligado. | Facilita a primeira experiência sem treinamento; o valor em implantação deve ser desligado após o setup. |
| Códigos de produto são comparados em minúsculas e sem espaços externos por índice único funcional do PostgreSQL. | Evita duplicidade por diferenças triviais de capitalização/trim. |
| Migrations Flyway são a fonte de schema; Hibernate roda com `ddl-auto=validate`. | Evita mudanças implícitas no schema durante a inicialização. |
