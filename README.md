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

Não use essas credenciais em ambientes compartilhados ou de produção. Para esconder o atalho de demonstração da tela de login, gere o frontend com `VITE_SHOW_DEMO=false`. Para zerar os dados locais: `docker compose down -v` (isso apaga o volume local do banco).

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

- Login stateless com JWT, perfis ADMINISTRADOR/OPERADOR, logout automático quando a sessão expira, troca da própria senha e limite de tentativas de login.
- Catálogo com busca, filtro de estoque baixo, cadastro/edição administrativa, unidade genérica e inativação/reativação pela tela.
- Página de cada produto com saldo, mínimo e histórico próprio.
- Entradas/saídas com validação de unidade, motivo e saldo não negativo; bloqueio pessimista por produto; livro de movimentações imutável.
- Histórico paginado com filtros por tipo, produto e período; endpoint para conciliar saldo atual com o livro-razão.
- Gestão de usuários pelo administrador (criar, editar, inativar/reativar), sempre com pelo menos um administrador ativo.
- Interface responsiva em português (tabelas viram cartões no celular), modais acessíveis por teclado e feedback de sucesso/erro.

## Escopo e limites

Este MVP cobre os requisitos R01 a R07 do TAP. Cenários de seed selecionáveis e a implantação em nuvem ainda estão pendentes. Não implementa os itens explicitamente fora de escopo da especificação (fiscal, relatórios gerenciais/dashboards, financeiro, múltiplas filiais, fornecedores, validade/lotes ou integrações externas). Veja [`docs/HANDOFF.md`](docs/HANDOFF.md) e [`docs/DECISOES.md`](docs/DECISOES.md).
