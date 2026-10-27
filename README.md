# ResenhaMarket

Controle de estoque simples para pequenos e médios negócios. Consulte produtos, registre entradas e saídas, e confira o saldo sem planilhas difíceis.

## O problema

Em muitos comércios pequenos o estoque vive num caderno ou numa planilha: ninguém sabe ao certo quanto há de cada produto, quem registrou a última saída nem quando algo chegou ao mínimo. O ResenhaMarket registra cada entrada e saída num livro de movimentações que não se apaga, mantém o saldo sempre coerente com esse livro e avisa quando um produto precisa de reposição.

## O que já funciona

- Login stateless com JWT, perfis ADMINISTRADOR/OPERADOR, logout automático quando a sessão expira, troca da própria senha e limite de tentativas de login.
- Catálogo com busca, filtro de estoque baixo, cadastro/edição administrativa, unidade genérica e inativação/reativação pela tela.
- Página de cada produto com saldo, mínimo e histórico próprio.
- Entradas/saídas com validação de unidade, motivo e saldo não negativo; bloqueio pessimista por produto; livro de movimentações imutável.
- Histórico paginado com filtros por tipo, produto e período; endpoint para conciliar saldo atual com o livro-razão.
- Gestão de usuários pelo administrador (criar, editar, inativar/reativar), sempre com pelo menos um administrador ativo.
- Interface responsiva em português (tabelas viram cartões no celular), modo escuro automático (segue o sistema), modais acessíveis por teclado e feedback de sucesso/erro.

## Arquitetura

```
frontend/   React 18 + TypeScript + Vite, React Query, React Hook Form + Zod
backend/    API Spring Boot 3 (Java 21), Spring Security + JWT, JPA, Flyway, PostgreSQL 16
api/        Função serverless da Vercel: demonstração da mesma API, com dados em memória
```

Há dois modos de execução, com o **mesmo frontend** e o **mesmo contrato HTTP** (`/api/v1`, mesmos códigos de erro):

| Modo | Para quê | Dados |
|---|---|---|
| Docker Compose (`frontend` + `backend` + PostgreSQL) | Uso real e desenvolvimento | PostgreSQL, persistentes |
| Vercel (`frontend/dist` + `api/server.ts`) | Demonstração pública | Em memória, por instância da função |

Backend em camadas por módulo (`produto`, `movimentacao`, `usuario`, `auth`): controller → service (regras e transações) → repository. Erros de domínio saem sempre no formato `{status, codigo, mensagem, campos, timestamp}`. Decisões registradas em [`docs/DECISOES.md`](docs/DECISOES.md).

A função da Vercel segue a mesma separação em `api/_lib/` (arquivos com `_` não viram funções): `domain.ts` (regras puras: motivo × tipo, unidades inteiras, aritmética em milésimos), `service.ts` (operações e validações), `store.ts` (dados de demonstração), `auth.ts` (senhas com scrypt e tokens HS256), `router.ts` (rotas, autenticação e perfis).

## Rodar localmente (Docker Compose)

Requer Docker com Compose.

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

API REST: `http://localhost:8080/api/v1`; documentação OpenAPI: `http://localhost:8080/swagger-ui.html`; saúde: `http://localhost:8080/actuator/health`.

### Sem Docker

```bash
# API (precisa de um PostgreSQL acessível)
cd backend && SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/resenhamarket mvn spring-boot:run

# Web, apontando para a API Spring (padrão) ...
cd frontend && npm ci && npm run dev
# ... ou para a função de demonstração, sem banco nenhum
npm ci && PORT=3601 npm run dev:api          # na raiz
cd frontend && VITE_API_PROXY=http://localhost:3601 npm run dev
```

## Variáveis de ambiente

| Variável | Onde | Padrão | Descrição |
|---|---|---|---|
| `SPRING_DATASOURCE_URL`, `_USERNAME`, `_PASSWORD` | API | `localhost:5432/resenhamarket` | Conexão com o PostgreSQL. |
| `APP_JWT_SECRET` | API e função Vercel | valor de desenvolvimento | Segredo HMAC dos tokens, **mínimo 32 bytes** (a API não sobe com menos). Em produção, gere com `openssl rand -base64 48`. |
| `APP_CORS_ORIGINS` | API | `http://localhost:5173` | Origens permitidas, separadas por vírgula. |
| `APP_LOGIN_MAX_FALHAS`, `APP_LOGIN_JANELA_MINUTOS` | API | `5`, `15` | Limite de falhas de login por e-mail + IP. |
| `APP_SEED_ENABLED`, `APP_SEED_CENARIO`, `APP_SEED_RESET` | API | `false`, `todos`, `false` | Dados de demonstração (ver `docs/CENARIOS.md`). |
| `VITE_SHOW_DEMO` | build do web | `true` | `false` esconde o atalho de contas de demonstração. |
| `VITE_API_PROXY` | dev do web | `http://localhost:8080` | Para onde o `vite dev/preview` encaminha `/api`. |
| `WEB_PORT` | Compose | `5173` | Porta do frontend no host. |

## Scripts e testes

```bash
# Raiz: função serverless da demonstração
npm ci && npm run check          # typecheck + Vitest (regras, autenticação, rotas)

# Frontend
cd frontend && npm ci && npm run lint && npm run test && npm run build   # lint = ESLint + tsc

# Backend
cd backend && mvn verify
```

Os testes de integração do backend sobem a aplicação inteira contra um PostgreSQL 16 real (concorrência de 20 saídas simultâneas, matriz de autorização, regras de usuário, saldo × livro-razão). Com Docker disponível usam Testcontainers; sem Docker, aponte para um servidor existente:

```bash
TEST_DATABASE_URL=jdbc:postgresql://localhost:5432/postgres TEST_DATABASE_USER=postgres mvn verify
```

Cada classe de teste cria o próprio banco (`resenha_test_*`). Sem Docker e sem essa variável, os testes de integração são pulados.

A CI (GitHub Actions) roda backend, frontend, a função serverless e, por fim, sobe o Compose completo e faz um smoke test (login, listagem, headers de segurança).

## Segurança

- Senhas com BCrypt (API) ou scrypt (demo); tokens JWT HS256 com expiração; o perfil é lido do usuário armazenado a cada requisição, então inativar ou rebaixar alguém vale na hora.
- Rotas de negócio exigem token; cadastro de produtos e gestão de usuários exigem ADMINISTRADOR (no backend e na função de demonstração).
- Limite de tentativas de login; o login sempre compara um hash de senha, mesmo quando o e-mail não existe, para não revelar quais contas existem.
- CSP, `X-Content-Type-Options`, `X-Frame-Options` e `Referrer-Policy` no nginx, na Vercel (`vercel.json`) e no `vite preview`.
- Imagens Docker rodam como usuário não-root e têm `HEALTHCHECK`.

## Deploy

### Vercel (demonstração)

`vercel.json` gera o frontend (`frontend/dist`) e reescreve `/api/v1/*` para a função `api/server.ts`. Configure em *Project Settings → Environment Variables*:

- `APP_JWT_SECRET` (recomendado): sem ela a função usa uma chave pública fixa e registra um aviso no log; aceitável só para a demonstração aberta.

Limites da demonstração na Vercel: os dados ficam **em memória por instância** da função. Cada instância nova começa dos dados de exemplo, alterações se perdem quando a instância é reciclada e duas abas podem cair em instâncias diferentes (um usuário criado numa instância não existe na outra; nesse caso a sessão é encerrada e basta entrar de novo). Para dados persistentes, use a API Spring com PostgreSQL.

### API Spring + PostgreSQL

Qualquer plataforma que rode as imagens Docker de `backend/` e `frontend/` (ou o jar e os arquivos estáticos). Antes de publicar: `APP_JWT_SECRET` forte, credenciais do banco próprias, `APP_SEED_ENABLED=false` depois do setup e `VITE_SHOW_DEMO=false` no build do frontend. O nginx do frontend encaminha `/api/` para o serviço `api:8080`.

## Escopo e limites

Este MVP cobre os requisitos R01 a R07 do TAP. Não implementa os itens explicitamente fora de escopo da especificação (fiscal, relatórios gerenciais/dashboards, financeiro, múltiplas filiais, fornecedores, validade/lotes ou integrações externas).

Limites conhecidos:

- O limite de tentativas de login fica em memória: vale por instância e zera ao reiniciar.
- Tokens não são revogados ao trocar a senha; expiram no prazo configurado (8 h na API, 24 h na demo).
- `GET /api/v1/produtos` devolve lista simples, sem paginação (pensado para catálogos de algumas centenas de itens).
- A implantação da API Spring em nuvem ainda não está feita; a Vercel hospeda só a demonstração em memória.

Veja também [`docs/HANDOFF.md`](docs/HANDOFF.md) e [`docs/DECISOES.md`](docs/DECISOES.md).

## Licença

[MIT](LICENSE)
