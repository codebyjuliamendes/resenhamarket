import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Box, History, Plus, Search, X } from 'lucide-react';
import { api, query, type Movimento, type Produto } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { MovementModal } from '../components/MovementModal';
import { ProductModal } from '../components/ProductModal';
import { useToast } from '../components/Toast';
import { formatQty, levelPercent, stockBadge, stockLabel, stockState, todayLabel, type StockState } from '../lib/format';
import { useDebounced } from '../lib/useDebounced';

type ModalState = null | { kind: 'product' } | { kind: 'movement'; product: Produto; tipo: Movimento['tipo'] };
type View = 'todos' | 'baixo' | 'zerado' | 'inativos';

export function movementToast(m: Movimento, unit: string) {
  return `${m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'} de ${formatQty(m.quantidade)} ${unit} registrada. Saldo: ${formatQty(m.saldoApos)} ${unit}.`;
}

export function StockBadge({ state }: { state: StockState }) {
  return <span className={`badge dot ${stockBadge[state]}`}>{stockLabel[state]}</span>;
}

export function LevelBar({ product }: { product: Produto }) {
  const state = stockState(product);
  const width = state === 'out' ? 0 : Math.max(6, levelPercent(product.saldoAtual, product.estoqueMinimo));
  return (
    <span className="level">
      <span className={`level-track ${state}`} aria-hidden><span style={{ width: `${width}%` }} /></span>
      <small>{product.estoqueMinimo > 0 ? `mínimo ${formatQty(product.estoqueMinimo)} ${product.unidadeMedida}` : 'sem mínimo definido'}</small>
    </span>
  );
}

export function InventoryPage() {
  const { user } = useAuth();
  const canManage = user?.perfil === 'ADMINISTRADOR';
  const qc = useQueryClient();
  const notify = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('busca') ?? '');
  const requested = (params.get('filtro') ?? 'todos') as View;
  const view: View = ['baixo', 'zerado'].includes(requested) || (requested === 'inativos' && canManage) ? requested : 'todos';
  const inactive = view === 'inativos';
  const [modal, setModal] = useState<ModalState>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const term = useDebounced(search.trim());

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };
  useEffect(() => {
    setParams((current) => {
      if ((current.get('busca') ?? '') === term) return current;
      const next = new URLSearchParams(current);
      if (term) next.set('busca', term); else next.delete('busca');
      return next;
    }, { replace: true });
  }, [term, setParams]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && !document.body.classList.contains('modal-open')) { e.preventDefault(); searchRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const active = useQuery({
    queryKey: ['products', term, 'ativos'],
    queryFn: () => api<Produto[]>(`/produtos${query({ busca: term, ativo: true })}`),
    placeholderData: (previous) => previous,
  });
  const inactiveList = useQuery({
    queryKey: ['products', term, 'inativos'],
    queryFn: () => api<Produto[]>(`/produtos${query({ busca: term, ativo: false })}`),
    enabled: canManage,
    placeholderData: (previous) => previous,
  });

  const activeList = active.data ?? [];
  const counts = {
    todos: activeList.length,
    baixo: activeList.filter((p) => stockState(p) === 'low').length,
    zerado: activeList.filter((p) => stockState(p) === 'out').length,
    inativos: inactiveList.data?.length ?? 0,
  };
  const source = inactive ? inactiveList : active;
  const list = inactive ? (inactiveList.data ?? [])
    : view === 'baixo' ? activeList.filter((p) => stockState(p) === 'low')
    : view === 'zerado' ? activeList.filter((p) => stockState(p) === 'out')
    : activeList;
  const filtered = Boolean(term || view !== 'todos');
  const columns = inactive ? 4 : 5;

  const tabs: { id: View; label: string; tone?: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'baixo', label: 'Abaixo do mínimo', tone: 'amber' },
    { id: 'zerado', label: 'Sem estoque', tone: 'rust' },
    ...(canManage ? [{ id: 'inativos' as View, label: 'Inativos' }] : []),
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{todayLabel()}</span>
          <h1>Estoque</h1>
        </div>
        <div className="heading-actions">
          <Link className="secondary" to="/historico"><History size={16} aria-hidden /> Ver histórico</Link>
          {canManage && <button className="primary" onClick={() => setModal({ kind: 'product' })}><Plus size={17} aria-hidden /> Novo produto</button>}
        </div>
      </div>

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="Filtrar por situação">
          {tabs.map((tab) => (
            <button key={tab.id} role="tab" aria-selected={view === tab.id} onClick={() => setParam('filtro', tab.id === 'todos' ? null : tab.id)}>
              {tab.label}
              {(tab.id === 'todos' || counts[tab.id] > 0) && <span className={`count ${tab.tone && counts[tab.id] > 0 ? tab.tone : ''}`}>{counts[tab.id]}</span>}
            </button>
          ))}
        </div>
        <label className="search-box">
          <Search size={17} aria-hidden />
          <span className="sr-only">Buscar produtos por nome ou código</span>
          <input ref={searchRef} type="search" placeholder="Buscar por nome ou código" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search ? <button className="clear-search" onClick={() => { setSearch(''); searchRef.current?.focus(); }} aria-label="Limpar busca"><X size={14} /></button> : <kbd title="Atalho: tecle / para buscar">/</kbd>}
        </label>
      </div>

      <section className="table-card" aria-label="Produtos">
        <div className="table-scroll">
          <table className="responsive-table">
            <thead>
              <tr>
                <th scope="col">Produto</th>
                <th scope="col" className="num">Disponível</th>
                {!inactive && <th scope="col">Nível</th>}
                <th scope="col">Situação</th>
                {!inactive && <th scope="col" className="actions-head">Movimentar</th>}
              </tr>
            </thead>
            <tbody>
              {source.isLoading ? (
                <tr><td colSpan={columns} className="table-state">Carregando produtos…</td></tr>
              ) : source.isError ? (
                <tr><td colSpan={columns} className="table-state error-state">{source.error.message} <button onClick={() => source.refetch()}>Tentar novamente</button></td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={columns} className="table-state">
                  <div className="empty-box">
                    <span className="empty-icon"><Box size={22} /></span>
                    <strong>{inactive ? 'Nenhum produto inativo' : view === 'baixo' ? 'Nada abaixo do mínimo' : view === 'zerado' ? 'Nenhum produto zerado' : term ? 'Nenhum produto encontrado' : 'Seu estoque começa aqui'}</strong>
                    <p>{inactive ? 'Produtos inativados aparecem aqui e podem ser reativados.' : view !== 'todos' ? 'Tudo certo por aqui.' : term ? 'Tente outro nome ou código.' : 'Cadastre um produto para começar a acompanhar as quantidades.'}</p>
                    {canManage && !filtered && <button className="primary" onClick={() => setModal({ kind: 'product' })}>Cadastrar primeiro produto</button>}
                  </div>
                </td></tr>
              ) : list.map((p) => {
                const state = stockState(p);
                return (
                  <tr key={p.id} className={inactive ? 'row-inactive' : ''}>
                    <td>
                      <span className="product-cell">
                        <span className="initial" aria-hidden>{p.nome.slice(0, 1).toUpperCase()}</span>
                        <span>
                          <Link className="product-link" to={`/produtos/${p.id}`}>{p.nome}</Link>
                          <span className="code">{p.codigo}</span>
                        </span>
                      </span>
                    </td>
                    <td data-label="Disponível" className="num"><span className={`quantity ${inactive ? '' : state}`}>{formatQty(p.saldoAtual)}<small>{p.unidadeMedida}</small></span></td>
                    {!inactive && <td data-label="Nível"><LevelBar product={p} /></td>}
                    <td data-label="Situação">{inactive ? <span className="badge muted">Inativo</span> : <StockBadge state={state} />}</td>
                    {!inactive && (
                      <td className="row-actions-cell">
                        <div className="row-actions">
                          <button className="movement-in" onClick={() => setModal({ kind: 'movement', product: p, tipo: 'ENTRADA' })} aria-label={`Registrar entrada de ${p.nome}`}><ArrowDownLeft size={15} aria-hidden /> Entrada</button>
                          <button className="movement-out" onClick={() => setModal({ kind: 'movement', product: p, tipo: 'SAIDA' })} aria-label={`Registrar saída de ${p.nome}`} disabled={p.saldoAtual <= 0} title={p.saldoAtual <= 0 ? 'Sem saldo para saída' : undefined}><ArrowUpRight size={15} aria-hidden /> Saída</button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="table-foot">
          <span><span className="live-dot" /> Saldo atualizado a cada movimentação</span>
          <span aria-live="polite">{source.isLoading ? 'Buscando…' : `${list.length} ${list.length === 1 ? 'produto' : 'produtos'}${inactive ? ' inativos' : ''}`}</span>
        </div>
      </section>

      {modal?.kind === 'product' && (
        <ProductModal onClose={() => setModal(null)} onSaved={(p) => { setModal(null); qc.invalidateQueries({ queryKey: ['products'] }); notify('Produto cadastrado. Registre a primeira entrada.'); navigate(`/produtos/${p.id}`); }} />
      )}
      {modal?.kind === 'movement' && (
        <MovementModal product={modal.product} type={modal.tipo} onClose={() => setModal(null)} onSaved={(m) => {
          setModal(null);
          qc.invalidateQueries({ queryKey: ['products'] });
          qc.invalidateQueries({ queryKey: ['product', modal.product.id] });
          qc.invalidateQueries({ queryKey: ['movements'] });
          notify(movementToast(m, modal.product.unidadeMedida));
        }} />
      )}
    </>
  );
}
