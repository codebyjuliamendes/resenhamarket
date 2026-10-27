export type MovementType='ENTRADA'|'SAIDA';
const integerUnits=new Set(['UN','CX','PCT']);
export const isIntegerUnit=(unit:string)=>integerUnits.has(unit.toUpperCase());
/** Soma em milésimos para evitar erros de ponto flutuante (ex.: 0,1 + 0,2). */
export function calculateNextBalance(current:number,quantity:number,type:MovementType):number{const delta=Math.round(quantity*1000);const base=Math.round(current*1000);return (type==='ENTRADA'?base+delta:base-delta)/1000;}
export function quantityError(unit:string,quantity:number):string|null{
 if(!Number.isFinite(quantity)||quantity<=0)return 'Informe uma quantidade maior que zero.';
 if(!/^\d+(\.\d{1,3})?$/.test(String(quantity)))return 'Use no máximo 3 casas decimais.';
 if(isIntegerUnit(unit)&&!Number.isInteger(quantity))return `Para ${unit.toUpperCase()}, informe um número inteiro.`;
 return null;
}
