import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, login } from './helpers';

// Sem animações, para o axe medir o contraste das cores finais e não de um quadro da transição.
test.use({ reducedMotion: 'reduce' });

async function semViolacoesGraves(page: Page, tela: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const graves = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(graves.map((v) => `${tela}: ${v.id} (${v.nodes.length}) ${v.help}`)).toEqual([]);
}

test('telas principais sem violações graves de acessibilidade (WCAG 2.1 AA)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^entrar/i })).toBeVisible();
  await semViolacoesGraves(page, 'login');

  await login(page, ADMIN);
  await semViolacoesGraves(page, 'estoque');

  await page.getByRole('button', { name: 'Registrar saída de Leite integral' }).click();
  await page.getByRole('dialog').getByLabel(/quantidade/i).fill('2');
  await semViolacoesGraves(page, 'modal de movimentação');
  await page.keyboard.press('Escape');

  await page.getByRole('link', { name: 'Leite integral', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Movimentações' })).toBeVisible();
  await semViolacoesGraves(page, 'produto');

  await page.getByRole('link', { name: 'Histórico' }).first().click();
  await expect(page.getByRole('heading', { name: 'Histórico de movimentações' })).toBeVisible();
  await semViolacoesGraves(page, 'histórico');

  await page.getByRole('link', { name: 'Usuários' }).first().click();
  await expect(page.getByRole('heading', { name: 'Usuários' })).toBeVisible();
  await semViolacoesGraves(page, 'usuários');
});
