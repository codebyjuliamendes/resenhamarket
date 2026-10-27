# ResenhaMarket

Controle de estoque simples para pequenos e médios negócios. Consulte produtos, registre entradas e saídas, e confira o saldo sem planilhas difíceis.

## Rodar localmente

Requer Docker Desktop com Compose.

```bash
cp .env.example .env
docker compose up --build
```

Abra [http://localhost:5173](http://localhost:5173). A primeira inicialização aplica as migrações do PostgreSQL e carrega dados de demonstração para três contextos de validação: varejo, farmácia e alimentício. O modelo e as regras continuam genéricos; não há campos de lote ou validade.

Contas da demonstração:

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | `admin@resenha.dev` | `admin123` |
| Operador | `operador@resenha.dev` | `operador123` |

Não use essas credenciais em ambientes compartilhados ou de produção. Para zerar os dados locais: `docker compose down -v` (isso apaga o volume local do banco).

## Testes e desenvolvimento

```bash
docker compose up --build
```

API REST: `http://localhost:8080/api/v1`; documentação OpenAPI: `http://localhost:8080/swagger-ui.html`; saúde: `http://localhost:8080/actuator/health`.

```bash
cd frontend && npm ci && npm run lint && npm run test && npm run build
cd backend && mvn verify
```

Os testes de integração do backend usam Testcontainers e PostgreSQL 16. Java 21 e Maven são necessários para rodá-los no host; o Docker Compose já compila a API em Java 21.

## O que já funciona

- Login stateless com JWT e perfis ADMINISTRADOR/OPERADOR.
- Catálogo com consulta/busca, cadastro e edição administrativa, unidade genérica e inativação por API.
- Entradas/saídas com validação de unidade, motivo e saldo não negativo; bloqueio pessimista por produto; livro de movimentações imutável.
- Histórico filtrado por tipo e endpoint para conciliar saldo atual com o livro-razão.
- Interface responsiva em português com busca, filtro de estoque baixo, prévia de saldo e feedback de sucesso/erro.

## Escopo e limites

Este MVP atende primeiro autenticação, catálogo e movimentações. A gestão visual de usuários, reativação/inativação no frontend, cenários de seed selecionáveis e a bateria concorrente completa ainda estão pendentes. Não implementa os itens explicitamente fora de escopo da especificação (fiscal, financeiro, múltiplas filiais, fornecedores, validade/lotes ou integrações externas). Veja [`docs/HANDOFF.md`](docs/HANDOFF.md) e [`docs/DECISOES.md`](docs/DECISOES.md).
