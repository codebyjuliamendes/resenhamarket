# Matriz de rastreabilidade — TAP Revisão 1.3

Liga cada requisito, objetivo, entrega e restrição do Termo de Abertura ao que está no repositório e ao teste que comprova. A matriz anterior (`RNM_TRACEABILITY.md`) segue a numeração RN da especificação técnica; esta segue a numeração do TAP.

Legenda de estado: **Atendido** (implementado e com teste automatizado), **Parcial** (implementado, falta evidência ou atividade da equipe), **Pendente**.

## Requisitos do produto (seção 3)

| Req. | Descrição no TAP | Estado | Onde está | Evidência automatizada |
|---|---|---|---|---|
| R01 | Cadastro, edição, consulta e inativação de produtos | Atendido | `produto/` (API), `pages/InventoryPage.tsx`, `pages/ProductPage.tsx`, `components/ProductModal.tsx` | `RegrasDeNegocioTest` (validação, código único, edição mantém saldo, 404); `RegrasDeAcessoEConcorrenciaTest.produtoInativoSaiDaListaENaoAceitaMovimentacao`; e2e "administrador cadastra, inativa e reativa um produto" |
| R02 | Registro de entradas | Atendido | `movimentacao/MovimentacaoService.registrar`, `components/MovementModal.tsx` | `SaldoConfiabilidadeTest`; `RegrasDeNegocioTest` (fração, casas decimais, motivo, quantidade ≤ 0); e2e "entrada e saída atualizam o saldo" |
| R03 | Registro de saídas | Atendido | idem R02; bloqueio pessimista em `ProdutoRepository.buscarParaMovimentacao` | `RegrasDeAcessoEConcorrenciaTest.vinteSaidasSimultaneasNuncaDeixamSaldoNegativo`; e2e "saída maior que o saldo é bloqueada na tela e recusada pela API" |
| R04 | Cálculo e exibição do saldo atual | Atendido | saldo materializado + livro de movimentações; `GET /produtos/{id}/saldo` concilia os dois | `SaldoConfiabilidadeTest` (30 movimentações, saldo conferido a cada passo e conciliado); unitário `movementRules.test.ts` (prévia em milésimos) |
| R05 | Listagem dos produtos com saldos | Atendido | `GET /produtos`, abas Todos / Abaixo do mínimo / Sem estoque / Inativos | `RegrasDeNegocioTest.filtroAbaixoDoMinimoIncluiOLimiteEIgnoraMinimoZero`; `pages.test.tsx` (contadores e filtros) |
| R06 | Autenticação com perfis Administrador e Operador | Atendido | `auth/AuthController`, `shared/security/*`, `usuario/*`, `auth/AuthContext.tsx` | `RegrasDeAcessoEConcorrenciaTest.matrizDeAutorizacaoEGestaoDeUsuarios`; `LoginAttemptLimiterTest`; `JwtServiceTest`; e2e "cria um usuário que consegue entrar", "sessão inválida volta para o login" |
| R07 | Operações sensíveis só para Administrador | Atendido | `SecurityConfig` (rotas) + `@PreAuthorize` (serviços); telas escondem ações | `RegrasDeAcessoEConcorrenciaTest` (403 para operador); e2e "operador não vê nem executa ações de administrador"; `pages.test.tsx` |

## Requisitos do projeto

| Req. | Descrição | Estado | Evidência |
|---|---|---|---|
| R08 | Artefatos conforme o Guia PMBOK | Parcial | TAP, ciclo de vida e registro de stakeholders existem fora do repositório; dicionário da EAP, cronograma e backlog MoSCoW são da equipe (OS3) |
| R09 | Código versionado em repositório remoto | Atendido | GitHub `codebyjuliamendes/resenhamarket`, com PRs e CI em cada push |

## Objetivos SMART (seção 2)

| Obj. | Meta | Estado | Evidência / o que falta |
|---|---|---|---|
| OS1 | 100% do escopo homologado; ≥ 80% das tarefas do roteiro sem consulta ao desenvolvedor | Parcial | Escopo R01–R07 atendido. Falta executar as sessões e registrar as atas (`validacao/MODELO_ATA.md`) e a homologação do patrocinador |
| OS2 | 100% das movimentações refletidas no saldo, em bateria ≥ 30 | Atendido | `SaldoConfiabilidadeTest` (30 movimentações) + 20 saídas concorrentes; rodam no CI a cada push |
| OS3 | Artefatos de gerenciamento entregues nas datas | Parcial | Responsabilidade da equipe (João Vitor) |
| OS4 | Validado em 3 ramos, sem alteração de código | Parcial | Cenários prontos (`CENARIOS.md`, `APP_SEED_CENARIO`); `CenarioDemoTest` garante estados de cada ramo. Faltam as sessões simuladas |

## Entregas (seção 4.2)

| Entrega | Estado | Onde |
|---|---|---|
| E1, E2 — Documentação de iniciação e planejamento | Parcial | Fora do repositório (equipe) |
| E3 — Autenticação e usuários | Atendido | R06, R07 |
| E4 — Produtos | Atendido | R01, R05 |
| E5 — Movimentação e saldo | Atendido | R02–R04 |
| E6 — Cliente web | Atendido | `frontend/`; acessibilidade verificada por axe (WCAG 2.1 AA) em 6 telas no e2e; layout de celular testado |
| E7 — MVP implantado | Pendente | Configuração pronta (`DEPLOY.md`, `vercel.json`, `render.yaml`); falta criar as contas no Render e no Neon |

## Restrições (seção 5.2)

| Restrição | Como é respeitada |
|---|---|
| RE04 — Java/Spring Boot e PostgreSQL | API em Spring Boot 3.3 / Java 21; PostgreSQL 16 com migrações Flyway; testes de integração contra PostgreSQL real |
| RE06 — produto genérico | Modelo sem atributos de setor; os três ramos usam o mesmo código e só mudam os dados (`CenarioDemo`) |
| Fora do escopo (4.3) | Sem fiscal, relatórios gerenciais/dashboards, lotes/validade, filiais, financeiro, fornecedores ou integrações |

## Qualidade verificada no CI (`.github/workflows/ci.yml`)

| Verificação | Critério que barra o merge |
|---|---|
| Testes do backend (unitários + integração com PostgreSQL 16) | qualquer falha |
| Cobertura do backend (JaCoCo) | < 90% das linhas ou < 75% dos ramos |
| Tipos e testes do frontend (Vitest) | qualquer erro ou falha |
| Cobertura do frontend | < 85% das linhas, < 65% dos ramos ou < 55% das funções |
| Dependências do frontend (`npm audit`) | vulnerabilidade alta ou crítica |
| Ponta a ponta (Playwright, API + PostgreSQL reais) | falha em fluxo, violação grave de acessibilidade ou bloqueio pela política de segurança (CSP) |
