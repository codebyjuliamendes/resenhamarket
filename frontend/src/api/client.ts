export type Perfil = 'ADMINISTRADOR' | 'OPERADOR';
export type Usuario = { id: number; nome: string; email: string; perfil: Perfil };
export type UsuarioAdmin = Usuario & { ativo: boolean; criadoEm: string; atualizadoEm: string };
export type Produto = { id: number; codigo: string; nome: string; descricao: string | null; unidadeMedida: string; estoqueMinimo: number; saldoAtual: number; abaixoDoMinimo: boolean; ativo: boolean; atualizadoEm: string };
export type TipoMovimento = 'ENTRADA' | 'SAIDA';
export type Movimento = { id: number; produtoId: number; produtoNome: string; produtoCodigo: string; tipo: TipoMovimento; quantidade: number; saldoApos: number; motivo: string; observacao: string | null; usuarioId: number; usuarioNome: string; criadoEm: string };
export type Page<T> = { content: T[]; page: number; size: number; totalElements: number; totalPages: number };
export type LoginResponse = { token: string; expiraEm: number; usuario: Usuario };

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string, readonly fields: { campo: string; mensagem: string }[] = []) {
    super(message);
  }
}

export const TOKEN_KEY = 'resenha.token';
const token = () => sessionStorage.getItem(TOKEN_KEY);

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}), ...init.headers },
    });
  } catch {
    throw new ApiError('Sem conexão com o servidor. Verifique a internet e tente de novo.', 0);
  }
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (response.status === 401 && token()) window.dispatchEvent(new Event('resenha:unauthorized'));
  if (!response.ok) throw new ApiError(body?.mensagem || 'Não foi possível concluir. Tente novamente.', response.status, body?.codigo, body?.campos || []);
  return body as T;
}

export function query(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  const text = search.toString();
  return text ? `?${text}` : '';
}
