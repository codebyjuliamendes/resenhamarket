import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import type { Produto } from '../api/client';
import { mockApi, renderWithProviders, signIn } from '../test-utils';

const base = { descricao: null, ativo: true, atualizadoEm: '2026-10-27T12:00:00Z' };
const produtos: Produto[] = [
  { ...base, id: 1, codigo: 'A-002', nome: 'Leite integral', unidadeMedida: 'L', estoqueMinimo: 8, saldoAtual: 6, abaixoDoMinimo: true },
  { ...base, id: 2, codigo: 'A-003', nome: 'Ovos bandeja 30', unidadeMedida: 'PCT', estoqueMinimo: 3, saldoAtual: 0, abaixoDoMinimo: true },
  { ...base, id: 3, codigo: 'A-005', nome: 'Café torrado 500 g', unidadeMedida: 'PCT', estoqueMinimo: 6, saldoAtual: 16, abaixoDoMinimo: false },
];
const vazio = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 };

afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); });

describe('Estoque', () => {
  it('mostra contadores por situação e filtra pelas abas', async () => {
    signIn('ADMINISTRADOR');
    mockApi([{ path: '/produtos', body: produtos }]);
    renderWithProviders(<App />);
    expect(await screen.findByRole('link', { name: 'Leite integral' })).toBeInTheDocument();
    const tabs = screen.getByRole('tablist', { name: /situação/i });
    expect(within(tabs).getByRole('tab', { name: /Todos/ })).toHaveTextContent('3');
    await userEvent.click(within(tabs).getByRole('tab', { name: /Sem estoque/ }));
    expect(screen.getByRole('link', { name: 'Ovos bandeja 30' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Leite integral' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar saída de Ovos bandeja 30' })).toBeDisabled();
    await userEvent.click(within(tabs).getByRole('tab', { name: /Abaixo do mínimo/ }));
    expect(screen.getByRole('link', { name: 'Leite integral' })).toBeInTheDocument();
    expect(screen.getByText('Abaixo do mínimo', { selector: '.badge' })).toBeInTheDocument();
  });

  it('esconde ações de administrador para o operador e bloqueia /usuarios', async () => {
    signIn('OPERADOR');
    mockApi([{ path: '/produtos', body: produtos }]);
    window.history.pushState({}, '', '/');
    renderWithProviders(<App />, '/usuarios');
    expect(await screen.findByRole('heading', { name: 'Estoque' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Novo produto' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Usuários' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Inativos/ })).not.toBeInTheDocument();
  });

  it('mostra erro com opção de tentar de novo', async () => {
    signIn('OPERADOR');
    mockApi([{ path: '/produtos', status: 500, body: { mensagem: 'Algo deu errado do nosso lado.' } }]);
    renderWithProviders(<App />);
    expect(await screen.findByText(/Algo deu errado do nosso lado/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});

describe('Produto', () => {
  it('mostra quanto falta para o mínimo e o histórico vazio', async () => {
    signIn('ADMINISTRADOR');
    mockApi([{ path: '/produtos/1', body: produtos[0] }, { path: '/movimentacoes', body: vazio }]);
    renderWithProviders(<App />, '/produtos/1');
    expect(await screen.findByRole('heading', { name: 'Leite integral' })).toBeInTheDocument();
    expect(screen.getByText('Faltam 2 L para o mínimo')).toBeInTheDocument();
    expect(screen.getByText('Ainda não há movimentações para este produto.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Inativar/ })).toBeInTheDocument();
  });

  it('pede confirmação e inativa o produto', async () => {
    signIn('ADMINISTRADOR');
    const { calls } = mockApi([
      { path: '/produtos/3', body: produtos[2] },
      { path: '/movimentacoes', body: vazio },
      { method: 'PATCH', path: '/produtos/3/inativar', body: { ...produtos[2], ativo: false } },
    ]);
    renderWithProviders(<App />, '/produtos/3');
    await userEvent.click(await screen.findByRole('button', { name: /Inativar/ }));
    const dialog = screen.getByRole('dialog', { name: 'Inativar produto?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Inativar' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
    expect(await screen.findByText(/Produto inativado/)).toBeInTheDocument();
  });

  it('cadastro valida campos obrigatórios e mostra código duplicado no campo', async () => {
    signIn('ADMINISTRADOR');
    mockApi([
      { path: '/produtos', body: [] },
      { method: 'POST', path: '/produtos', status: 409, body: { mensagem: 'Este código já está em uso.', codigo: 'CODIGO_DUPLICADO' } },
    ]);
    renderWithProviders(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'Novo produto' }));
    const dialog = screen.getByRole('dialog', { name: 'Cadastrar produto' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cadastrar produto' }));
    expect(within(dialog).getByText('Informe o código.')).toBeInTheDocument();
    expect(within(dialog).getByText('Informe o nome do produto.')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Código'), 'A-002');
    await userEvent.type(within(dialog).getByLabelText('Nome do produto'), 'Leite');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cadastrar produto' }));
    expect(await within(dialog).findByText('Este código já está em uso.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Código')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Histórico', () => {
  it('avisa quando o período está invertido', async () => {
    signIn('OPERADOR');
    mockApi([{ path: '/produtos', body: produtos }, { path: '/movimentacoes', body: vazio }]);
    renderWithProviders(<App />, '/historico?de=2026-10-20&ate=2026-10-10');
    expect(await screen.findByRole('alert')).toHaveTextContent('A data inicial precisa ser anterior ou igual à data final.');
  });

  it('lista as movimentações com motivo e responsável', async () => {
    signIn('OPERADOR');
    mockApi([
      { path: '/produtos', body: produtos },
      { path: '/movimentacoes', body: { ...vazio, totalElements: 1, totalPages: 1, content: [{ id: 9, produtoId: 1, produtoNome: 'Leite integral', produtoCodigo: 'A-002', tipo: 'SAIDA', quantidade: 2, saldoApos: 6, motivo: 'CONSUMO_INTERNO', observacao: 'Cozinha', usuarioId: 2, usuarioNome: 'Operador Demo', criadoEm: '2026-10-27T15:00:00Z' }] } },
    ]);
    renderWithProviders(<App />, '/historico');
    expect(await screen.findByText('Consumo interno')).toBeInTheDocument();
    expect(screen.getByText('Cozinha')).toBeInTheDocument();
    expect(screen.getByText('−2')).toBeInTheDocument();
    expect(screen.getByText('1 registro')).toBeInTheDocument();
  });
});

describe('Usuários e senha', () => {
  it('novo usuário exige senha inicial de 8 caracteres', async () => {
    signIn('ADMINISTRADOR');
    mockApi([{ path: '/usuarios', body: [{ id: 1, nome: 'Administradora Demo', email: 'x@resenha.dev', perfil: 'ADMINISTRADOR', ativo: true, criadoEm: '', atualizadoEm: '' }] }]);
    renderWithProviders(<App />, '/usuarios');
    await userEvent.click(await screen.findByRole('button', { name: 'Novo usuário' }));
    const dialog = screen.getByRole('dialog', { name: 'Novo usuário' });
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Caixa');
    await userEvent.type(within(dialog).getByLabelText('E-mail'), 'caixa@loja.com');
    await userEvent.type(within(dialog).getByLabelText(/Senha inicial/), 'curta');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Criar usuário' }));
    expect(within(dialog).getByText('Use pelo menos 8 caracteres.')).toBeInTheDocument();
    expect(screen.getByText('Você')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Inativar Administradora Demo' })).not.toBeInTheDocument();
  });

  it('troca de senha confere a repetição', async () => {
    signIn('OPERADOR');
    mockApi([{ path: '/produtos', body: [] }]);
    renderWithProviders(<App />);
    await userEvent.click((await screen.findAllByRole('button', { name: /Operador Demo/ }))[0]);
    await userEvent.click(screen.getAllByRole('menuitem', { name: /Trocar senha/ })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Trocar senha' });
    await userEvent.type(within(dialog).getByLabelText('Senha atual'), 'operador123');
    await userEvent.type(within(dialog).getByLabelText('Nova senha'), 'nova-senha-1');
    await userEvent.type(within(dialog).getByLabelText('Repita a nova senha'), 'outra-senha');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar nova senha' }));
    expect(within(dialog).getByText('As senhas não conferem.')).toBeInTheDocument();
  });
});
