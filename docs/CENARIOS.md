# Cenários de demonstração

Dados de exemplo para as sessões de validação simulada (OS4 do TAP), um por ramo. O sistema e o modelo de dados são os mesmos nos três: só mudam os produtos carregados.

## Como escolher

No `.env` (ou nas variáveis do ambiente da API):

| Variável | Valores | Efeito |
|---|---|---|
| `APP_SEED_ENABLED` | `true` / `false` | Liga a carga de demonstração. Desligue em produção. |
| `APP_SEED_CENARIO` | `varejo`, `farmacia`, `alimenticio`, `todos` (padrão) | Quais produtos carregar. |
| `APP_SEED_RESET` | `false` (padrão) / `true` | `true` **apaga todos os produtos e movimentações** e carrega o cenário de novo. Os usuários são mantidos. |

A carga só acontece quando não há produtos. Para trocar de cenário entre uma sessão e outra:

```bash
APP_SEED_CENARIO=farmacia APP_SEED_RESET=true docker compose up -d --force-recreate api
# depois da subida, volte o reset para false (no .env) para não apagar os dados a cada reinício
```

Um valor inválido em `APP_SEED_CENARIO` impede a API de subir, com a mensagem dos valores aceitos.

Contas criadas em qualquer cenário: `admin@resenha.dev` / `admin123` (Administrador) e `operador@resenha.dev` / `operador123` (Operador). As entradas da carga aparecem no histórico como registradas pela administradora; as saídas, pelo operador.

## Situação de cada cenário após a carga

Cada cenário tem 8 produtos, com ao menos um **abaixo do mínimo** e um **sem estoque**, e usa unidades inteiras e fracionadas.

### Varejo

| Código | Produto | Unidade | Mínimo | Saldo | Situação |
|---|---|---|---|---|---|
| V-001 | Camiseta básica | UN | 6 | 10 | Disponível |
| V-002 | Caderno 10 matérias | UN | 8 | 26 | Disponível |
| V-003 | Pilha AA cartela | CX | 5 | 4 | Abaixo do mínimo |
| V-004 | Caneta esferográfica azul | CX | 4 | 15 | Disponível |
| V-005 | Fita adesiva transparente | UN | 10 | 0 | Sem estoque |
| V-006 | Mochila escolar | UN | 3 | 7 | Disponível (inclui devolução de cliente) |
| V-007 | Garrafa térmica 500 ml | UN | 4 | 8 | Disponível (inclui perda) |
| V-008 | Papel A4 resma | PCT | 6 | 14 | Disponível (inclui consumo interno) |

### Farmácia

| Código | Produto | Unidade | Mínimo | Saldo | Situação |
|---|---|---|---|---|---|
| F-001 | Dipirona 500 mg caixa com 10 | CX | 8 | 15 | Disponível |
| F-002 | Álcool 70% 1 litro | UN | 5 | 4 | Abaixo do mínimo |
| F-003 | Soro fisiológico 500 ml | UN | 10 | 24 | Disponível |
| F-004 | Paracetamol 750 mg caixa com 20 | CX | 6 | 11 | Disponível |
| F-005 | Protetor solar FPS 50 | UN | 4 | 0 | Sem estoque |
| F-006 | Fralda infantil M | PCT | 5 | 8 | Disponível |
| F-007 | Termômetro digital | UN | 2 | 5 | Disponível (inclui devolução a fornecedor) |
| F-008 | Gaze estéril | PCT | 10 | 38 | Disponível (inclui consumo interno) |

### Alimentício

| Código | Produto | Unidade | Mínimo | Saldo | Situação |
|---|---|---|---|---|---|
| A-001 | Farinha de trigo | KG | 4 | 8,75 | Disponível |
| A-002 | Leite integral | L | 8 | 6 | Abaixo do mínimo |
| A-003 | Ovos bandeja 30 | PCT | 3 | 0 | Sem estoque |
| A-004 | Queijo muçarela | KG | 2 | 3,85 | Disponível |
| A-005 | Café torrado 500 g | PCT | 6 | 16 | Disponível |
| A-006 | Açúcar cristal | KG | 10 | 27,5 | Disponível (inclui consumo interno) |
| A-007 | Óleo de soja 900 ml | UN | 6 | 12 | Disponível (inclui perda) |
| A-008 | Banana prata | KG | 3 | 3,2 | Disponível, perto do mínimo (inclui perda) |

Os roteiros de tarefas das sessões são escritos pela equipe antes de cada incremento (premissa P07 do TAP) e não ficam neste arquivo.
