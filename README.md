# ResenhaMarket

Controle de estoque simples para pequenos e médios negócios. Consulte produtos, registre entradas e saídas, e confira o saldo sem planilhas difíceis.

## Rodar localmente

Requer Docker Desktop com Compose.

```bash
cp .env.example .env
docker compose up --build
```

Abra [http://localhost:5173](http://localhost:5173). A primeira inicialização aplica as migrações do PostgreSQL e carrega dados de demonstração. Por padrão entram os três cenários de validação juntos (varejo, farmácia e alimentício); para uma sessão de um ramo só, use `APP_SEED_CENARIO=varejo`, `farmacia` ou `alimenticio`. O modelo e as regras continuam genéricos; não há campos de lote ou validade. Detalhes em [`docs/CENARIOS.md`](docs/CENARIOS.md).

Contas da demonstração:

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | `admin@resenha.dev` | `admin123` |
| Operador | `operador@resenha.dev` | `operador123` |

Não use essas credenciais em ambientes compartilhados ou de produção. Para esconder o atalho de demonstração da tela de login, gere o frontend com `VITE_SHOW_DEMO=false`. Para zerar os dados locais: `docker compose down -v` (isso apaga o volume local do banco).

## Testes e desenvolvimento

```bash
docker compose up --build
```

API REST: `http://localhost:8080/api/v1`; documentação OpenAPI: `http://localhost:8080/swagger-ui.html`; saúde: `http://localhost:8080/actuator/health`.

| Camada | Comando | O que cobre |
|---|---|---|
| Backend | `cd backend && mvn verify` | Testes unitários e de integração contra PostgreSQL 16 (Testcontainers, precisa de Docker) e cobertura JaCoCo com mínimo de 90% das linhas e 75% dos ramos. Sem Docker, use `-Djacoco.skip.check=true`. |
| Frontend | `cd frontend && npm ci && npm run lint && npm run test:coverage && npm run build` | Tipos, testes de componentes e telas (Vitest + Testing Library) e cobertura mínima. |
| Ponta a ponta | API rodando na porta 8080 com `APP_SEED_ENABLED=true`, depois `cd frontend && npx playwright install chromium && npm run test:e2e` | Fluxos no navegador (desktop e celular) contra a API e o banco reais, acessibilidade WCAG 2.1 AA (axe) e política de segurança (CSP). |

O CI (`.github/workflows/ci.yml`) roda as três camadas a cada push; os relatórios de cobertura ficam como artefatos da execução. A ligação de cada requisito do TAP com o código e os testes está em [`docs/RASTREABILIDADE.md`](docs/RASTREABILIDADE.md).

## O que já funciona

- Login stateless com JWT, perfis ADMINISTRADOR/OPERADOR, logout automático quando a sessão expira, troca da própria senha e limite de tentativas de login.
- Catálogo com busca, filtro de estoque baixo, cadastro/edição administrativa, unidade genérica e inativação/reativação pela tela.
- Página de cada produto com saldo, mínimo e histórico próprio.
- Entradas/saídas com validação de unidade, motivo e saldo não negativo; bloqueio pessimista por produto; livro de movimentações imutável.
- Histórico paginado com filtros por tipo, produto e período; endpoint para conciliar saldo atual com o livro-razão.
- Gestão de usuários pelo administrador (criar, editar, inativar/reativar), sempre com pelo menos um administrador ativo.
- Interface responsiva em português (tabelas viram cartões no celular), modais acessíveis por teclado e feedback de sucesso/erro.

## Escopo e limites

Este MVP cobre os requisitos R01 a R07 do TAP. A implantação em nuvem (Vercel + Render + Neon) está descrita em [`docs/DEPLOY.md`](docs/DEPLOY.md). Não implementa os itens explicitamente fora de escopo da especificação (fiscal, relatórios gerenciais/dashboards, financeiro, múltiplas filiais, fornecedores, validade/lotes ou integrações externas). Veja [`docs/HANDOFF.md`](docs/HANDOFF.md) e [`docs/DECISOES.md`](docs/DECISOES.md).
