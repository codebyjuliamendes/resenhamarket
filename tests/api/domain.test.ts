import { describe, expect, it } from 'vitest';
import { createToken, hashPassword, verifyPassword, verifyToken } from '../../api/_lib/auth';
import { abaixoDoMinimo, hasAtMostThreeDecimals, motivoAceita, somar, unidadeInteira } from '../../api/_lib/domain';
import { LoginAttemptLimiter } from '../../api/_lib/rateLimit';
import { createDemoStore } from '../../api/_lib/store';

describe('regras de estoque', () => {
  it('soma em milésimos, sem erro de ponto flutuante', () => {
    expect(somar(0.1, 0.2, 'ENTRADA')).toBe(0.3);
    expect(somar(1.3, 1.1, 'SAIDA')).toBe(0.2);
    expect(somar(12.5, 3.75, 'SAIDA')).toBe(8.75);
  });

  it('aceita no máximo 3 casas decimais', () => {
    expect(hasAtMostThreeDecimals(1.375)).toBe(true);
    expect(hasAtMostThreeDecimals(0.001)).toBe(true);
    expect(hasAtMostThreeDecimals(1.2345)).toBe(false);
  });

  it('considera abaixo do mínimo só quando há mínimo e o saldo chega a ele (RN09)', () => {
    expect(abaixoDoMinimo(8, 8)).toBe(true);
    expect(abaixoDoMinimo(9, 8)).toBe(false);
    expect(abaixoDoMinimo(0, 0)).toBe(false);
  });

  it('combina motivo e tipo como o enum MotivoMovimentacao', () => {
    expect(motivoAceita('COMPRA', 'ENTRADA')).toBe(true);
    expect(motivoAceita('COMPRA', 'SAIDA')).toBe(false);
    expect(motivoAceita('VENDA', 'ENTRADA')).toBe(false);
    expect(motivoAceita('AJUSTE', 'SAIDA')).toBe(true);
  });

  it('trata UN, CX e PCT como unidades inteiras', () => {
    expect(unidadeInteira('un')).toBe(true);
    expect(unidadeInteira('PCT')).toBe(true);
    expect(unidadeInteira('KG')).toBe(false);
  });
});

describe('dados de demonstração', () => {
  it('têm saldo igual ao livro de movimentações em todos os produtos', () => {
    const store = createDemoStore();
    expect(store.produtos).toHaveLength(24);
    for (const p of store.produtos) {
      const ledger = store.movimentos
        .filter((m) => m.produtoId === p.id)
        .reduce((acc, m) => somar(acc, m.quantidade, m.tipo), 0);
      expect(ledger).toBe(p.saldoAtual);
      expect(p.saldoAtual).toBeGreaterThanOrEqual(0);
    }
  });

  it('incluem produtos abaixo do mínimo e sem estoque', () => {
    const store = createDemoStore();
    expect(store.produtos.some((p) => p.saldoAtual === 0)).toBe(true);
    expect(store.produtos.some((p) => p.abaixoDoMinimo && p.saldoAtual > 0)).toBe(true);
  });

  it('não guardam senhas em texto', () => {
    const store = createDemoStore();
    expect(store.usuarios.every((u) => u.senhaHash.startsWith('scrypt$'))).toBe(true);
  });
});

describe('senha e token', () => {
  it('verifica a senha com o hash', () => {
    const hash = hashPassword('segredo123');
    expect(verifyPassword('segredo123', hash)).toBe(true);
    expect(verifyPassword('outra', hash)).toBe(false);
    expect(verifyPassword('segredo123', 'texto-sem-formato')).toBe(false);
  });

  it('aceita token válido e recusa assinatura alterada ou expirada', () => {
    const secret = 'x'.repeat(32);
    const now = Date.UTC(2026, 0, 1);
    const token = createToken(7, 'OPERADOR', secret, 60, now);
    expect(verifyToken(token, secret, now)?.sub).toBe('7');
    expect(verifyToken(token, 'y'.repeat(32), now)).toBeNull();
    expect(verifyToken(token, secret, now + 61_000)).toBeNull();

    const [h, , s] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: '1', perfil: 'ADMINISTRADOR', iat: 0, exp: 9e9 })).toString('base64url');
    expect(verifyToken(`${h}.${forged}.${s}`, secret, now)).toBeNull();
  });
});

describe('limite de tentativas de login', () => {
  it('bloqueia após 5 falhas e libera depois da janela', () => {
    let now = 0;
    const limiter = new LoginAttemptLimiter(5, 15 * 60_000, () => now);
    for (let i = 0; i < 5; i++) limiter.registerFailure('a|ip');
    expect(limiter.blocked('a|ip')).toBe(true);
    expect(limiter.blocked('b|ip')).toBe(false);
    now = 15 * 60_000 + 1;
    expect(limiter.blocked('a|ip')).toBe(false);
  });
});
