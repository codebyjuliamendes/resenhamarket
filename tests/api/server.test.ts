import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHandler } from '../../api/_lib/router';
import { createDemoStore } from '../../api/_lib/store';

const SECRET = 'test-secret-with-at-least-32-bytes-of-length';
let server: Server;
let base: string;

beforeEach(async () => {
  const handler = createHandler({ store: createDemoStore(), secret: SECRET });
  server = createServer((req, res) => void handler(req, res));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

type Json = Record<string, any>;

async function call(path: string, init: { method?: string; token?: string; body?: unknown; raw?: string } = {}) {
  const response = await fetch(base + path, {
    method: init.method ?? (init.body !== undefined || init.raw !== undefined ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}) },
    body: init.raw ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
  });
  const text = await response.text();
  return { status: response.status, body: (text ? JSON.parse(text) : null) as Json };
}

async function login(email: string, senha: string) {
  const r = await call('/auth/login', { body: { email, senha } });
  expect(r.status).toBe(200);
  return r.body.token as string;
}

const admin = () => login('admin@resenha.dev', 'admin123');
const operador = () => login('operador@resenha.dev', 'operador123');

describe('autenticação', () => {
  it('entra com as contas da demonstração e devolve o próprio usuário em /auth/me', async () => {
    const token = await operador();
    const me = await call('/auth/me', { token });
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ email: 'operador@resenha.dev', perfil: 'OPERADOR' });
    expect(me.body).not.toHaveProperty('senhaHash');
  });

  it('recusa senha errada com o mesmo formato de erro do backend', async () => {
    const r = await call('/auth/login', { body: { email: 'admin@resenha.dev', senha: 'errada' } });
    expect(r.status).toBe(401);
    expect(r.body).toMatchObject({ status: 401, codigo: 'CREDENCIAIS_INVALIDAS', campos: [] });
  });

  it('exige token em todas as rotas de negócio', async () => {
    for (const path of ['/produtos', '/produtos/1', '/movimentacoes', '/usuarios', '/auth/me']) {
      const r = await call(path);
      expect(r.status, path).toBe(401);
      expect(r.body.codigo).toBe('NAO_AUTENTICADO');
    }
  });

  it('recusa token forjado ou de outro segredo', async () => {
    const token = await operador();
    const [h, , s] = token.split('.');
    const payload = Buffer.from(JSON.stringify({ sub: '1', perfil: 'ADMINISTRADOR', iat: 0, exp: 9e9 })).toString('base64url');
    expect((await call('/auth/me', { token: `${h}.${payload}.${s}` })).status).toBe(401);
    expect((await call('/auth/me', { token: 'demo-jwt-token-1-123' })).status).toBe(401);
  });

  it('bloqueia depois de 5 falhas seguidas', async () => {
    for (let i = 0; i < 5; i++) await call('/auth/login', { body: { email: 'admin@resenha.dev', senha: 'x' } });
    const r = await call('/auth/login', { body: { email: 'admin@resenha.dev', senha: 'admin123' } });
    expect(r.status).toBe(429);
    expect(r.body.codigo).toBe('MUITAS_TENTATIVAS');
  });

  it('troca a própria senha conferindo a atual', async () => {
    const token = await operador();
    const wrong = await call('/auth/senha', { method: 'PUT', token, body: { senhaAtual: 'nao-e-essa', novaSenha: 'novasenha1' } });
    expect(wrong.status).toBe(422);
    const ok = await call('/auth/senha', { method: 'PUT', token, body: { senhaAtual: 'operador123', novaSenha: 'novasenha1' } });
    expect(ok.status).toBe(204);
    expect((await call('/auth/login', { body: { email: 'operador@resenha.dev', senha: 'novasenha1' } })).status).toBe(200);
  });

  it('responde 400 para JSON malformado', async () => {
    const r = await call('/auth/login', { raw: '{"email":' });
    expect(r.status).toBe(400);
    expect(r.body.codigo).toBe('REQUISICAO_INVALIDA');
  });
});

describe('autorização por perfil', () => {
  it('operador não cadastra produto nem vê usuários', async () => {
    const token = await operador();
    const created = await call('/produtos', { token, body: { codigo: 'X', nome: 'X', unidadeMedida: 'UN' } });
    expect(created.status).toBe(403);
    expect(created.body.codigo).toBe('ACESSO_NEGADO');
    expect((await call('/usuarios', { token })).status).toBe(403);
    expect((await call('/produtos/1/inativar', { method: 'PATCH', token })).status).toBe(403);
  });

  it('usuário inativado perde o acesso mesmo com token ainda válido', async () => {
    const adminToken = await admin();
    const opToken = await operador();
    expect((await call('/usuarios/2/inativar', { method: 'PATCH', token: adminToken })).status).toBe(200);
    expect((await call('/produtos', { token: opToken })).status).toBe(401);
  });
});

describe('produtos', () => {
  it('lista só ativos por padrão, em ordem alfabética, e filtra abaixo do mínimo', async () => {
    const token = await operador();
    const all = await call('/produtos', { token });
    expect(all.status).toBe(200);
    const names = (all.body as unknown as Json[]).map((p) => p.nome);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'pt-BR')));
    const low = await call('/produtos?abaixoDoMinimo=true', { token });
    expect((low.body as unknown as Json[]).every((p) => p.abaixoDoMinimo)).toBe(true);
    const search = await call('/produtos?busca=f-00', { token });
    expect((search.body as unknown as Json[]).length).toBe(8);
  });

  it('valida campos, recusa código duplicado e permite editar o código', async () => {
    const token = await admin();
    const invalid = await call('/produtos', { token, body: { codigo: '', nome: '', unidadeMedida: 'UN', estoqueMinimo: -1 } });
    expect(invalid.status).toBe(400);
    expect(invalid.body.codigo).toBe('VALIDACAO');
    expect(invalid.body.campos.map((c: Json) => c.campo)).toEqual(expect.arrayContaining(['codigo', 'nome', 'estoqueMinimo']));

    const dup = await call('/produtos', { token, body: { codigo: ' v-001 ', nome: 'Outro', unidadeMedida: 'UN' } });
    expect(dup.status).toBe(409);
    expect(dup.body.codigo).toBe('CODIGO_DUPLICADO');

    const created = await call('/produtos', { token, body: { codigo: 'N-1', nome: 'Novo', unidadeMedida: 'kg', estoqueMinimo: 2 } });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ saldoAtual: 0, unidadeMedida: 'KG', abaixoDoMinimo: true, ativo: true });

    const edited = await call(`/produtos/${created.body.id}`, { method: 'PUT', token, body: { codigo: 'N-2', nome: 'Novo nome', unidadeMedida: 'KG', estoqueMinimo: 0 } });
    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({ codigo: 'N-2', nome: 'Novo nome', abaixoDoMinimo: false });
  });

  it('inativa e reativa; produto inativo some da lista padrão', async () => {
    const token = await admin();
    expect((await call('/produtos/1/inativar', { method: 'PATCH', token })).body.ativo).toBe(false);
    const active = await call('/produtos', { token });
    expect((active.body as unknown as Json[]).some((p) => p.id === 1)).toBe(false);
    const inactive = await call('/produtos?ativo=false', { token });
    expect((inactive.body as unknown as Json[]).map((p) => p.id)).toEqual([1]);
    expect((await call('/produtos/1/reativar', { method: 'PATCH', token })).body.ativo).toBe(true);
  });

  it('responde 404 para produto inexistente', async () => {
    const token = await operador();
    const r = await call('/produtos/999', { token });
    expect(r.status).toBe(404);
    expect(r.body.codigo).toBe('PRODUTO_NAO_ENCONTRADO');
  });
});

describe('movimentações', () => {
  it('registra com o usuário autenticado e mantém o saldo conciliado', async () => {
    const token = await operador();
    const r = await call('/movimentacoes', { token, body: { produtoId: 17, tipo: 'SAIDA', quantidade: 0.125, motivo: 'VENDA' } });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ usuarioNome: 'Operador de Caixa', saldoApos: 8.625, quantidade: 0.125 });
    const saldo = await call('/produtos/17/saldo', { token });
    expect(saldo.body).toMatchObject({ saldoAtual: 8.625, saldoCalculado: 8.625, consistente: true });
    const legacy = await call('/movimentacoes/conciliar/17', { token });
    expect(legacy.body).toMatchObject({ saldoArmazenado: 8.625, saldoLedger: 8.625, consistente: true });
  });

  it('aplica as mesmas regras de negócio do backend', async () => {
    const token = await operador();
    const cases: [Json, number, string][] = [
      [{ produtoId: 1, tipo: 'SAIDA', quantidade: 1000, motivo: 'VENDA' }, 422, 'SALDO_INSUFICIENTE'],
      [{ produtoId: 1, tipo: 'ENTRADA', quantidade: 1.5, motivo: 'COMPRA' }, 422, 'QUANTIDADE_FRACIONARIA'],
      [{ produtoId: 17, tipo: 'ENTRADA', quantidade: 1.2345, motivo: 'COMPRA' }, 422, 'QUANTIDADE_INVALIDA'],
      [{ produtoId: 1, tipo: 'ENTRADA', quantidade: 1, motivo: 'VENDA' }, 422, 'MOTIVO_INCOMPATIVEL'],
      [{ produtoId: 1, tipo: 'ENTRADA', quantidade: 0, motivo: 'COMPRA' }, 400, 'VALIDACAO'],
      [{ produtoId: 1, tipo: 'TROCA', quantidade: 1, motivo: 'COMPRA' }, 400, 'VALIDACAO'],
      [{ produtoId: 1, tipo: 'ENTRADA', quantidade: 1, motivo: 'COMPRA', observacao: 'x'.repeat(256) }, 400, 'VALIDACAO'],
      [{ produtoId: 999, tipo: 'ENTRADA', quantidade: 1, motivo: 'COMPRA' }, 404, 'PRODUTO_NAO_ENCONTRADO'],
    ];
    for (const [body, status, codigo] of cases) {
      const r = await call('/movimentacoes', { token, body });
      expect([r.status, r.body.codigo], JSON.stringify(body)).toEqual([status, codigo]);
    }
    const before = await call('/produtos/1', { token });
    expect(before.body.saldoAtual).toBe(10);
  });

  it('não movimenta produto inativo', async () => {
    const adminToken = await admin();
    await call('/produtos/2/inativar', { method: 'PATCH', token: adminToken });
    const r = await call('/movimentacoes', { token: adminToken, body: { produtoId: 2, tipo: 'ENTRADA', quantidade: 1, motivo: 'COMPRA' } });
    expect(r.status).toBe(422);
    expect(r.body.codigo).toBe('PRODUTO_INATIVO');
  });

  it('pagina com metadados, filtra por produto e tipo e valida o período', async () => {
    const token = await operador();
    const page = await call('/movimentacoes?size=5&page=1', { token });
    expect(page.body).toMatchObject({ page: 1, size: 5, totalElements: 51, totalPages: 11 });
    expect(page.body.content).toHaveLength(5);
    const filtered = await call('/movimentacoes?produtoId=6&tipo=ENTRADA', { token });
    expect(filtered.body.totalElements).toBe(2);
    const bad = await call('/movimentacoes?de=2026-02-01T00:00:00Z&ate=2026-01-01T00:00:00Z', { token });
    expect(bad.status).toBe(400);
    expect(bad.body.codigo).toBe('PERIODO_INVALIDO');
    expect((await call('/movimentacoes?tipo=XPTO', { token })).status).toBe(400);
  });
});

describe('usuários', () => {
  it('cria usuário que consegue entrar, sem expor o hash da senha', async () => {
    const token = await admin();
    const created = await call('/usuarios', { token, body: { nome: 'Nova Pessoa', email: 'Nova@Loja.dev', perfil: 'OPERADOR', senha: 'senha-forte' } });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ email: 'nova@loja.dev', ativo: true });
    expect(created.body).not.toHaveProperty('senhaHash');
    expect((await call('/auth/login', { body: { email: 'nova@loja.dev', senha: 'senha-forte' } })).status).toBe(200);
    const list = await call('/usuarios', { token });
    expect((list.body as unknown as Json[]).every((u) => !('senhaHash' in u))).toBe(true);
  });

  it('exige senha inicial e recusa e-mail duplicado', async () => {
    const token = await admin();
    const noPassword = await call('/usuarios', { token, body: { nome: 'Sem Senha', email: 'a@b.dev', perfil: 'OPERADOR', senha: null } });
    expect(noPassword.body.codigo).toBe('SENHA_OBRIGATORIA');
    const dup = await call('/usuarios', { token, body: { nome: 'Dup', email: 'ADMIN@resenha.dev', perfil: 'OPERADOR', senha: '12345678' } });
    expect(dup.status).toBe(409);
    expect(dup.body.codigo).toBe('EMAIL_DUPLICADO');
  });

  it('protege o último administrador e impede autoinativação e autorrebaixamento', async () => {
    const token = await admin();
    expect((await call('/usuarios/1/inativar', { method: 'PATCH', token })).body.codigo).toBe('AUTO_INATIVACAO');
    const demote = await call('/usuarios/1', { method: 'PUT', token, body: { nome: 'Admin', email: 'admin@resenha.dev', perfil: 'OPERADOR' } });
    expect(demote.body.codigo).toBe('AUTO_REBAIXAMENTO');

    const second = await call('/usuarios', { token, body: { nome: 'Outra Admin', email: 'outra@resenha.dev', perfil: 'ADMINISTRADOR', senha: '12345678' } });
    const secondToken = await login('outra@resenha.dev', '12345678');
    expect((await call('/usuarios/1/inativar', { method: 'PATCH', token: secondToken })).status).toBe(200);
    const last = await call(`/usuarios/${second.body.id}`, { method: 'PUT', token, body: { nome: 'x', email: 'x@x.dev', perfil: 'OPERADOR' } });
    // The first admin is now inactive, so its token no longer works at all.
    expect(last.status).toBe(401);
  });
});

describe('infraestrutura', () => {
  it('expõe /health sem autenticação', async () => {
    const r = await call('/health');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('UP');
  });

  it('entende o formato de rewrite da Vercel (/api/server?path=...)', async () => {
    const root = base.replace('/api/v1', '');
    const r = await fetch(`${root}/api/server?path=health`);
    expect(r.status).toBe(200);
  });

  it('responde 404 e 405 no formato padrão', async () => {
    expect((await call('/nada')).body.codigo).toBe('NAO_ENCONTRADO');
    const r = await call('/produtos', { method: 'DELETE' });
    expect(r.status).toBe(405);
  });

  it('não libera CORS para outras origens', async () => {
    const r = await fetch(`${base}/health`, { headers: { Origin: 'https://evil.example' } });
    expect(r.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('recusa corpo grande demais', async () => {
    const r = await call('/auth/login', { raw: JSON.stringify({ email: 'a@b.c', senha: 'x'.repeat(70_000) }) });
    expect(r.status).toBe(413);
  });
});

describe('runtime da Vercel', () => {
  it('usa o req.body já interpretado pela plataforma', async () => {
    const { Readable } = await import('node:stream');
    const { ServerResponse, IncomingMessage } = await import('node:http');
    const { Socket } = await import('node:net');
    const handler = createHandler({ store: createDemoStore(), secret: SECRET });
    const req = Object.assign(Readable.from([]), {
      method: 'POST',
      url: '/api/server?path=auth/login',
      headers: { 'content-type': 'application/json' },
      body: { email: 'admin@resenha.dev', senha: 'admin123' },
      socket: new Socket(),
    });
    const res = new ServerResponse(new IncomingMessage(new Socket()));
    let payload = '';
    res.end = ((chunk?: unknown) => {
      payload = String(chunk ?? '');
      return res;
    }) as typeof res.end;
    await handler(req as never, res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(payload).usuario.email).toBe('admin@resenha.dev');
  });
});
