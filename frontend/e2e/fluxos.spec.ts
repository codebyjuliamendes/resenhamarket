import { expect, test } from '@playwright/test';
import { ADMIN, login, OPERADOR, registrar, row, token } from './helpers';

test.describe.configure({ mode: 'serial' });

// Nenhum fluxo pode depender de algo que a política de segurança (CSP) bloqueia.
let bloqueiosCsp: string[] = [];
test.beforeEach(({ page }) => {
  bloqueiosCsp = [];
  page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) bloqueiosCsp.push(m.text()); });
});
test.afterEach(() => expect(bloqueiosCsp).toEqual([]));

test('entrada e saída atualizam o saldo e aparecem no histórico do produto (R02, R03, R04)', async ({ page }) => {
  await login(page, ADMIN);
  const linha = row(page, 'Caderno 10 matérias');
  const inicial = Number((await linha.locator('.quantity').innerText()).replace(/\D/g, ''));
  await registrar(page, 'Caderno 10 matérias', 'entrada', '5');
  await expect(page.getByRole('status')).toContainText(`Entrada de 5 UN registrada. Saldo: ${inicial + 5} UN.`);
  await expect(linha.locator('.quantity')).toHaveText(`${inicial + 5}UN`);
  await registrar(page, 'Caderno 10 matérias', 'saída', '3');
  await expect(linha.locator('.quantity')).toHaveText(`${inicial + 2}UN`);

  await page.getByRole('link', { name: 'Caderno 10 matérias', exact: true }).click();
  const linhas = page.locator('.timeline li');
  await expect(linhas.first()).toContainText('−3 UN');
  await expect(linhas.first()).toContainText(`saldo ${inicial + 2} UN`);
  await expect(linhas.nth(1)).toContainText('+5 UN');
  await expect(linhas.nth(1)).toContainText('Administradora Demo');
});

test('saída maior que o saldo é bloqueada na tela e recusada pela API (RN05)', async ({ page }) => {
  await login(page, OPERADOR);
  const disponivel = Number((await row(page, 'Pilha AA cartela').locator('.quantity').innerText()).replace(/\D/g, ''));
  await page.getByRole('button', { name: 'Registrar saída de Pilha AA cartela' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/quantidade/i).fill(String(disponivel + 1));
  await expect(dialog.getByText(`Não há saldo suficiente. Disponível: ${disponivel} CX.`)).toBeVisible();
  await expect(dialog.getByRole('button', { name: /^Registrar saída/ })).toBeDisabled();

  const produtos = await (await page.request.get('/api/v1/produtos?busca=V-003', { headers: { Authorization: `Bearer ${await token(page)}` } })).json();
  const resposta = await page.request.post('/api/v1/movimentacoes', {
    headers: { Authorization: `Bearer ${await token(page)}` },
    data: { produtoId: produtos[0].id, tipo: 'SAIDA', quantidade: disponivel + 1, motivo: 'VENDA' },
  });
  expect(resposta.status()).toBe(422);
  expect((await resposta.json()).codigo).toBe('SALDO_INSUFICIENTE');
});

test('operador não vê nem executa ações de administrador (R06, R07)', async ({ page }) => {
  await login(page, OPERADOR);
  await expect(page.getByRole('button', { name: 'Novo produto' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Usuários' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: /Inativos/ })).toHaveCount(0);
  await page.goto('/usuarios');
  await expect(page.getByRole('heading', { name: 'Estoque', exact: true })).toBeVisible();

  const headers = { Authorization: `Bearer ${await token(page)}` };
  expect((await page.request.post('/api/v1/produtos', { headers, data: { codigo: 'X-1', nome: 'Não pode', unidadeMedida: 'UN' } })).status()).toBe(403);
  expect((await page.request.get('/api/v1/usuarios', { headers })).status()).toBe(403);
});

test('administrador cadastra, inativa e reativa um produto (R01, R05)', async ({ page }) => {
  await login(page, ADMIN);
  const codigo = `E2E-${Date.now()}`;
  const nome = `Produto de teste ${codigo}`;
  await page.getByRole('button', { name: 'Novo produto' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Código').fill(codigo);
  await dialog.getByLabel('Nome do produto').fill(nome);
  await dialog.getByLabel('Estoque mínimo').fill('2');
  await dialog.getByRole('button', { name: 'Cadastrar produto' }).click();
  await expect(page.getByRole('heading', { name: nome })).toBeVisible();
  await expect(page.getByText('Sem estoque').first()).toBeVisible();

  await page.getByRole('button', { name: 'Inativar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Inativar' }).click();
  await expect(page.getByRole('status')).toContainText('Produto inativado');
  await page.getByRole('link', { name: 'Estoque', exact: true }).first().click();
  await expect(row(page, nome)).toHaveCount(0);
  await page.getByRole('tab', { name: /Inativos/ }).click();
  await expect(row(page, nome)).toBeVisible();

  await page.getByRole('link', { name: nome }).click();
  await page.getByRole('button', { name: 'Reativar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reativar' }).click();
  await expect(page.getByRole('status')).toContainText('Produto reativado');
});

test('administrador cria um usuário que consegue entrar (R06)', async ({ page }) => {
  await login(page, ADMIN);
  const email = `caixa.${Date.now()}@resenha.dev`;
  await page.getByRole('link', { name: 'Usuários' }).first().click();
  await page.getByRole('button', { name: 'Novo usuário' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome').fill('Caixa Teste');
  await dialog.getByLabel('E-mail').fill(email);
  await dialog.getByLabel('Senha inicial').fill('senha-caixa-1');
  await dialog.getByRole('button', { name: 'Criar usuário' }).click();
  await expect(page.getByRole('row').filter({ hasText: email })).toBeVisible();

  await page.evaluate(() => sessionStorage.clear());
  await login(page, { email, senha: 'senha-caixa-1' });
  await expect(page.getByRole('button', { name: /Caixa Teste/ })).toBeVisible();
});

test('sessão inválida volta para o login com aviso', async ({ page }) => {
  await login(page, ADMIN);
  await page.evaluate(() => sessionStorage.setItem('resenha.token', 'token-invalido'));
  await page.reload();
  await expect(page.getByText('Sua sessão expirou. Entre novamente para continuar.')).toBeVisible();
  await expect(page.getByRole('button', { name: /^entrar/i })).toBeVisible();
});
