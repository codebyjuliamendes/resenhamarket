import type { TipoMovimento } from '../api/client';

export const unitOptions = ['UN', 'KG', 'G', 'L', 'ML', 'CX', 'PCT', 'M'];

export const motives: Record<TipoMovimento, [string, string][]> = {
  ENTRADA: [['COMPRA', 'Compra'], ['DEVOLUCAO_CLIENTE', 'Devolução de cliente'], ['AJUSTE', 'Ajuste / correção'], ['OUTRO', 'Outro']],
  SAIDA: [['VENDA', 'Venda'], ['PERDA', 'Perda'], ['CONSUMO_INTERNO', 'Consumo interno'], ['DEVOLUCAO_FORNECEDOR', 'Devolução a fornecedor'], ['AJUSTE', 'Ajuste / correção'], ['OUTRO', 'Outro']],
};

const motiveLabels = new Map([...motives.ENTRADA, ...motives.SAIDA]);
export const motiveLabel = (motive: string) => motiveLabels.get(motive) ?? motive.replaceAll('_', ' ').toLowerCase();

export const formatQty = (n: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(n);
export const formatDate = (d: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(d));
export const roleLabel = (perfil: string) => (perfil === 'ADMINISTRADOR' ? 'Administrador' : 'Operador');

/** Converte uma data local (AAAA-MM-DD) no instante ISO do início daquele dia, opcionalmente deslocado em dias. */
export function localDayToIso(day: string, offsetDays = 0) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d + offsetDays).toISOString();
}

const unitNames: Record<string, string> = { UN: 'unidade', KG: 'quilo', G: 'grama', L: 'litro', ML: 'mililitro', CX: 'caixa', PCT: 'pacote', M: 'metro' };
export const unitName = (unit: string) => unitNames[unit.toUpperCase()] ?? unit;

export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');

export const todayLabel = (date = new Date()) => {
  const text = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export type StockState = 'ok' | 'low' | 'out';
/** Sem estoque quando o saldo é zero; abaixo do mínimo quando a API sinaliza (mínimo > 0 e saldo <= mínimo). */
export const stockState = (p: { saldoAtual: number; abaixoDoMinimo: boolean }): StockState => (p.saldoAtual <= 0 ? 'out' : p.abaixoDoMinimo ? 'low' : 'ok');
export const stockLabel: Record<StockState, string> = { ok: 'Disponível', low: 'Abaixo do mínimo', out: 'Sem estoque' };
export const stockBadge: Record<StockState, string> = { ok: 'good', low: 'warning', out: 'out' };

/** Largura da barra de nível: o mínimo fica a 1/3 da barra, para mostrar folga acima dele. */
export const levelPercent = (saldo: number, minimo: number) => (minimo > 0 ? Math.min(100, Math.round((saldo / (minimo * 3)) * 100)) : 100);
