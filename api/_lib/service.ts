import { hashPassword, verifyPassword } from './auth';
import {
  abaixoDoMinimo,
  emailValido,
  formatarQuantidade,
  hasAtMostThreeDecimals,
  isMotivo,
  isPerfil,
  isTipo,
  motivoAceita,
  normalizarCodigo,
  normalizarEmail,
  somar,
  toMilli,
  unidadeInteira,
  type TipoMovimento,
} from './domain';
import { HttpError } from './http';
import { toUsuarioAdmin, type Movimento, type Produto, type Store, type UsuarioAdmin, type UsuarioRegistro } from './store';
import { Validator } from './validation';

const produtoNaoEncontrado = () => new HttpError(404, 'PRODUTO_NAO_ENCONTRADO', 'Produto não encontrado.');
const usuarioNaoEncontrado = () => new HttpError(404, 'USUARIO_NAO_ENCONTRADO', 'Usuário não encontrado.');
const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

/** Business operations of the demo API. Rules and error codes follow the Spring services. */
export class DemoService {
  constructor(private readonly store: Store, private readonly clock: () => Date = () => new Date()) {}

  private now(): string {
    return this.clock().toISOString();
  }

  // ---------- Usuários e autenticação ----------

  findUser(id: number): UsuarioRegistro | undefined {
    return this.store.usuarios.find((u) => u.id === id);
  }

  /** Returns the active user whose password matches, or null. Always runs one hash comparison. */
  authenticate(email: string, senha: string, dummyHash: string): UsuarioRegistro | null {
    const user = this.store.usuarios.find((u) => u.email === normalizarEmail(email));
    const ok = verifyPassword(senha, user?.senhaHash ?? dummyHash);
    return user && user.ativo && ok ? user : null;
  }

  changeOwnPassword(userId: number, body: unknown): void {
    const v = new Validator(body);
    const atual = v.string('senhaAtual', { max: 200, trim: false });
    const nova = v.string('novaSenha', { min: 8, max: 72, trim: false });
    v.done();
    const user = this.findUser(userId);
    if (!user) throw usuarioNaoEncontrado();
    if (!verifyPassword(atual!, user.senhaHash)) throw new HttpError(422, 'SENHA_ATUAL_INCORRETA', 'A senha atual não confere.');
    user.senhaHash = hashPassword(nova!);
    user.atualizadoEm = this.now();
  }

  listUsers(): UsuarioAdmin[] {
    return [...this.store.usuarios].sort((a, b) => collator.compare(a.nome, b.nome)).map(toUsuarioAdmin);
  }

  private readUser(body: unknown, creating: boolean) {
    const v = new Validator(body);
    const nome = v.string('nome', { min: 2, max: 120 });
    const email = v.string('email', { max: 160 });
    if (email && !emailValido(email)) v.fail('email', 'Informe um e-mail válido.');
    const perfil = v.oneOf('perfil', isPerfil);
    const senha = v.string('senha', { min: 8, max: 72, optional: true, trim: false });
    v.done();
    if (creating && !senha) throw new HttpError(400, 'SENHA_OBRIGATORIA', 'Defina uma senha inicial com pelo menos 8 caracteres.');
    return { nome: nome!, email: normalizarEmail(email!), perfil: perfil!, senha };
  }

  private ensureUniqueEmail(email: string, id: number | null): void {
    if (this.store.usuarios.some((u) => u.email === email && u.id !== id)) {
      throw new HttpError(409, 'EMAIL_DUPLICADO', 'Este e-mail já está em uso.');
    }
  }

  private ensureAnotherAdmin(user: UsuarioRegistro): void {
    const activeAdmins = this.store.usuarios.filter((u) => u.perfil === 'ADMINISTRADOR' && u.ativo).length;
    if (user.ativo && activeAdmins <= 1) throw new HttpError(422, 'ULTIMO_ADMINISTRADOR', 'É preciso manter pelo menos um administrador ativo.');
  }

  createUser(body: unknown): UsuarioAdmin {
    const input = this.readUser(body, true);
    this.ensureUniqueEmail(input.email, null);
    const agora = this.now();
    const user: UsuarioRegistro = {
      id: this.store.nextUsuarioId++,
      nome: input.nome,
      email: input.email,
      perfil: input.perfil,
      ativo: true,
      criadoEm: agora,
      atualizadoEm: agora,
      senhaHash: hashPassword(input.senha!),
    };
    this.store.usuarios.push(user);
    return toUsuarioAdmin(user);
  }

  updateUser(id: number, body: unknown, requesterId: number): UsuarioAdmin {
    const user = this.findUser(id);
    if (!user) throw usuarioNaoEncontrado();
    const input = this.readUser(body, false);
    this.ensureUniqueEmail(input.email, id);
    if (user.perfil === 'ADMINISTRADOR' && input.perfil !== 'ADMINISTRADOR') {
      if (id === requesterId) throw new HttpError(422, 'AUTO_REBAIXAMENTO', 'Você não pode remover o seu próprio perfil de administrador.');
      this.ensureAnotherAdmin(user);
    }
    user.nome = input.nome;
    user.email = input.email;
    user.perfil = input.perfil;
    if (input.senha) user.senhaHash = hashPassword(input.senha);
    user.atualizadoEm = this.now();
    return toUsuarioAdmin(user);
  }

  deactivateUser(id: number, requesterId: number): UsuarioAdmin {
    const user = this.findUser(id);
    if (!user) throw usuarioNaoEncontrado();
    if (id === requesterId) throw new HttpError(422, 'AUTO_INATIVACAO', 'Você não pode inativar a sua própria conta.');
    if (user.perfil === 'ADMINISTRADOR') this.ensureAnotherAdmin(user);
    user.ativo = false;
    user.atualizadoEm = this.now();
    return toUsuarioAdmin(user);
  }

  reactivateUser(id: number): UsuarioAdmin {
    const user = this.findUser(id);
    if (!user) throw usuarioNaoEncontrado();
    user.ativo = true;
    user.atualizadoEm = this.now();
    return toUsuarioAdmin(user);
  }

  // ---------- Produtos ----------

  listProducts(filters: { busca?: string | null; ativo?: boolean | null; abaixoDoMinimo?: boolean }): Produto[] {
    const busca = (filters.busca ?? '').trim().toLowerCase();
    return this.store.produtos
      .filter((p) => filters.ativo === null || filters.ativo === undefined || p.ativo === filters.ativo)
      .filter((p) => !busca || p.nome.toLowerCase().includes(busca) || p.codigo.toLowerCase().includes(busca))
      .filter((p) => !filters.abaixoDoMinimo || p.abaixoDoMinimo)
      .sort((a, b) => collator.compare(a.nome, b.nome))
      .map((p) => ({ ...p }));
  }

  getProduct(id: number): Produto {
    const p = this.store.produtos.find((x) => x.id === id);
    if (!p) throw produtoNaoEncontrado();
    return p;
  }

  private readProduct(body: unknown) {
    const v = new Validator(body);
    const codigo = v.string('codigo', { max: 40 });
    const nome = v.string('nome', { max: 150 });
    const descricao = v.string('descricao', { max: 500, optional: true });
    const unidade = v.string('unidadeMedida', { max: 10 });
    const minimo = v.number('estoqueMinimo', { min: 0, optional: true });
    if (minimo !== null && !hasAtMostThreeDecimals(minimo)) v.fail('estoqueMinimo', 'Use no máximo 3 casas decimais.');
    v.done();
    return { codigo: codigo!, nome: nome!, descricao, unidadeMedida: unidade!.toUpperCase(), estoqueMinimo: minimo ?? 0 };
  }

  private ensureUniqueCode(codigo: string, id: number | null): void {
    const normalized = normalizarCodigo(codigo);
    if (this.store.produtos.some((p) => normalizarCodigo(p.codigo) === normalized && p.id !== id)) {
      throw new HttpError(409, 'CODIGO_DUPLICADO', 'Este código já está em uso.');
    }
  }

  createProduct(body: unknown): Produto {
    const input = this.readProduct(body);
    this.ensureUniqueCode(input.codigo, null);
    const product: Produto = {
      id: this.store.nextProdutoId++,
      ...input,
      saldoAtual: 0,
      abaixoDoMinimo: abaixoDoMinimo(0, input.estoqueMinimo),
      ativo: true,
      atualizadoEm: this.now(),
    };
    this.store.produtos.push(product);
    return { ...product };
  }

  updateProduct(id: number, body: unknown): Produto {
    const product = this.getProduct(id);
    const input = this.readProduct(body);
    this.ensureUniqueCode(input.codigo, id);
    Object.assign(product, input, { abaixoDoMinimo: abaixoDoMinimo(product.saldoAtual, input.estoqueMinimo), atualizadoEm: this.now() });
    return { ...product };
  }

  setProductActive(id: number, ativo: boolean): Produto {
    const product = this.getProduct(id);
    product.ativo = ativo;
    product.atualizadoEm = this.now();
    return { ...product };
  }

  reconcile(id: number) {
    const product = this.getProduct(id);
    const milli = this.store.movimentos
      .filter((m) => m.produtoId === id)
      .reduce((acc, m) => acc + (m.tipo === 'ENTRADA' ? toMilli(m.quantidade) : -toMilli(m.quantidade)), 0);
    const saldoCalculado = milli / 1000;
    return { produtoId: id, saldoAtual: product.saldoAtual, saldoCalculado, consistente: toMilli(product.saldoAtual) === milli };
  }

  // ---------- Movimentações ----------

  listMovements(filters: { produtoId?: number | null; tipo?: TipoMovimento | null; de?: Date | null; ate?: Date | null; page: number; size: number }) {
    if (filters.de && filters.ate && filters.de.getTime() >= filters.ate.getTime()) {
      throw new HttpError(400, 'PERIODO_INVALIDO', 'A data inicial precisa ser anterior à data final.');
    }
    const lista = this.store.movimentos
      .filter((m) => !filters.produtoId || m.produtoId === filters.produtoId)
      .filter((m) => !filters.tipo || m.tipo === filters.tipo)
      .filter((m) => !filters.de || Date.parse(m.criadoEm) >= filters.de.getTime())
      .filter((m) => !filters.ate || Date.parse(m.criadoEm) < filters.ate.getTime())
      .sort((a, b) => Date.parse(b.criadoEm) - Date.parse(a.criadoEm) || b.id - a.id);
    const { page, size } = filters;
    return {
      content: lista.slice(page * size, (page + 1) * size),
      page,
      size,
      totalElements: lista.length,
      totalPages: Math.ceil(lista.length / size),
    };
  }

  registerMovement(body: unknown, userId: number): Movimento {
    const v = new Validator(body);
    const produtoId = v.number('produtoId');
    const tipo = v.oneOf('tipo', isTipo);
    const quantidade = v.number('quantidade');
    if (quantidade !== null && quantidade < 0.001) v.fail('quantidade', 'Informe uma quantidade maior que zero.');
    const motivo = v.oneOf('motivo', isMotivo);
    const observacao = v.string('observacao', { max: 255, optional: true });
    v.done();

    const product = this.store.produtos.find((p) => p.id === produtoId);
    if (!product) throw produtoNaoEncontrado();
    if (!product.ativo) throw new HttpError(422, 'PRODUTO_INATIVO', 'Este produto está inativo e não aceita movimentações.');
    if (!hasAtMostThreeDecimals(quantidade!)) throw new HttpError(422, 'QUANTIDADE_INVALIDA', 'Use no máximo 3 casas decimais.');
    if (unidadeInteira(product.unidadeMedida) && !Number.isInteger(quantidade!)) {
      throw new HttpError(422, 'QUANTIDADE_FRACIONARIA', 'Para esta unidade, informe uma quantidade inteira.');
    }
    if (!motivoAceita(motivo!, tipo!)) throw new HttpError(422, 'MOTIVO_INCOMPATIVEL', 'Este motivo não combina com o tipo de movimentação.');
    const saldo = somar(product.saldoAtual, quantidade!, tipo!);
    if (saldo < 0) {
      const u = product.unidadeMedida;
      throw new HttpError(
        422,
        'SALDO_INSUFICIENTE',
        `Saldo insuficiente: disponível ${formatarQuantidade(product.saldoAtual)} ${u}, solicitado ${formatarQuantidade(quantidade!)} ${u}.`,
      );
    }
    const user = this.findUser(userId);
    if (!user) throw new HttpError(401, 'NAO_AUTENTICADO', 'Faça login novamente.');

    const agora = this.now();
    product.saldoAtual = saldo;
    product.abaixoDoMinimo = abaixoDoMinimo(saldo, product.estoqueMinimo);
    product.atualizadoEm = agora;
    const movimento: Movimento = {
      id: this.store.nextMovimentoId++,
      produtoId: product.id,
      produtoNome: product.nome,
      produtoCodigo: product.codigo,
      tipo: tipo!,
      quantidade: quantidade!,
      saldoApos: saldo,
      motivo: motivo!,
      observacao,
      usuarioId: user.id,
      usuarioNome: user.nome,
      criadoEm: agora,
    };
    this.store.movimentos.push(movimento);
    return { ...movimento };
  }
}
