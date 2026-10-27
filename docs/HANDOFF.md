# Handoff — estado do MVP

## Implementado neste incremento

- Monorepo com API Spring Boot/Java 21, React/TypeScript e PostgreSQL/Flyway.
- Login JWT stateless, BCrypt e perfis ADMINISTRADOR/OPERADOR; catálogo com busca, cadastro/edição e alerta de estoque mínimo.
- Entradas e saídas transacionais com bloqueio pessimista por produto, validação de unidade/motivo/quantidade e rejeição de saldo negativo.
- Livro de movimentações imutável, histórico filtrado por tipo e endpoint de conciliação entre saldo armazenado e ledger.
- Interface responsiva em português com login, catálogo, modais de produto e movimentação, prévia de saldo e feedback.
- Compose para API, frontend e PostgreSQL; migrations Flyway, CI e seeds de demonstração ativados por flag.

## Verificação feita em 27/10/2026

- `npm run lint`, `npm run test` (4 testes) e `npm run build`: aprovados.
- `npm audit --omit=dev`: 0 vulnerabilidades.
- Docker Compose: API e PostgreSQL saudáveis; migração inicial aplicada; frontend servido em `http://localhost:3120`.
- Smoke test da API: login administrador, consulta de 9 produtos, gravação de movimentação e conciliação com saldos iguais.
- Build da API Java 21 concluído pela imagem Docker.
- Teste Spring/Testcontainers compilado. Execução do teste Testcontainers ainda precisa ser observada em um runner com acesso ao Docker socket (CI GitHub Actions).

## Próximos incrementos

- Gestão de usuários ADMIN (listar/criar/editar/inativar, regra de último administrador) na API e interface.
- Interface para inativar/reativar produtos e detalhe/aba de histórico por produto.
- Paginação completa e filtros de período/produto no histórico.
- Teste concorrente com 20 saídas simultâneas e cobertura da matriz de autorização.
- Seleção/reset explícito dos seeds, refinamento de Docker health/recovery e tratamento de erros de banco.
- JaCoCo, métricas de cobertura, validação OS1 com roteiro observado e correção dos achados.
- Acessibilidade do modal (foco inicial/retorno, fechar com Escape) e testes de interação com Testing Library.

## Limites e segurança

- `GET /api/v1/produtos` e `GET /api/v1/movimentacoes` ainda usam listas limitadas; evoluir contrato para `{content,page,size,totalElements,totalPages}`.
- Adicionar rate limiting de login antes de qualquer ambiente acessível publicamente.
- Segredo JWT e credenciais Compose são defaults de desenvolvimento. Para implantação, fornecer valores fortes por segredo de ambiente e desligar seeds.
- Gestão visual de usuários e reativação/inativação no frontend ainda não estão implementadas.
