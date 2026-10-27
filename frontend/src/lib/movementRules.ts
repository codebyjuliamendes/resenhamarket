export type MovementType='ENTRADA'|'SAIDA';
const integerUnits=new Set(['UN','CX','PCT']);
export function calculateNextBalance(current:number,quantity:number,type:MovementType):number{return type==='ENTRADA'?current+quantity:current-quantity;}
export function quantityError(unit:string,quantity:number):string|null{
 if(!Number.isFinite(quantity)||quantity<=0)return 'Informe uma quantidade maior que zero.';
 if(!/^\d+(\.\d{1,3})?$/.test(String(quantity)))return 'Use no máximo 3 casas decimais.';
 if(integerUnits.has(unit.toUpperCase())&&!Number.isInteger(quantity))return `Para ${unit.toUpperCase()}, informe um número inteiro.`;
 return null;
}
