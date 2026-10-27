import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Produto } from '../api/client';
import { jsonResponse, renderWithProviders } from '../test-utils';
import { LoginPage } from '../pages/LoginPage';
import { Modal } from './Modal';
import { MovementModal } from './MovementModal';

const product: Produto = { id: 7, codigo: 'A-001', nome: 'Farinha de trigo', descricao: null, unidadeMedida: 'UN', estoqueMinimo: 2, saldoAtual: 5, abaixoDoMinimo: false, ativo: true, atualizadoEm: '2026-10-27T12:00:00Z' };

afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); });

describe('Modal', () => {
  it('fecha com Escape e foca o primeiro campo', async () => {
    const onClose = vi.fn();
    renderWithProviders(<Modal title="Teste" onClose={onClose}><input aria-label="campo" /></Modal>);
    expect(screen.getByRole('dialog', { name: 'Teste' })).toBeInTheDocument();
    expect(screen.getByLabelText('campo')).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('MovementModal', () => {
  it('mostra a prévia do saldo e bloqueia saída maior que o disponível', async () => {
    renderWithProviders(<MovementModal product={product} type="SAIDA" onClose={() => {}} onSaved={() => {}} />);
    const qty = screen.getByLabelText(/quantidade/i);
    await userEvent.type(qty, '3');
    expect(screen.getByText(/saldo depois/i).parentElement).toHaveTextContent('5 2 UN');
    expect(screen.getByRole('button', { name: /registrar saída/i })).toBeEnabled();
    await userEvent.clear(qty);
    await userEvent.type(qty, '8');
    expect(screen.getByText(/não há saldo suficiente/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar saída/i })).toBeDisabled();
  });

  it('bloqueia fração em unidade inteira', async () => {
    renderWithProviders(<MovementModal product={product} type="ENTRADA" onClose={() => {}} onSaved={() => {}} />);
    await userEvent.type(screen.getByLabelText(/quantidade/i), '1.5');
    expect(screen.getByText(/informe um número inteiro/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar entrada/i })).toBeDisabled();
  });

  it('envia a movimentação com o motivo do tipo escolhido', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ id: 1, tipo: 'SAIDA', quantidade: 2, saldoApos: 3 }, 201));
    const onSaved = vi.fn();
    renderWithProviders(<MovementModal product={product} type="ENTRADA" onClose={() => {}} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('radio', { name: /saída/i }));
    await userEvent.type(screen.getByLabelText(/quantidade/i), '2');
    await userEvent.click(screen.getByRole('button', { name: /registrar saída/i }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(body).toMatchObject({ produtoId: 7, tipo: 'SAIDA', quantidade: 2, motivo: 'VENDA' });
  });
});

describe('LoginPage', () => {
  it('preenche a conta de demonstração e mostra o erro da API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ mensagem: 'E-mail ou senha incorretos.' }, 401));
    renderWithProviders(<LoginPage showDemo />);
    await userEvent.click(screen.getByRole('button', { name: /operador/i }));
    expect(screen.getByLabelText(/e-mail/i)).toHaveValue('operador@resenha.dev');
    await userEvent.click(screen.getByRole('button', { name: /^entrar/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
  });
});
