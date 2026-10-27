import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, query } from './client';
import { jsonResponse } from '../test-utils';

afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); });

describe('cliente da API', () => {
  it('envia o token e devolve o corpo', async () => {
    sessionStorage.setItem('resenha.token', 'abc');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));
    await expect(api('/produtos')).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/produtos');
    expect((fetchMock.mock.calls[0][1]!.headers as Record<string, string>).Authorization).toBe('Bearer abc');
  });

  it('transforma o erro da API em ApiError com código e campos', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ mensagem: 'Confira os campos.', codigo: 'VALIDACAO', campos: [{ campo: 'nome', mensagem: 'obrigatório' }] }, 400));
    const error = (await api('/produtos').catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: 'Confira os campos.', status: 400, code: 'VALIDACAO' });
    expect(error.fields).toHaveLength(1);
  });

  it('avisa a sessão quando o token deixa de valer', async () => {
    sessionStorage.setItem('resenha.token', 'vencido');
    const listener = vi.fn();
    window.addEventListener('resenha:unauthorized', listener);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ mensagem: 'Sua sessão expirou.' }, 401));
    await expect(api('/produtos')).rejects.toThrow('Sua sessão expirou.');
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener('resenha:unauthorized', listener);
  });

  it('explica quando não há conexão e aceita resposta vazia', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(api('/x')).rejects.toMatchObject({ status: 0, message: expect.stringMatching(/sem conexão/i) });
    await expect(api('/x')).resolves.toBeNull();
  });

  it('monta a query ignorando valores vazios', () => {
    expect(query({ busca: 'leite', ativo: true, tipo: '', page: 0, de: undefined })).toBe('?busca=leite&ativo=true&page=0');
    expect(query({ busca: '' })).toBe('');
  });
});
