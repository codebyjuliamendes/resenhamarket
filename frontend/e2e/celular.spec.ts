import { expect, test } from '@playwright/test';
import { OPERADOR, login, registrar } from './helpers';

test('no celular o operador registra uma saída sem rolagem lateral (OS1)', async ({ page }) => {
  await login(page, OPERADOR);
  await expect(page.getByRole('navigation', { name: 'Principal no celular' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await registrar(page, 'Soro fisiológico 500 ml', 'saída', '1');
  await expect(page.getByRole('status')).toContainText('Saída de 1 UN registrada.');
});
