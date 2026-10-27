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
