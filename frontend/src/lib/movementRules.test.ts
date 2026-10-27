import {describe,expect,it} from 'vitest';
import {calculateNextBalance,quantityError} from './movementRules';

describe('estoque e quantidade',()=>{
 it('calcula corretamente o saldo depois de entrada e saída',()=>{
  const afterEntry=calculateNextBalance(8.5,2.25,'ENTRADA');
  expect(afterEntry).toBe(10.75);
  expect(calculateNextBalance(afterEntry,1.5,'SAIDA')).toBe(9.25);
 });
 it('permite frações para unidades de medida variáveis',()=>{
  expect(quantityError('KG',1.375)).toBeNull();
  expect(quantityError('L',0.5)).toBeNull();
 });
 it('bloqueia frações em unidade inteira e casas além de milésimos',()=>{
  expect(quantityError('UN',1.5)).toMatch(/número inteiro/i);
  expect(quantityError('KG',1.2345)).toMatch(/3 casas decimais/i);
 });
 it('rejeita quantidades nulas ou negativas',()=>{
  expect(quantityError('UN',0)).toMatch(/maior que zero/i);
  expect(quantityError('KG',-2)).toMatch(/maior que zero/i);
 });
});

describe('precisão do saldo',()=>{
 it('evita erros de ponto flutuante em frações',()=>{
  expect(calculateNextBalance(0.1,0.2,'ENTRADA')).toBe(0.3);
  expect(calculateNextBalance(1.3,1.1,'SAIDA')).toBe(0.2);
 });
});
