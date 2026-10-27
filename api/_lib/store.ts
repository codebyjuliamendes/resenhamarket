import { hashPassword } from './auth';
import { abaixoDoMinimo, somar, type Motivo, type Perfil, type TipoMovimento } from './domain';

// Response shapes, matching frontend/src/api/client.ts and the Spring DTOs.
export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
}

export interface UsuarioAdmin extends Usuario {
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Produto {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  unidadeMedida: string;
  estoqueMinimo: number;
  saldoAtual: number;
  abaixoDoMinimo: boolean;
  ativo: boolean;
  atualizadoEm: string;
}

export interface Movimento {
  id: number;
  produtoId: number;
  produtoNome: string;
  produtoCodigo: string;
  tipo: TipoMovimento;
  quantidade: number;
  saldoApos: number;
  motivo: Motivo;
  observacao: string | null;
  usuarioId: number;
  usuarioNome: string;
  criadoEm: string;
}

/** Stored user: never serialized as is, because it carries the password hash. */
export interface UsuarioRegistro extends UsuarioAdmin {
  senhaHash: string;
}

export interface Store {
  usuarios: UsuarioRegistro[];
  produtos: Produto[];
  movimentos: Movimento[];
  nextUsuarioId: number;
  nextProdutoId: number;
  nextMovimentoId: number;
}

export const DEMO_ACCOUNTS = [
  { nome: 'Administrador da Loja', email: 'admin@resenha.dev', senha: 'admin123', perfil: 'ADMINISTRADOR' as const },
  { nome: 'Operador de Caixa', email: 'operador@resenha.dev', senha: 'operador123', perfil: 'OPERADOR' as const },
];

type Lancamento = { qtd: number; motivo: Motivo; obs?: string };
type ItemDemo = { codigo: string; nome: string; descricao: string | null; unidade: string; minimo: number; entradas: Lancamento[]; saidas: Lancamento[] };

const compra = (qtd: number): Lancamento => ({ qtd, motivo: 'COMPRA' });
const venda = (qtd: number): Lancamento => ({ qtd, motivo: 'VENDA' });

// Same three scenarios as backend/src/main/java/br/ufma/resenhamarket/demo/CenarioDemo.java.
export const ITENS_DEMO: ItemDemo[] = [
  // Varejo
  { codigo: 'V-001', nome: 'Camiseta básica', descricao: 'Algodão, tamanho M', unidade: 'UN', minimo: 6, entradas: [compra(18)], saidas: [venda(8)] },
  { codigo: 'V-002', nome: 'Caderno 10 matérias', descricao: null, unidade: 'UN', minimo: 8, entradas: [compra(32)], saidas: [venda(6)] },
  { codigo: 'V-003', nome: 'Pilha AA cartela', descricao: 'Cartela com 4 unidades', unidade: 'CX', minimo: 5, entradas: [compra(14)], saidas: [venda(10)] },
  { codigo: 'V-004', nome: 'Caneta esferográfica azul', descricao: 'Caixa com 50', unidade: 'CX', minimo: 4, entradas: [compra(20)], saidas: [venda(5)] },
  { codigo: 'V-005', nome: 'Fita adesiva transparente', descricao: null, unidade: 'UN', minimo: 10, entradas: [compra(24)], saidas: [venda(24)] },
  { codigo: 'V-006', nome: 'Mochila escolar', descricao: null, unidade: 'UN', minimo: 3, entradas: [compra(8), { qtd: 1, motivo: 'DEVOLUCAO_CLIENTE', obs: 'Troca de tamanho' }], saidas: [venda(2)] },
  { codigo: 'V-007', nome: 'Garrafa térmica 500 ml', descricao: null, unidade: 'UN', minimo: 4, entradas: [compra(9)], saidas: [{ qtd: 1, motivo: 'PERDA', obs: 'Avaria no transporte' }] },
  { codigo: 'V-008', nome: 'Papel A4 resma', descricao: '500 folhas', unidade: 'PCT', minimo: 6, entradas: [compra(15)], saidas: [{ qtd: 1, motivo: 'CONSUMO_INTERNO', obs: 'Uso no caixa' }] },
  // Farmácia
  { codigo: 'F-001', nome: 'Dipirona 500 mg caixa com 10', descricao: null, unidade: 'CX', minimo: 8, entradas: [compra(24)], saidas: [venda(9)] },
  { codigo: 'F-002', nome: 'Álcool 70% 1 litro', descricao: null, unidade: 'UN', minimo: 5, entradas: [compra(16)], saidas: [venda(12)] },
  { codigo: 'F-003', nome: 'Soro fisiológico 500 ml', descricao: null, unidade: 'UN', minimo: 10, entradas: [compra(30)], saidas: [venda(6)] },
  { codigo: 'F-004', nome: 'Paracetamol 750 mg caixa com 20', descricao: null, unidade: 'CX', minimo: 6, entradas: [compra(18)], saidas: [venda(7)] },
  { codigo: 'F-005', nome: 'Protetor solar FPS 50', descricao: 'Frasco 120 ml', unidade: 'UN', minimo: 4, entradas: [compra(10)], saidas: [venda(10)] },
  { codigo: 'F-006', nome: 'Fralda infantil M', descricao: null, unidade: 'PCT', minimo: 5, entradas: [compra(12)], saidas: [venda(4)] },
  { codigo: 'F-007', nome: 'Termômetro digital', descricao: null, unidade: 'UN', minimo: 2, entradas: [compra(6)], saidas: [{ qtd: 1, motivo: 'DEVOLUCAO_FORNECEDOR', obs: 'Defeito de fábrica' }] },
  { codigo: 'F-008', nome: 'Gaze estéril', descricao: null, unidade: 'PCT', minimo: 10, entradas: [compra(40)], saidas: [{ qtd: 2, motivo: 'CONSUMO_INTERNO', obs: 'Sala de curativos' }] },
  // Alimentício
  { codigo: 'A-001', nome: 'Farinha de trigo', descricao: null, unidade: 'KG', minimo: 4, entradas: [compra(12.5)], saidas: [venda(3.75)] },
  { codigo: 'A-002', nome: 'Leite integral', descricao: null, unidade: 'L', minimo: 8, entradas: [compra(20)], saidas: [venda(14)] },
  { codigo: 'A-003', nome: 'Ovos bandeja 30', descricao: null, unidade: 'PCT', minimo: 3, entradas: [compra(9)], saidas: [venda(9)] },
  { codigo: 'A-004', nome: 'Queijo muçarela', descricao: 'Vendido fatiado', unidade: 'KG', minimo: 2, entradas: [compra(5.2)], saidas: [venda(1.35)] },
  { codigo: 'A-005', nome: 'Café torrado 500 g', descricao: null, unidade: 'PCT', minimo: 6, entradas: [compra(24)], saidas: [venda(8)] },
  { codigo: 'A-006', nome: 'Açúcar cristal', descricao: null, unidade: 'KG', minimo: 10, entradas: [compra(30)], saidas: [{ qtd: 2.5, motivo: 'CONSUMO_INTERNO', obs: 'Uso na cozinha' }] },
  { codigo: 'A-007', nome: 'Óleo de soja 900 ml', descricao: null, unidade: 'UN', minimo: 6, entradas: [compra(18)], saidas: [{ qtd: 1, motivo: 'PERDA', obs: 'Embalagem furada' }, venda(5)] },
  { codigo: 'A-008', nome: 'Banana prata', descricao: null, unidade: 'KG', minimo: 3, entradas: [compra(8.4)], saidas: [{ qtd: 1.2, motivo: 'PERDA', obs: 'Madura demais' }, venda(4)] },
];

/** Builds a fresh demo store. Each serverless instance gets its own copy (see README, "Demo na Vercel"). */
export function createDemoStore(now = new Date()): Store {
  const agora = now.toISOString();
  const usuarios: UsuarioRegistro[] = DEMO_ACCOUNTS.map((a, i) => ({
    id: i + 1,
    nome: a.nome,
    email: a.email,
    perfil: a.perfil,
    ativo: true,
    criadoEm: agora,
    atualizadoEm: agora,
    senhaHash: hashPassword(a.senha),
  }));
  const [admin, operador] = usuarios;
  const produtos: Produto[] = [];
  const movimentos: Movimento[] = [];

  ITENS_DEMO.forEach((item, index) => {
    const produtoId = index + 1;
    let saldo = 0;
    const lancar = (tipo: TipoMovimento, l: Lancamento, observacaoPadrao: string | null) => {
      saldo = somar(saldo, l.qtd, tipo);
      // As in the Spring seed: entries are recorded by the administrator, exits by the operator.
      const autor = tipo === 'ENTRADA' ? admin : operador;
      movimentos.push({
        id: movimentos.length + 1,
        produtoId,
        produtoNome: item.nome,
        produtoCodigo: item.codigo,
        tipo,
        quantidade: l.qtd,
        saldoApos: saldo,
        motivo: l.motivo,
        observacao: l.obs ?? observacaoPadrao,
        usuarioId: autor.id,
        usuarioNome: autor.nome,
        criadoEm: agora,
      });
    };
    item.entradas.forEach((l) => lancar('ENTRADA', l, 'Estoque inicial da demonstração'));
    item.saidas.forEach((l) => lancar('SAIDA', l, null));
    produtos.push({
      id: produtoId,
      codigo: item.codigo,
      nome: item.nome,
      descricao: item.descricao,
      unidadeMedida: item.unidade,
      estoqueMinimo: item.minimo,
      saldoAtual: saldo,
      abaixoDoMinimo: abaixoDoMinimo(saldo, item.minimo),
      ativo: true,
      atualizadoEm: agora,
    });
  });

  return {
    usuarios,
    produtos,
    movimentos,
    nextUsuarioId: usuarios.length + 1,
    nextProdutoId: produtos.length + 1,
    nextMovimentoId: movimentos.length + 1,
  };
}

export function toUsuario(u: UsuarioRegistro): Usuario {
  return { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil };
}

export function toUsuarioAdmin(u: UsuarioRegistro): UsuarioAdmin {
  return { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, ativo: u.ativo, criadoEm: u.criadoEm, atualizadoEm: u.atualizadoEm };
}
