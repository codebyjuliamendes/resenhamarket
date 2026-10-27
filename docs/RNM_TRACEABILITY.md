# Requisitos e rastreabilidade (primeiro corte)

A especificação fornecida pelo usuário é tratada como requisito de produto. Este quadro registra o estado verificável da primeira fatia vertical.

| Requisito | Estado | Evidência |
|---|---|---|
| RN01 — autenticar com usuário ativo | Implementado | `POST /api/v1/auth/login`, BCrypt, JWT e `/auth/me` |
| RN02 — papéis e autorização | Parcial | ADMINISTRADOR protegido em operações de escrita de produto e usuários; matriz completa pendente |
| RN03 — cadastrar/editar produto genérico | Implementado na API e UI | Código, nome, descrição, unidade, mínimo e saldo inicial zero |
| RN04 — entrada/saída com motivo e usuário | Implementado | Transação do ledger vinculada a usuário autenticado |
| RN05 — impedir saída acima do saldo | Implementado | Bloqueio pessimista, validação transacional e retorno 422 |
| RN06 — saldo reproduzível por histórico | Implementado | Saldo materializado atualizado junto ao ledger; endpoint `/produtos/{id}/saldo` |
| RN07 — alerta de estoque mínimo | Implementado | Filtro `abaixoDoMinimo` e indicador na interface; mínimo zero não alerta |
| RN08 — consultas de histórico | Parcial | Lista e filtro por tipo; produto/período e paginação completa pendentes |
| RN09 — igualdade no limite mínimo | Implementado | `saldoAtual <= estoqueMinimo`, com mínimo maior que zero |
| RN10 — administração de usuários | Pendente | Manter como próximo incremento; não expor escrita a OPERADOR |
| RN11 — experiência responsiva e acessível | Parcial | Layout responsivo; revisão de foco/teclado e testes de interação pendentes |
| RN12 — segurança e qualidade | Parcial | JWT, BCrypt, validação, migrations e CI; rate limit e teste concorrente pendentes |

Integrações, múltiplas filiais, fiscal, financeiro, fornecedores e atributos específicos de setores permanecem fora do escopo conforme a especificação.
