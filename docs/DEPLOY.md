# Implantação em nuvem (homologação)

Arquitetura (RE04 do TAP: Java/Spring Boot + PostgreSQL):

```
navegador ──> Vercel (frontend React) ──/api/*──> Render (API Spring Boot, Docker) ──> Neon (PostgreSQL)
```

A Vercel serve só o frontend e repassa `/api/*` para a API no Render (`vercel.json`). Para o navegador tudo vem do mesmo domínio, então o frontend não muda. A Vercel não roda Spring Boot, por isso a API fica no Render.

Todos os planos usados são gratuitos e não pedem cartão (premissa P05).

## 1. Banco no Neon

1. Crie uma conta em https://neon.tech e um projeto (região mais próxima: `AWS São Paulo` se houver, senão `US East`).
2. Em **Connection Details**, desligue **Connection pooling** (o Flyway precisa da conexão direta) e anote host, banco, usuário e senha.
3. Monte a URL JDBC (não use a `postgres://…` diretamente):
   ```
   jdbc:postgresql://<host>/<banco>?sslmode=require
   ```

## 2. API no Render

1. Crie uma conta em https://render.com entrando com o GitHub que tem acesso ao repositório.
2. **New › Blueprint**, escolha `codebyjuliamendes/resenhamarket`. O Render lê o `render.yaml` e cria o serviço `resenhamarket-api`.
3. Preencha as variáveis que ele pedir:
   | Variável | Valor |
   |---|---|
   | `SPRING_DATASOURCE_URL` | a URL JDBC do passo 1 |
   | `SPRING_DATASOURCE_USERNAME` | usuário do Neon |
   | `SPRING_DATASOURCE_PASSWORD` | senha do Neon |

   `APP_JWT_SECRET` é gerado automaticamente. `APP_CORS_ORIGINS` já aceita `https://resenhamarket.vercel.app` e as prévias `https://resenhamarket-*.vercel.app`; ajuste se o domínio da Vercel for outro.
4. Aguarde o primeiro deploy (alguns minutos: o Render compila com Maven) e abra `https://resenhamarket-api.onrender.com/actuator/health`. Deve responder `{"status":"UP",…}`. A primeira subida aplica as migrações no Neon e carrega a demonstração.
5. Se o Render der outro endereço ao serviço (nome já em uso), troque `resenhamarket-api.onrender.com` no `vercel.json` pelo endereço real e faça push.

## 3. Frontend na Vercel

O projeto da Vercel já ligado ao repositório usa o `vercel.json` da raiz: instala e compila `frontend/`, publica `frontend/dist` e repassa `/api/*` para o Render. Em **Settings › General**, deixe **Root Directory** vazio (raiz do repositório) e **Framework Preset** como `Other`. Cada push na `main` gera um novo deploy.

## 4. Conferir

1. Abra o endereço da Vercel e entre com `admin@resenha.dev` / `admin123`.
2. Registre uma saída, recarregue a página e confira o saldo: ele vem do PostgreSQL e não muda entre acessos.
3. Entre como `operador@resenha.dev` e confirme que não aparecem "Novo produto" nem "Usuários".

## Limites do plano gratuito

- **Hibernação:** a API dorme após 15 minutos sem uso; o primeiro acesso depois disso leva cerca de 1 minuto e pode mostrar "Não foi possível carregar" (tente de novo). O workflow `.github/workflows/keepalive.yml` faz um ping a cada 10 minutos em dias úteis, das 8h às 20h (Brasília). Para ligá-lo, crie a variável do repositório `API_HEALTH_URL` (Settings › Secrets and variables › Actions › Variables) com `https://resenhamarket-api.onrender.com/actuator/health`.
- **Memória:** 512 MB no Render. Suficiente para a demonstração; o pool de conexões fica em 5.
- **Limite de tentativas de login:** com a Vercel no meio, a API pode enxergar o IP da Vercel em vez do IP do usuário; o bloqueio continua valendo por e-mail.

## Demonstração e reset

O `render.yaml` liga a demonstração (`APP_SEED_ENABLED=true`, todos os cenários). Para uma sessão de um ramo só, mude no Render `APP_SEED_CENARIO` (`varejo`, `farmacia`, `alimenticio`) e `APP_SEED_RESET=true`, aguarde reiniciar e **volte `APP_SEED_RESET` para `false`**, senão os dados são apagados a cada reinício. Detalhes em [`CENARIOS.md`](CENARIOS.md).

Antes de qualquer uso real: desligue `APP_SEED_ENABLED`, troque as senhas das contas de demonstração e gere o frontend com `VITE_SHOW_DEMO=false` (variável de ambiente no projeto da Vercel).
