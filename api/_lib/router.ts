import type { ServerResponse } from 'node:http';
import { bearerToken, createToken, DUMMY_PASSWORD_HASH, verifyToken } from './auth';
import { isTipo, normalizarEmail, type Perfil } from './domain';
import { clientIp, errorBody, HttpError, log, readJson, sendJson, sendNoContent, type ServerlessRequest } from './http';
import { LoginAttemptLimiter } from './rateLimit';
import { DemoService } from './service';
import { createDemoStore, toUsuario, type Store, type UsuarioRegistro } from './store';
import { Validator } from './validation';

/** Fallback signing key for the public demo when APP_JWT_SECRET is not configured. Not a secret. */
const DEMO_FALLBACK_SECRET = 'resenhamarket-demo-only-signing-key-set-APP_JWT_SECRET';

export interface HandlerOptions {
  store?: Store;
  secret?: string;
  tokenTtlSeconds?: number;
  limiter?: LoginAttemptLimiter;
  clock?: () => Date;
}

export interface Context {
  req: ServerlessRequest;
  res: ServerResponse;
  url: URL;
  params: string[];
  user: UsuarioRegistro | null;
}

type Access = 'public' | 'auth' | 'admin';
type Route = { method: string; pattern: RegExp; access: Access; run: (ctx: Context) => Promise<void> | void };

/** Resolves the secret from the environment and validates it at startup. */
export function resolveSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.APP_JWT_SECRET?.trim();
  if (secret) {
    if (Buffer.byteLength(secret) < 32) throw new Error('APP_JWT_SECRET precisa ter pelo menos 32 bytes.');
    return secret;
  }
  log('warn', 'APP_JWT_SECRET ausente: usando a chave pública da demonstração. Defina a variável no projeto da Vercel.');
  return DEMO_FALLBACK_SECRET;
}

function apiPath(url: URL): string {
  // Vercel rewrites /api/v1/<rota> to /api/server?path=<rota>; locally the pathname arrives as is.
  let path = url.searchParams.get('path') ?? url.pathname;
  path = path.replace(/^\/?api\/v1\/?/, '').replace(/^\/?api\/?/, '');
  path = '/' + path.replace(/^\/+/, '').replace(/\/+$/, '');
  return path;
}

function intParam(url: URL, name: string): number | null {
  const raw = url.searchParams.get(name);
  if (raw === null || raw === '') return null;
  if (!/^\d+$/.test(raw)) throw new HttpError(400, 'REQUISICAO_INVALIDA', 'Os dados enviados não estão no formato esperado.');
  return Number(raw);
}

function boolParam(url: URL, name: string): boolean | null {
  const raw = url.searchParams.get(name);
  if (raw === null || raw === '') return null;
  if (raw !== 'true' && raw !== 'false') throw new HttpError(400, 'REQUISICAO_INVALIDA', 'Os dados enviados não estão no formato esperado.');
  return raw === 'true';
}

function dateParam(url: URL, name: string): Date | null {
  const raw = url.searchParams.get(name);
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, 'REQUISICAO_INVALIDA', 'Os dados enviados não estão no formato esperado.');
  return date;
}

export function createHandler(options: HandlerOptions = {}) {
  const store = options.store ?? createDemoStore();
  const secret = options.secret ?? resolveSecret();
  const ttl = options.tokenTtlSeconds ?? 86_400;
  const limiter = options.limiter ?? new LoginAttemptLimiter();
  const service = new DemoService(store, options.clock);

  const id = (ctx: Context, index = 0) => Number(ctx.params[index]);
  const requester = (ctx: Context) => ctx.user!.id;

  const routes: Route[] = [
    { method: 'GET', pattern: /^\/health$/, access: 'public', run: ({ res }) => sendJson(res, 200, { status: 'UP', modo: 'demonstracao' }) },

    {
      method: 'POST',
      pattern: /^\/auth\/login$/,
      access: 'public',
      run: async ({ req, res }) => {
        const v = new Validator(await readJson(req));
        const email = v.string('email', { max: 160 });
        const senha = v.string('senha', { max: 200, trim: false });
        v.done();
        const key = `${normalizarEmail(email!)}|${clientIp(req)}`;
        if (limiter.blocked(key)) {
          throw new HttpError(429, 'MUITAS_TENTATIVAS', `Muitas tentativas sem sucesso. Aguarde ${limiter.waitMinutes} minutos e tente de novo.`);
        }
        const user = service.authenticate(email!, senha!, DUMMY_PASSWORD_HASH);
        if (!user) {
          limiter.registerFailure(key);
          throw new HttpError(401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.');
        }
        limiter.clear(key);
        sendJson(res, 200, { token: createToken(user.id, user.perfil, secret, ttl), expiraEm: ttl, usuario: toUsuario(user) });
      },
    },
    { method: 'GET', pattern: /^\/auth\/me$/, access: 'auth', run: (ctx) => sendJson(ctx.res, 200, toUsuario(ctx.user!)) },
    {
      method: 'PUT',
      pattern: /^\/auth\/senha$/,
      access: 'auth',
      run: async (ctx) => {
        service.changeOwnPassword(requester(ctx), await readJson(ctx.req));
        sendNoContent(ctx.res);
      },
    },

    {
      method: 'GET',
      pattern: /^\/produtos$/,
      access: 'auth',
      run: ({ res, url }) =>
        sendJson(
          res,
          200,
          service.listProducts({
            busca: url.searchParams.get('busca'),
            // Same default as the Spring controller: only active products unless asked otherwise.
            ativo: boolParam(url, 'ativo') ?? true,
            abaixoDoMinimo: boolParam(url, 'abaixoDoMinimo') === true,
          }),
        ),
    },
    { method: 'POST', pattern: /^\/produtos$/, access: 'admin', run: async ({ req, res }) => sendJson(res, 201, service.createProduct(await readJson(req))) },
    { method: 'GET', pattern: /^\/produtos\/(\d+)$/, access: 'auth', run: (ctx) => sendJson(ctx.res, 200, service.getProduct(id(ctx))) },
    { method: 'PUT', pattern: /^\/produtos\/(\d+)$/, access: 'admin', run: async (ctx) => sendJson(ctx.res, 200, service.updateProduct(id(ctx), await readJson(ctx.req))) },
    { method: 'PATCH', pattern: /^\/produtos\/(\d+)\/inativar$/, access: 'admin', run: (ctx) => sendJson(ctx.res, 200, service.setProductActive(id(ctx), false)) },
    { method: 'PATCH', pattern: /^\/produtos\/(\d+)\/reativar$/, access: 'admin', run: (ctx) => sendJson(ctx.res, 200, service.setProductActive(id(ctx), true)) },
    { method: 'GET', pattern: /^\/produtos\/(\d+)\/saldo$/, access: 'auth', run: (ctx) => sendJson(ctx.res, 200, service.reconcile(id(ctx))) },
    {
      // Kept for compatibility with the first version of this function; same data as /produtos/{id}/saldo.
      method: 'GET',
      pattern: /^\/movimentacoes\/conciliar\/(\d+)$/,
      access: 'auth',
      run: (ctx) => {
        const r = service.reconcile(id(ctx));
        sendJson(ctx.res, 200, { produtoId: r.produtoId, saldoArmazenado: r.saldoAtual, saldoLedger: r.saldoCalculado, consistente: r.consistente });
      },
    },

    {
      method: 'GET',
      pattern: /^\/movimentacoes$/,
      access: 'auth',
      run: ({ res, url }) => {
        const tipo = url.searchParams.get('tipo') || null;
        if (tipo !== null && !isTipo(tipo)) throw new HttpError(400, 'REQUISICAO_INVALIDA', 'Os dados enviados não estão no formato esperado.');
        sendJson(
          res,
          200,
          service.listMovements({
            produtoId: intParam(url, 'produtoId'),
            tipo,
            de: dateParam(url, 'de'),
            ate: dateParam(url, 'ate'),
            page: Math.max(0, intParam(url, 'page') ?? 0),
            size: Math.min(100, Math.max(1, intParam(url, 'size') ?? 30)),
          }),
        );
      },
    },
    { method: 'POST', pattern: /^\/movimentacoes$/, access: 'auth', run: async (ctx) => sendJson(ctx.res, 201, service.registerMovement(await readJson(ctx.req), requester(ctx))) },

    { method: 'GET', pattern: /^\/usuarios$/, access: 'admin', run: ({ res }) => sendJson(res, 200, service.listUsers()) },
    { method: 'POST', pattern: /^\/usuarios$/, access: 'admin', run: async ({ req, res }) => sendJson(res, 201, service.createUser(await readJson(req))) },
    { method: 'PUT', pattern: /^\/usuarios\/(\d+)$/, access: 'admin', run: async (ctx) => sendJson(ctx.res, 200, service.updateUser(id(ctx), await readJson(ctx.req), requester(ctx))) },
    { method: 'PATCH', pattern: /^\/usuarios\/(\d+)\/inativar$/, access: 'admin', run: (ctx) => sendJson(ctx.res, 200, service.deactivateUser(id(ctx), requester(ctx))) },
    { method: 'PATCH', pattern: /^\/usuarios\/(\d+)\/reativar$/, access: 'admin', run: (ctx) => sendJson(ctx.res, 200, service.reactivateUser(id(ctx))) },
  ];

  function authenticate(req: ServerlessRequest): UsuarioRegistro | null {
    const token = bearerToken(req.headers.authorization);
    if (!token) return null;
    const claims = verifyToken(token, secret);
    if (!claims) return null;
    const user = service.findUser(Number(claims.sub));
    // The profile is read from the stored user, so a demoted or deactivated account loses access at once.
    return user && user.ativo ? user : null;
  }

  function authorize(access: Access, user: UsuarioRegistro | null): void {
    if (access === 'public') return;
    if (!user) throw new HttpError(401, 'NAO_AUTENTICADO', 'Sua sessão expirou. Entre novamente.');
    const perfil: Perfil = user.perfil;
    if (access === 'admin' && perfil !== 'ADMINISTRADOR') throw new HttpError(403, 'ACESSO_NEGADO', 'Seu perfil não permite esta ação.');
  }

  return async function handler(req: ServerlessRequest, res: ServerResponse): Promise<void> {
    const started = Date.now();
    const method = (req.method ?? 'GET').toUpperCase();
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = apiPath(url);
    try {
      if (method === 'OPTIONS') {
        // Same-origin API: no CORS headers are granted, preflights just get an empty answer.
        sendNoContent(res);
        return;
      }
      const candidates = routes.filter((r) => r.pattern.test(path));
      const route = candidates.find((r) => r.method === method);
      if (!route) {
        if (candidates.length) throw new HttpError(405, 'METODO_NAO_SUPORTADO', 'Operação não suportada neste endereço.');
        throw new HttpError(404, 'NAO_ENCONTRADO', 'Endereço não encontrado.');
      }
      const user = authenticate(req);
      authorize(route.access, user);
      const params = route.pattern.exec(path)!.slice(1);
      await route.run({ req, res, url, params, user });
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(res, error.status, errorBody(error));
      } else {
        log('error', 'Erro inesperado', { method, path, error: error instanceof Error ? error.stack : String(error) });
        sendJson(res, 500, errorBody(new HttpError(500, 'ERRO_INTERNO', 'Algo deu errado do nosso lado. Tente novamente em instantes.')));
      }
    } finally {
      log('info', 'request', { method, path, status: res.statusCode, ms: Date.now() - started });
    }
  };
}
