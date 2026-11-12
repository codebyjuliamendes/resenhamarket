# Preparação da apresentação do MVP

Roteiro de apoio para a apresentação na disciplina de gerência de projetos. Os campos em branco (`____`) devem ser preenchidos pela equipe depois de executar cada passo. Não registre resultado que não foi observado.

## 1. Qual ambiente mostrar

| Ambiente | O que é | Quando usar |
|---|---|---|
| Local, `docker compose up` | Sistema real: Spring Boot, PostgreSQL, Flyway e frontend. | Demonstração principal. |
| Vercel | Interface real com API **simulada em memória** (`api/server.ts`). Sem banco; os dados voltam ao inicial quando a função reinicia. | Só como apoio, apresentada como "demonstração da interface". A implantação em nuvem do sistema completo é o próximo passo. |

## 2. Checklist do dia anterior

- [ ] `docker compose down -v && docker compose up --build` do zero; API e banco saudáveis (`http://localhost:8080/actuator/health`).
- [ ] Frontend abre em `http://localhost:5173` (não 3120).
- [ ] Cenário `todos` carregado (padrão de `APP_SEED_CENARIO`); `APP_SEED_RESET=false` no `.env`.
- [ ] Contas testadas: `admin@resenha.dev` / `admin123` e `operador@resenha.dev` / `operador123`.
- [ ] Plano B gravado: vídeo curto ou prints do roteiro abaixo, salvos fora do computador da apresentação.
- [ ] Repositório aberto em `docs/RNM_TRACEABILITY.md` e `docs/DECISOES.md`.

## 3. Roteiro da demonstração (cerca de 5 minutos)

1. Login como operador; mostrar que o operador não vê a área de usuários.
2. Estoque: abas Abaixo do mínimo e Sem estoque, busca com `/`.
3. Registrar uma saída válida; mostrar prévia de saldo e o histórico do produto.
4. Tentar uma saída acima do saldo; mostrar a recusa.
5. Login como administrador; cadastrar um produto e um usuário.
6. Histórico filtrado por período e tipo.

## 4. Evidências dos objetivos de sucesso do TAP

| Objetivo | Evidência existente | Pendente para fechar |
|---|---|---|
| OS1 — homologação pelo patrocinador | Verificação técnica e roteiro ponta a ponta (Playwright) em 27/10/2026. | Sessão observada com o patrocinador, com data, participantes, tarefas e aceite. Registrar na tabela 4.1. |
| OS2 — 30 movimentações de teste sem divergência | `SaldoConfiabilidadeTest`: 30 movimentações, saldo conferido a cada passo, conciliação final consistente (11,250) e saída acima do saldo recusada (422). Teste de concorrência com 20 saídas sobre saldo 10 em `RegrasDeAcessoEConcorrenciaTest`. | Anexar a saída do `mvn verify` mais recente (CI ou local). |
| OS3 | ____ | ____ |
| OS4 — três cenários sem alterar código | Seeds de varejo, farmácia e alimentício (`docs/CENARIOS.md`), escolhidos por variável de ambiente. | Registrar a execução de cada cenário na tabela 4.2. |

### 4.1 Homologação (OS1)

| Data | Participantes | Tarefas executadas | Resultado | Achados |
|---|---|---|---|---|
| ____ | ____ | ____ | ____ | ____ |

### 4.2 Execução dos cenários (OS4)

Para trocar de cenário: `APP_SEED_CENARIO=<cenário> APP_SEED_RESET=true docker compose up -d --force-recreate api`.

| Cenário | Data | Responsável | Tarefas do roteiro | Código alterado? | Resultado |
|---|---|---|---|---|---|
| Varejo | ____ | ____ | ____ | Não | ____ |
| Farmácia | ____ | ____ | ____ | Não | ____ |
| Alimentício | ____ | ____ | ____ | Não | ____ |

## 5. Pontos de gerência de projetos

- **Rastreabilidade:** `docs/RNM_TRACEABILITY.md` liga cada requisito à evidência.
- **Controle de escopo:** relatórios e dashboards ficaram fora porque o TAP (seção 4.3) os exclui e o RI01 congela o escopo; está registrado em `docs/DECISOES.md`.
- **Riscos materializados e tratamento:**
  - Implantação em nuvem do sistema completo não concluída. Mitigação: demonstração local com Compose e versão de interface na Vercel, declarada como simulada.
  - Limite de tentativas de login em memória, por instância. Aceito para o MVP de instância única; registrado em `docs/DECISOES.md`.
  - Cobertura de testes (JaCoCo) não medida. Planejada como próximo incremento.

## 6. Perguntas prováveis

| Pergunta | Resposta preparada |
|---|---|
| "Onde está o banco na versão da Vercel?" | Não há: é uma API simulada para mostrar a interface. O sistema real roda com PostgreSQL no Compose, e a nuvem completa é o próximo passo. |
| "Como o trabalho foi dividido no grupo?" | ____ (explicar a divisão de papéis e onde está o histórico de cada pessoa) |
| "Qual a cobertura de testes?" | Ainda não medida (JaCoCo pendente). Hoje há 13 testes no frontend e testes de integração no backend contra PostgreSQL real. |
| "O patrocinador aprovou?" | ____ (só responder "sim" se a sessão da tabela 4.1 tiver acontecido) |
