/**
 * Pure stock rules for the demo API. They mirror the Spring backend
 * (MovimentacaoService, MotivoMovimentacao, ProdutoService) so the Vercel demo behaves like the real API.
 */

export type Perfil = 'ADMINISTRADOR' | 'OPERADOR';
export type TipoMovimento = 'ENTRADA' | 'SAIDA';
export type Motivo =
  | 'COMPRA'
  | 'DEVOLUCAO_CLIENTE'
  | 'AJUSTE'
  | 'OUTRO'
  | 'VENDA'
  | 'PERDA'
  | 'CONSUMO_INTERNO'
  | 'DEVOLUCAO_FORNECEDOR';

export const PERFIS: readonly Perfil[] = ['ADMINISTRADOR', 'OPERADOR'];
export const TIPOS: readonly TipoMovimento[] = ['ENTRADA', 'SAIDA'];

const MOTIVOS: Record<Motivo, readonly TipoMovimento[]> = {
  COMPRA: ['ENTRADA'],
  DEVOLUCAO_CLIENTE: ['ENTRADA'],
  AJUSTE: ['ENTRADA', 'SAIDA'],
  OUTRO: ['ENTRADA', 'SAIDA'],
  VENDA: ['SAIDA'],
  PERDA: ['SAIDA'],
  CONSUMO_INTERNO: ['SAIDA'],
  DEVOLUCAO_FORNECEDOR: ['SAIDA'],
};

export const isMotivo = (value: unknown): value is Motivo => typeof value === 'string' && Object.hasOwn(MOTIVOS, value);
export const isTipo = (value: unknown): value is TipoMovimento => value === 'ENTRADA' || value === 'SAIDA';
export const isPerfil = (value: unknown): value is Perfil => value === 'ADMINISTRADOR' || value === 'OPERADOR';

export function motivoAceita(motivo: Motivo, tipo: TipoMovimento): boolean {
  return MOTIVOS[motivo].includes(tipo);
}

const UNIDADES_INTEIRAS = new Set(['UN', 'CX', 'PCT']);
export const unidadeInteira = (unidade: string): boolean => UNIDADES_INTEIRAS.has(unidade.toUpperCase());

/**
 * Quantities are kept with 3 decimal places, like NUMERIC(14,3) in PostgreSQL. All arithmetic is done
 * in integer thousandths so 0.1 + 0.2 is exactly 0.3.
 */
export const toMilli = (value: number): number => Math.round(value * 1000);
export const fromMilli = (milli: number): number => milli / 1000;

/** True when the number has at most 3 decimal places (tolerating binary floating point noise). */
export function hasAtMostThreeDecimals(value: number): boolean {
  return Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-6;
}

export function somar(saldo: number, quantidade: number, tipo: TipoMovimento): number {
  const delta = toMilli(quantidade);
  return fromMilli(tipo === 'ENTRADA' ? toMilli(saldo) + delta : toMilli(saldo) - delta);
}

/** RN09: below minimum when a minimum is set (> 0) and the balance is at or under it. */
export function abaixoDoMinimo(saldo: number, minimo: number): boolean {
  return minimo > 0 && toMilli(saldo) <= toMilli(minimo);
}

export const formatarQuantidade = (value: number): string => String(fromMilli(toMilli(value)));

export const normalizarCodigo = (codigo: string): string => codigo.trim().toLowerCase();
export const normalizarEmail = (email: string): string => email.trim().toLowerCase();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const emailValido = (email: string): boolean => EMAIL.test(email);
