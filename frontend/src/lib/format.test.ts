import { describe, expect, it } from 'vitest';
import { initials, levelPercent, stockState, unitName } from './format';

describe('situação do estoque', () => {
  it('distingue sem estoque, abaixo do mínimo e disponível', () => {
    expect(stockState({ saldoAtual: 0, abaixoDoMinimo: true })).toBe('out');
    expect(stockState({ saldoAtual: 0, abaixoDoMinimo: false })).toBe('out');
    expect(stockState({ saldoAtual: 4, abaixoDoMinimo: true })).toBe('low');
    expect(stockState({ saldoAtual: 9, abaixoDoMinimo: false })).toBe('ok');
  });
  it('coloca o mínimo a um terço da barra de nível', () => {
    expect(levelPercent(8, 8)).toBe(33);
    expect(levelPercent(30, 8)).toBe(100);
    expect(levelPercent(5, 0)).toBe(100);
  });
  it('formata nomes de unidade e iniciais', () => {
    expect(unitName('kg')).toBe('quilo');
    expect(unitName('XYZ')).toBe('XYZ');
    expect(initials('Administradora Demo')).toBe('AD');
  });
});
