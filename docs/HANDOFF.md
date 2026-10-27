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

## Incremento de 27/10/2026 (S3/S4 — usuários, perfis e usabilidade)

- API: `GET/POST/PUT /api/v1/usuarios`, `PATCH /usuarios/{id}/inativar|reativar` (regra de último administrador, sem autoinativação nem autorrebaixamento) e `PUT /auth/senha`.
- API: `GET /movimentacoes` agora devolve `{content,page,size,totalElements,totalPages}` e aceita `produtoId`, `tipo`, `de`, `ate`.
- API: 401/403 em JSON pelo Spring Security (antes, token expirado devolvia 403 e o cliente não encerrava a sessão); limite de 5 falhas de login por e-mail+IP em 15 minutos (429); erros de corpo/parâmetro inválido viram 400 em vez de 500.
- Web: rotas reais com React Router (sem recarregar a página), página do produto com histórico e inativar/reativar, histórico com filtros de produto/período e paginação, tela de usuários, troca de senha, modal com Esc/foco preso/retorno de foco, busca com debounce e atalho `/`, fontes maiores e tabelas em cartões no celular.
- Testes: 20 saídas simultâneas sobre saldo 10 (exatamente 10 aceitas), matriz de autorização, gestão de usuários, inativação de produto, limitador de login; no web, testes de interação do modal de movimentação, do login e do modal genérico.
- Verificado localmente com PostgreSQL 16: `mvn verify` (testes de integração executados contra banco real), `npm run lint`, `npm run test` (10 testes), `npm run build` e roteiro ponta a ponta no navegador (Playwright) em desktop e 390 px.

## Redesign visual (27/10/2026)

- Barra lateral escura com seções Operação/Administração no desktop; cabeçalho e navegação inferior no celular.
- Estoque com abas Todos / Abaixo do mínimo / Sem estoque / Inativos (com contadores), barra de nível em relação ao mínimo e selo de situação.
- Página do produto com cartões de saldo (âmbar abaixo do mínimo, mostrando quanto falta) e histórico em linha do tempo.
- Modal de movimentação com atalhos +1/+5/+10 e botão que mostra a quantidade; login em duas colunas.
- Proposta de referência no canvas de design publicado nesta sessão.

## Cenários de demonstração (27/10/2026)

- `APP_SEED_CENARIO` escolhe varejo, farmacia, alimenticio ou todos; `APP_SEED_RESET=true` apaga produtos e movimentações e recarrega. Ver `docs/CENARIOS.md`.

## Implantação em nuvem (27/10/2026)

- Frontend na Vercel; `/api/*` repassado para a API Spring Boot no Render (Docker), com PostgreSQL no Neon. Passo a passo em `docs/DEPLOY.md`.
- A API simulada em TypeScript (`api/server.ts`) foi removida: guardava dados em memória por instância, aceitava qualquer token e não aplicava as regras do backend.
- `server.port` aceita `PORT` (Render); CORS aceita padrões de origem para as prévias da Vercel.

## Qualidade e segurança (27/10/2026)

- CI com três camadas: backend (unitários + integração + JaCoCo ≥ 90% linhas / 75% ramos), frontend (tipos, Vitest com cobertura ≥ 85% linhas, `npm audit`) e ponta a ponta (Playwright contra API e PostgreSQL reais, desktop e celular, axe WCAG 2.1 AA, CSP).
- `RegrasDeNegocioTest`: 12 regras e respostas de erro da API. Cobertura medida: 94,9% das linhas e 82,1% dos ramos no backend; 91% das linhas no frontend.
- Cabeçalhos de segurança (CSP restrita a `'self'`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`) na Vercel, no nginx e no preview; fontes hospedadas no próprio app (sem Google Fonts).
- A API não sobe com o segredo JWT de exemplo quando a demonstração está desligada.
- Campos de formulário ligam erro e dica por `aria-describedby`; avatar e botão de senha corrigidos após auditoria do axe.
- `docs/RASTREABILIDADE.md` (matriz do TAP) e `docs/validacao/MODELO_ATA.md` (ata das sessões).

## Próximos incrementos

- Refinamento de Docker health/recovery e tratamento de erros de banco.
- Validação OS1 com roteiro observado e correção dos achados.
- Paginação também na listagem de produtos, se o catálogo crescer além de algumas centenas de itens.

## Limites e segurança

- `GET /api/v1/produtos` ainda devolve lista simples.
- O limite de tentativas de login fica em memória: vale por instância e zera ao reiniciar a API.
- Segredo JWT e credenciais Compose são defaults de desenvolvimento. Para implantação, fornecer valores fortes por segredo de ambiente e desligar seeds.
