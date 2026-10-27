# Requisitos e rastreabilidade (primeiro corte)

> A matriz pela numeração do TAP (R01–R09, OS1–OS4, E1–E7) está em [`RASTREABILIDADE.md`](RASTREABILIDADE.md).

A especificação fornecida pelo usuário é tratada como requisito de produto. Este quadro registra o estado verificável da primeira fatia vertical.

| Requisito | Estado | Evidência |
|---|---|---|
| RN01 — autenticar com usuário ativo | Implementado | `POST /api/v1/auth/login`, BCrypt, JWT e `/auth/me` |
| RN02 — papéis e autorização | Implementado | Escrita de produto e usuários só para ADMINISTRADOR; matriz coberta em `RegrasDeAcessoEConcorrenciaTest` |
| RN03 — cadastrar/editar/inativar produto genérico | Implementado na API e UI | Código, nome, descrição, unidade, mínimo e saldo inicial zero; inativar/reativar na página do produto |
| RN04 — entrada/saída com motivo e usuário | Implementado | Transação do ledger vinculada a usuário autenticado |
| RN05 — impedir saída acima do saldo | Implementado | Bloqueio pessimista, validação transacional e retorno 422 |
| RN06 — saldo reproduzível por histórico | Implementado | Saldo materializado atualizado junto ao ledger; endpoint `/produtos/{id}/saldo` |
| RN07 — alerta de estoque mínimo | Implementado | Filtro `abaixoDoMinimo` e indicador na interface; mínimo zero não alerta |
| RN08 — consultas de histórico | Implementado | Filtros por tipo, produto e período; paginação com total |
| RN09 — igualdade no limite mínimo | Implementado | `saldoAtual <= estoqueMinimo`, com mínimo maior que zero |
| RN10 — administração de usuários | Implementado | Tela e API de usuários; regra de último administrador; troca da própria senha |
| RN11 — experiência responsiva e acessível | Implementado | Tabelas em cartões no celular, modal com Esc/foco preso, link de pular conteúdo, testes de interação |
| RN12 — segurança e qualidade | Implementado | JWT, BCrypt, 401/403 consistentes, limite de tentativas de login, teste com 20 saídas concorrentes |

Integrações, múltiplas filiais, fiscal, financeiro, fornecedores e atributos específicos de setores permanecem fora do escopo conforme a especificação.
