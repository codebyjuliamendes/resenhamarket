import { expect, type Page } from '@playwright/test';

export const ADMIN = { email: 'admin@resenha.dev', senha: 'admin123' };
export const OPERADOR = { email: 'operador@resenha.dev', senha: 'operador123' };

export async function login(page: Page, { email, senha }: { email: string; senha: string }) {
  await page.goto('/');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: /^entrar/i }).click();
  await expect(page.getByRole('heading', { name: 'Estoque', exact: true })).toBeVisible();
}

export async function token(page: Page) {
  return page.evaluate(() => sessionStorage.getItem('resenha.token'));
}

export function row(page: Page, produto: string) {
  return page.getByRole('row').filter({ has: page.getByRole('link', { name: produto, exact: true }) });
}

export async function registrar(page: Page, produto: string, tipo: 'entrada' | 'saída', quantidade: string) {
  await page.getByRole('button', { name: `Registrar ${tipo} de ${produto}` }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/quantidade/i).fill(quantidade);
  await dialog.getByRole('button', { name: new RegExp(`^Registrar ${tipo}`) }).click();
  await expect(dialog).toBeHidden();
}
