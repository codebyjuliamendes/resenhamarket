# Decisões de implementação

Este arquivo registra escolhas de implementação que complementam a especificação ResenhaMarket MVP.

| Decisão | Motivo |
|---|---|
| Login foi implementado antes dos módulos de catálogo e movimentação. | Segue a seção 12 da especificação: todas as rotas de negócio já nascem protegidas. |
| `GET /api/v1/movimentacoes` devolve página com metadados (tamanho máximo 100); `GET /api/v1/produtos` segue como lista simples. | O histórico cresce sem limite; o catálogo de um pequeno negócio cabe numa lista. |
| O filtro de mínimo inclui saldo igual ao mínimo. | Mantém a regra RN09 exatamente: `saldoAtual <= estoqueMinimo`, com mínimo maior que zero. |
| O seed de demonstração carrega os nove exemplos numa única inicialização, sem coluna ou regra por setor. | Permite validar unidade UN, CX, KG, L e PCT enquanto preserva a neutralidade do modelo. |
| O perfil de seed é controlado por `APP_SEED_ENABLED`; em Compose local o valor padrão é ligado. | Facilita a primeira experiência sem treinamento; o valor em implantação deve ser desligado após o setup. |
| Códigos de produto são comparados em minúsculas e sem espaços externos por índice único funcional do PostgreSQL. | Evita duplicidade por diferenças triviais de capitalização/trim. |
| Migrations Flyway são a fonte de schema; Hibernate roda com `ddl-auto=validate`. | Evita mudanças implícitas no schema durante a inicialização. |
| Painel de indicadores e exportação de relatórios não foram implementados. | O TAP (seção 4.3) deixa relatórios gerenciais e dashboards fora do escopo; o RI01 manda congelar o escopo do MVP. |
| Um administrador não pode inativar a própria conta nem remover o próprio perfil, e sempre resta um administrador ativo. | Evita que o estabelecimento perca o acesso administrativo por engano. |
| Limite de 5 falhas de login por e-mail+IP em 15 minutos, em memória (`APP_LOGIN_MAX_FALHAS`, `APP_LOGIN_JANELA_MINUTOS`). | Proteção simples contra força bruta, sem infraestrutura extra para o MVP de instância única. |
| Filtros do estoque e do histórico ficam na URL. | O usuário pode voltar, recarregar ou compartilhar a mesma visão. |
