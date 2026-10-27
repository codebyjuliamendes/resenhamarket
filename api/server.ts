import type { IncomingMessage, ServerResponse } from 'http';

// Interface types matching frontend/src/api/client.ts
export type Perfil = 'ADMINISTRADOR' | 'OPERADOR';

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

export type TipoMovimento = 'ENTRADA' | 'SAIDA';

export interface Movimento {
  id: number;
  produtoId: number;
  produtoNome: string;
  produtoCodigo: string;
  tipo: TipoMovimento;
  quantidade: number;
  saldoApos: number;
  motivo: string;
  observacao: string | null;
  usuarioId: number;
  usuarioNome: string;
  criadoEm: string;
}

// In-Memory Database for Demo / Serverless
let initialized = false;
let usuarios: UsuarioAdmin[] = [];
let produtos: Produto[] = [];
let movimentos: Movimento[] = [];
let nextUsuarioId = 3;
let nextProdutoId = 25;
let nextMovimentoId = 100;

function inicializarDados() {
  if (initialized) return;
  initialized = true;

  const agora = new Date().toISOString();

  // Usuários padrão
  usuarios = [
    {
      id: 1,
      nome: 'Administrador da Loja',
      email: 'admin@resenha.dev',
      perfil: 'ADMINISTRADOR',
      ativo: true,
      criadoEm: agora,
      atualizadoEm: agora,
    },
    {
      id: 2,
      nome: 'Operador de Caixa',
      email: 'operador@resenha.dev',
      perfil: 'OPERADOR',
      ativo: true,
      criadoEm: agora,
      atualizadoEm: agora,
    },
  ];

  // Cenários reais: Varejo, Farmácia e Alimentício (conforme CenarioDemo.java)
  const itensIniciais: Array<{
    id: number;
    codigo: string;
    nome: string;
    descricao: string | null;
    unidade: string;
    minimo: number;
    entradas: Array<{ qtd: number; motivo: string; obs?: string }>;
    saidas: Array<{ qtd: number; motivo: string; obs?: string }>;
  }> = [
    // Varejo
    { id: 1, codigo: 'V-001', nome: 'Camiseta básica', descricao: 'Algodão, tamanho M', unidade: 'UN', minimo: 6, entradas: [{ qtd: 18, motivo: 'COMPRA' }], saidas: [{ qtd: 8, motivo: 'VENDA' }] },
    { id: 2, codigo: 'V-002', nome: 'Caderno 10 matérias', descricao: null, unidade: 'UN', minimo: 8, entradas: [{ qtd: 32, motivo: 'COMPRA' }], saidas: [{ qtd: 6, motivo: 'VENDA' }] },
    { id: 3, codigo: 'V-003', nome: 'Pilha AA cartela', descricao: 'Cartela com 4 unidades', unidade: 'CX', minimo: 5, entradas: [{ qtd: 14, motivo: 'COMPRA' }], saidas: [{ qtd: 10, motivo: 'VENDA' }] },
    { id: 4, codigo: 'V-004', nome: 'Caneta esferográfica azul', descricao: 'Caixa com 50', unidade: 'CX', minimo: 4, entradas: [{ qtd: 20, motivo: 'COMPRA' }], saidas: [{ qtd: 5, motivo: 'VENDA' }] },
    { id: 5, codigo: 'V-005', nome: 'Fita adesiva transparente', descricao: null, unidade: 'UN', minimo: 10, entradas: [{ qtd: 24, motivo: 'COMPRA' }], saidas: [{ qtd: 24, motivo: 'VENDA' }] },
    { id: 6, codigo: 'V-006', nome: 'Mochila escolar', descricao: null, unidade: 'UN', minimo: 3, entradas: [{ qtd: 8, motivo: 'COMPRA' }, { qtd: 1, motivo: 'DEVOLUCAO_CLIENTE', obs: 'Troca de tamanho' }], saidas: [{ qtd: 2, motivo: 'VENDA' }] },
    { id: 7, codigo: 'V-007', nome: 'Garrafa térmica 500 ml', descricao: null, unidade: 'UN', minimo: 4, entradas: [{ qtd: 9, motivo: 'COMPRA' }], saidas: [{ qtd: 1, motivo: 'PERDA', obs: 'Avaria no transporte' }] },
    { id: 8, codigo: 'V-008', nome: 'Papel A4 resma', descricao: '500 folhas', unidade: 'PCT', minimo: 6, entradas: [{ qtd: 15, motivo: 'COMPRA' }], saidas: [{ qtd: 1, motivo: 'CONSUMO_INTERNO', obs: 'Uso no caixa' }] },

    // Farmácia
    { id: 9, codigo: 'F-001', nome: 'Dipirona 500 mg caixa com 10', descricao: null, unidade: 'CX', minimo: 8, entradas: [{ qtd: 24, motivo: 'COMPRA' }], saidas: [{ qtd: 9, motivo: 'VENDA' }] },
    { id: 10, codigo: 'F-002', nome: 'Álcool 70% 1 litro', descricao: null, unidade: 'UN', minimo: 5, entradas: [{ qtd: 16, motivo: 'COMPRA' }], saidas: [{ qtd: 12, motivo: 'VENDA' }] },
    { id: 11, codigo: 'F-003', nome: 'Soro fisiológico 500 ml', descricao: null, unidade: 'UN', minimo: 10, entradas: [{ qtd: 30, motivo: 'COMPRA' }], saidas: [{ qtd: 6, motivo: 'VENDA' }] },
    { id: 12, codigo: 'F-004', nome: 'Paracetamol 750 mg caixa com 20', descricao: null, unidade: 'CX', minimo: 6, entradas: [{ qtd: 18, motivo: 'COMPRA' }], saidas: [{ qtd: 7, motivo: 'VENDA' }] },
    { id: 13, codigo: 'F-005', nome: 'Protetor solar FPS 50', descricao: 'Frasco 120 ml', unidade: 'UN', minimo: 4, entradas: [{ qtd: 10, motivo: 'COMPRA' }], saidas: [{ qtd: 10, motivo: 'VENDA' }] },
    { id: 14, codigo: 'F-006', nome: 'Fralda infantil M', descricao: null, unidade: 'PCT', minimo: 5, entradas: [{ qtd: 12, motivo: 'COMPRA' }], saidas: [{ qtd: 4, motivo: 'VENDA' }] },
    { id: 15, codigo: 'F-007', nome: 'Termômetro digital', descricao: null, unidade: 'UN', minimo: 2, entradas: [{ qtd: 6, motivo: 'COMPRA' }], saidas: [{ qtd: 1, motivo: 'DEVOLUCAO_FORNECEDOR', obs: 'Defeito de fábrica' }] },
    { id: 16, codigo: 'F-008', nome: 'Gaze estéril', descricao: null, unidade: 'PCT', minimo: 10, entradas: [{ qtd: 40, motivo: 'COMPRA' }], saidas: [{ qtd: 2, motivo: 'CONSUMO_INTERNO', obs: 'Sala de curativos' }] },

    // Alimentício
    { id: 17, codigo: 'A-001', nome: 'Farinha de trigo', descricao: null, unidade: 'KG', minimo: 4, entradas: [{ qtd: 12.5, motivo: 'COMPRA' }], saidas: [{ qtd: 3.75, motivo: 'VENDA' }] },
    { id: 18, codigo: 'A-002', nome: 'Leite integral', descricao: null, unidade: 'L', minimo: 8, entradas: [{ qtd: 20, motivo: 'COMPRA' }], saidas: [{ qtd: 14, motivo: 'VENDA' }] },
    { id: 19, codigo: 'A-003', nome: 'Ovos bandeja 30', descricao: null, unidade: 'PCT', minimo: 3, entradas: [{ qtd: 9, motivo: 'COMPRA' }], saidas: [{ qtd: 9, motivo: 'VENDA' }] },
    { id: 20, codigo: 'A-004', nome: 'Queijo muçarela', descricao: 'Vendido fatiado', unidade: 'KG', minimo: 2, entradas: [{ qtd: 5.2, motivo: 'COMPRA' }], saidas: [{ qtd: 1.35, motivo: 'VENDA' }] },
    { id: 21, codigo: 'A-005', nome: 'Café torrado 500 g', descricao: null, unidade: 'PCT', minimo: 6, entradas: [{ qtd: 24, motivo: 'COMPRA' }], saidas: [{ qtd: 8, motivo: 'VENDA' }] },
    { id: 22, codigo: 'A-006', nome: 'Açúcar cristal', descricao: null, unidade: 'KG', minimo: 10, entradas: [{ qtd: 30, motivo: 'COMPRA' }], saidas: [{ qtd: 2.5, motivo: 'CONSUMO_INTERNO', obs: 'Uso na cozinha' }] },
    { id: 23, codigo: 'A-007', nome: 'Óleo de soja 900 ml', descricao: null, unidade: 'UN', minimo: 6, entradas: [{ qtd: 18, motivo: 'COMPRA' }], saidas: [{ qtd: 1, motivo: 'PERDA', obs: 'Embalagem furada' }, { qtd: 5, motivo: 'VENDA' }] },
    { id: 24, codigo: 'A-008', nome: 'Banana prata', descricao: null, unidade: 'KG', minimo: 3, entradas: [{ qtd: 8.4, motivo: 'COMPRA' }], saidas: [{ qtd: 1.2, motivo: 'PERDA', obs: 'Madura demais' }, { qtd: 4, motivo: 'VENDA' }] },
  ];

  produtos = [];
  movimentos = [];

  let mId = 1;
  for (const item of itensIniciais) {
    let saldo = 0;
    for (const ent of item.entradas) {
      saldo += ent.qtd;
      movimentos.push({
        id: mId++,
        produtoId: item.id,
        produtoNome: item.nome,
        produtoCodigo: item.codigo,
        tipo: 'ENTRADA',
        quantidade: ent.qtd,
        saldoApos: saldo,
        motivo: ent.motivo,
        observacao: ent.obs || 'Estoque inicial da demonstração',
        usuarioId: 1,
        usuarioNome: 'Administrador da Loja',
        criadoEm: agora,
      });
    }
    for (const sai of item.saidas) {
      saldo -= sai.qtd;
      movimentos.push({
        id: mId++,
        produtoId: item.id,
        produtoNome: item.nome,
        produtoCodigo: item.codigo,
        tipo: 'SAIDA',
        quantidade: sai.qtd,
        saldoApos: saldo,
        motivo: sai.motivo,
        observacao: sai.obs || null,
        usuarioId: 1,
        usuarioNome: 'Administrador da Loja',
        criadoEm: agora,
      });
    }

    produtos.push({
      id: item.id,
      codigo: item.codigo,
      nome: item.nome,
      descricao: item.descricao,
      unidadeMedida: item.unidade,
      estoqueMinimo: item.minimo,
      saldoAtual: Number(saldo.toFixed(2)),
      abaixoDoMinimo: saldo <= item.minimo,
      ativo: true,
      atualizadoEm: agora,
    });
  }
}

// Helper to read JSON body
function lerCorpo(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function responderJson(res: ServerResponse, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  inicializarDados();

  const url = new URL(req.url || '/', 'http://localhost');
  // Se veio por query param path (ex: /api/server?path=auth/login) ou diretamente na pathname
  let path = url.searchParams.get('path') || url.pathname;
  path = path.replace(/^\/?api\/v1\/?/, '').replace(/^\/?api\/?/, '');
  if (!path.startsWith('/')) path = '/' + path;

  // 1. Auth: Login
  if (path === '/auth/login' && req.method === 'POST') {
    const { email, senha } = await lerCorpo(req);
    const usuario = usuarios.find((u) => u.email.toLowerCase() === (email || '').toLowerCase() && u.ativo);
    
    // Senhas válidas da demo: admin123 ou operador123
    const senhaValida =
      (usuario?.perfil === 'ADMINISTRADOR' && senha === 'admin123') ||
      (usuario?.perfil === 'OPERADOR' && senha === 'operador123');

    if (!usuario || !senhaValida) {
      return responderJson(res, 401, {
        mensagem: 'E-mail ou senha incorretos.',
        codigo: 'CREDENCIAIS_INVALIDAS',
      });
    }

    return responderJson(res, 200, {
      token: `demo-jwt-token-${usuario.id}-${Date.now()}`,
      expiraEm: 86400,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
    });
  }

  // 2. Auth: Me
  if (path === '/auth/me' && req.method === 'GET') {
    const authHeader = req.headers.authorization || '';
    const id = authHeader.includes('token-2-') ? 2 : 1;
    const usuario = usuarios.find((u) => u.id === id) || usuarios[0];
    return responderJson(res, 200, {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    });
  }

  // 3. Auth: Troca de senha
  if (path === '/auth/senha' && req.method === 'PUT') {
    return responderJson(res, 200, { ok: true });
  }

  // 4. Produtos: Listagem
  if (path === '/produtos' && req.method === 'GET') {
    const busca = (url.searchParams.get('busca') || '').toLowerCase().trim();
    const abaixo = url.searchParams.get('abaixoDoMinimo');
    const ativo = url.searchParams.get('ativo');

    let filtrados = [...produtos];
    if (busca) {
      filtrados = filtrados.filter(
        (p) => p.nome.toLowerCase().includes(busca) || p.codigo.toLowerCase().includes(busca)
      );
    }
    if (abaixo === 'true') {
      filtrados = filtrados.filter((p) => p.saldoAtual <= p.estoqueMinimo && p.estoqueMinimo > 0);
    }
    if (ativo !== null && ativo !== undefined && ativo !== '') {
      const isAtivo = ativo === 'true';
      filtrados = filtrados.filter((p) => p.ativo === isAtivo);
    }

    return responderJson(res, 200, filtrados);
  }

  // 5. Produtos: Detalhe por ID
  const produtoMatch = path.match(/^\/produtos\/(\d+)$/);
  if (produtoMatch && req.method === 'GET') {
    const pId = Number(produtoMatch[1]);
    const prod = produtos.find((p) => p.id === pId);
    if (!prod) return responderJson(res, 404, { mensagem: 'Produto não encontrado.' });
    return responderJson(res, 200, prod);
  }

  // 6. Produtos: Cadastro
  if (path === '/produtos' && req.method === 'POST') {
    const dados = await lerCorpo(req);
    const novo: Produto = {
      id: nextProdutoId++,
      codigo: dados.codigo,
      nome: dados.nome,
      descricao: dados.descricao || null,
      unidadeMedida: dados.unidadeMedida,
      estoqueMinimo: Number(dados.estoqueMinimo) || 0,
      saldoAtual: 0,
      abaixoDoMinimo: true,
      ativo: true,
      atualizadoEm: new Date().toISOString(),
    };
    produtos.unshift(novo);
    return responderJson(res, 201, novo);
  }

  // 7. Produtos: Edição
  if (produtoMatch && req.method === 'PUT') {
    const pId = Number(produtoMatch[1]);
    const prod = produtos.find((p) => p.id === pId);
    if (!prod) return responderJson(res, 404, { mensagem: 'Produto não encontrado.' });
    const dados = await lerCorpo(req);
    prod.nome = dados.nome;
    prod.descricao = dados.descricao || null;
    prod.unidadeMedida = dados.unidadeMedida;
    prod.estoqueMinimo = Number(dados.estoqueMinimo) || 0;
    prod.abaixoDoMinimo = prod.saldoAtual <= prod.estoqueMinimo;
    prod.atualizadoEm = new Date().toISOString();
    return responderJson(res, 200, prod);
  }

  // 8. Produtos: Inativar / Reativar
  const inativarMatch = path.match(/^\/produtos\/(\d+)\/inativar$/);
  if (inativarMatch && req.method === 'PATCH') {
    const prod = produtos.find((p) => p.id === Number(inativarMatch[1]));
    if (!prod) return responderJson(res, 404, { mensagem: 'Produto não encontrado.' });
    prod.ativo = false;
    prod.atualizadoEm = new Date().toISOString();
    return responderJson(res, 200, prod);
  }

  const reativarMatch = path.match(/^\/produtos\/(\d+)\/reativar$/);
  if (reativarMatch && req.method === 'PATCH') {
    const prod = produtos.find((p) => p.id === Number(reativarMatch[1]));
    if (!prod) return responderJson(res, 404, { mensagem: 'Produto não encontrado.' });
    prod.ativo = true;
    prod.atualizadoEm = new Date().toISOString();
    return responderJson(res, 200, prod);
  }

  // 9. Movimentações: Listagem Paginada
  if (path === '/movimentacoes' && req.method === 'GET') {
    const produtoId = url.searchParams.get('produtoId');
    const tipo = url.searchParams.get('tipo');
    const page = Math.max(0, Number(url.searchParams.get('page')) || 0);
    const size = Math.min(100, Math.max(1, Number(url.searchParams.get('size')) || 20));

    let lista = [...movimentos].reverse(); // Mais recentes primeiro
    if (produtoId) {
      lista = lista.filter((m) => m.produtoId === Number(produtoId));
    }
    if (tipo) {
      lista = lista.filter((m) => m.tipo === tipo);
    }

    const totalElements = lista.length;
    const totalPages = Math.ceil(totalElements / size);
    const content = lista.slice(page * size, (page + 1) * size);

    return responderJson(res, 200, {
      content,
      page,
      size,
      totalElements,
      totalPages,
    });
  }

  // 10. Movimentações: Registro
  if (path === '/movimentacoes' && req.method === 'POST') {
    const dados = await lerCorpo(req);
    const prod = produtos.find((p) => p.id === Number(dados.produtoId));
    if (!prod) return responderJson(res, 404, { mensagem: 'Produto não encontrado.' });

    const qtd = Number(dados.quantidade);
    if (!qtd || qtd <= 0) {
      return responderJson(res, 400, { mensagem: 'Quantidade deve ser maior que zero.' });
    }

    if (dados.tipo === 'SAIDA' && qtd > prod.saldoAtual) {
      return responderJson(res, 400, {
        mensagem: `Saldo insuficiente. Saldo atual é de ${prod.saldoAtual} ${prod.unidadeMedida}.`,
        codigo: 'SALDO_INSUFICIENTE',
      });
    }

    const novoSaldo = dados.tipo === 'ENTRADA' ? prod.saldoAtual + qtd : prod.saldoAtual - qtd;
    prod.saldoAtual = Number(novoSaldo.toFixed(2));
    prod.abaixoDoMinimo = prod.saldoAtual <= prod.estoqueMinimo;
    prod.atualizadoEm = new Date().toISOString();

    const novoMovimento: Movimento = {
      id: nextMovimentoId++,
      produtoId: prod.id,
      produtoNome: prod.nome,
      produtoCodigo: prod.codigo,
      tipo: dados.tipo,
      quantidade: qtd,
      saldoApos: prod.saldoAtual,
      motivo: dados.motivo,
      observacao: dados.observacao || null,
      usuarioId: 1,
      usuarioNome: 'Administrador da Loja',
      criadoEm: new Date().toISOString(),
    };

    movimentos.push(novoMovimento);
    return responderJson(res, 201, novoMovimento);
  }

  // 11. Movimentações: Conciliação
  const conciliarMatch = path.match(/^\/movimentacoes\/conciliar\/(\d+)$/);
  if (conciliarMatch && req.method === 'GET') {
    const pId = Number(conciliarMatch[1]);
    const prod = produtos.find((p) => p.id === pId);
    if (!prod) return responderJson(res, 404, { mensagem: 'Produto não encontrado.' });

    const saldoCalculado = movimentos
      .filter((m) => m.produtoId === pId)
      .reduce((acc, m) => (m.tipo === 'ENTRADA' ? acc + m.quantidade : acc - m.quantidade), 0);

    return responderJson(res, 200, {
      produtoId: pId,
      saldoArmazenado: prod.saldoAtual,
      saldoLedger: Number(saldoCalculado.toFixed(2)),
      consistente: Math.abs(prod.saldoAtual - saldoCalculado) < 0.001,
    });
  }

  // 12. Usuários: Listagem
  if (path === '/usuarios' && req.method === 'GET') {
    return responderJson(res, 200, usuarios);
  }

  // 13. Usuários: Cadastro
  if (path === '/usuarios' && req.method === 'POST') {
    const dados = await lerCorpo(req);
    const novoUsuario: UsuarioAdmin = {
      id: nextUsuarioId++,
      nome: dados.nome,
      email: dados.email,
      perfil: dados.perfil,
      ativo: true,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
    usuarios.push(novoUsuario);
    return responderJson(res, 201, novoUsuario);
  }

  // 14. Usuários: Edição
  const usuarioMatch = path.match(/^\/usuarios\/(\d+)$/);
  if (usuarioMatch && req.method === 'PUT') {
    const uId = Number(usuarioMatch[1]);
    const u = usuarios.find((item) => item.id === uId);
    if (!u) return responderJson(res, 404, { mensagem: 'Usuário não encontrado.' });
    const dados = await lerCorpo(req);
    u.nome = dados.nome;
    u.perfil = dados.perfil;
    u.atualizadoEm = new Date().toISOString();
    return responderJson(res, 200, u);
  }

  // 15. Usuários: Inativar / Reativar
  const inativarUsuarioMatch = path.match(/^\/usuarios\/(\d+)\/inativar$/);
  if (inativarUsuarioMatch && req.method === 'PATCH') {
    const u = usuarios.find((item) => item.id === Number(inativarUsuarioMatch[1]));
    if (!u) return responderJson(res, 404, { mensagem: 'Usuário não encontrado.' });
    u.ativo = false;
    u.atualizadoEm = new Date().toISOString();
    return responderJson(res, 200, u);
  }

  const reativarUsuarioMatch = path.match(/^\/usuarios\/(\d+)\/reativar$/);
  if (reativarUsuarioMatch && req.method === 'PATCH') {
    const u = usuarios.find((item) => item.id === Number(reativarUsuarioMatch[1]));
    if (!u) return responderJson(res, 404, { mensagem: 'Usuário não encontrado.' });
    u.ativo = true;
    u.atualizadoEm = new Date().toISOString();
    return responderJson(res, 200, u);
  }

  return responderJson(res, 404, { mensagem: `Rota não encontrada: ${req.method} ${path}` });
}
