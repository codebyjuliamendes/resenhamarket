import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Box, PackagePlus, Search, SlidersHorizontal, X } from 'lucide-react';
import { api, query, type Movimento, type Produto } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { MovementModal } from '../components/MovementModal';
import { ProductModal } from '../components/ProductModal';
import { useToast } from '../components/Toast';
import { formatQty } from '../lib/format';
import { useDebounced } from '../lib/useDebounced';

type ModalState = null | { kind: 'product' } | { kind: 'movement'; product: Produto; tipo: Movimento['tipo'] };

export function movementToast(m: Movimento, unit: string) {
  return `${m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'} de ${formatQty(m.quantidade)} ${unit} registrada. Saldo: ${formatQty(m.saldoApos)} ${unit}.`;
}

export function InventoryPage() {
  const { user } = useAuth();
  const canManage = user?.perfil === 'ADMINISTRADOR';
  const qc = useQueryClient();
  const notify = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('busca') ?? '');
  const below = params.get('filtro') === 'baixo';
  const inactive = canManage && params.get('status') === 'inativos';
  const [modal, setModal] = useState<ModalState>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const term = useDebounced(search.trim());

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };
  useEffect(() => { if ((params.get('busca') ?? '') !== term) setParam('busca', term || null); }, [term]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && !document.body.classList.contains('modal-open')) { e.preventDefault(); searchRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const products = useQuery({
    queryKey: ['products', term, below, inactive],
    queryFn: () => api<Produto[]>(`/produtos${query({ busca: term, ativo: !inactive, abaixoDoMinimo: below || undefined })}`),
    placeholderData: (previous) => previous,
  });
  const list = products.data ?? [];
  const filtered = Boolean(term || below);

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Visão do dia</span>
          <h1>Seu estoque</h1>
          <p>Veja o que tem disponível e registre entradas ou saídas.</p>
        </div>
        {canManage && <button className="primary" onClick={() => setModal({ kind: 'product' })}><PackagePlus size={17} /> Novo produto</button>}
      </div>

      {canManage && (
        <div className="segmented" role="tablist" aria-label="Situação dos produtos">
          <button role="tab" aria-selected={!inactive} onClick={() => setParam('status', null)}>Ativos</button>
          <button role="tab" aria-selected={inactive} onClick={() => setParam('status', 'inativos')}>Inativos</button>
        </div>
      )}

      <div className="inventory-tools">
        <label className="search-box">
          <Search size={17} aria-hidden />
          <input ref={searchRef} placeholder="Buscar por nome ou código" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar produtos por nome ou código" />
          {search ? <button className="clear-search" onClick={() => { setSearch(''); searchRef.current?.focus(); }} aria-label="Limpar busca"><X size={14} /></button> : <kbd title="Atalho: tecle / para buscar">/</kbd>}
        </label>
        <button className={`filter-button ${below ? 'filter-on' : ''}`} onClick={() => setParam('filtro', below ? null : 'baixo')} aria-pressed={below}>
          <SlidersHorizontal size={16} />Só abaixo do mínimo<span className="switch" aria-hidden><i /></span>
        </button>
        <span className="result-count" aria-live="polite">{products.isLoading ? 'Buscando…' : `${list.length} ${list.length === 1 ? 'produto' : 'produtos'}`}</span>
      </div>

      <section className="table-card">
        <div className="table-scroll">
          <table className="responsive-table">
            <thead>
              <tr><th scope="col">Produto</th><th scope="col">Código</th><th scope="col">Disponível</th><th scope="col">Estoque mínimo</th><th scope="col">Status</th>{!inactive && <th scope="col" className="actions-head">Movimentar</th>}</tr>
            </thead>
            <tbody>
              {products.isLoading ? (
                <tr><td colSpan={6} className="table-state">Carregando produtos…</td></tr>
              ) : products.isError ? (
                <tr><td colSpan={6} className="table-state error-state">{products.error.message} <button onClick={() => products.refetch()}>Tentar novamente</button></td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={6} className="table-state">
                  <div className="empty-box">
                    <span className="empty-icon"><Box size={22} /></span>
                    <strong>{inactive ? 'Nenhum produto inativo' : filtered ? 'Nenhum produto encontrado' : 'Seu estoque começa aqui'}</strong>
                    <p>{inactive ? 'Produtos inativados aparecem aqui e podem ser reativados.' : filtered ? 'Tente outro nome ou código, ou desligue o filtro.' : 'Cadastre um produto para começar a acompanhar as quantidades.'}</p>
                    {canManage && !filtered && !inactive && <button className="primary" onClick={() => setModal({ kind: 'product' })}>Cadastrar primeiro produto</button>}
                  </div>
                </td></tr>
              ) : list.map((p) => (
                <tr key={p.id} className={inactive ? 'row-inactive' : ''}>
                  <td data-label="Produto"><Link className="product-link" to={`/produtos/${p.id}`}>{p.nome}</Link>{p.descricao && <small className="table-sub">{p.descricao}</small>}</td>
                  <td data-label="Código"><span className="code">{p.codigo}</span></td>
                  <td data-label="Disponível"><strong className={`quantity ${p.abaixoDoMinimo ? 'low' : ''}`}>{formatQty(p.saldoAtual)} <small>{p.unidadeMedida}</small></strong></td>
                  <td data-label="Mínimo">{p.estoqueMinimo > 0 ? `${formatQty(p.estoqueMinimo)} ${p.unidadeMedida}` : '—'}</td>
                  <td data-label="Status">{inactive ? <span className="badge muted">Inativo</span> : p.abaixoDoMinimo ? <span className="badge warning">{p.saldoAtual === 0 ? 'Sem estoque' : 'Abaixo do mínimo'}</span> : <span className="badge good">Disponível</span>}</td>
                  {!inactive && (
                    <td className="row-actions-cell">
                      <div className="row-actions">
                        <button className="movement-in" onClick={() => setModal({ kind: 'movement', product: p, tipo: 'ENTRADA' })} aria-label={`Registrar entrada de ${p.nome}`}><ArrowDownLeft size={15} /> Entrada</button>
                        <button className="movement-out" onClick={() => setModal({ kind: 'movement', product: p, tipo: 'SAIDA' })} aria-label={`Registrar saída de ${p.nome}`} disabled={p.saldoAtual <= 0} title={p.saldoAtual <= 0 ? 'Sem saldo para saída' : undefined}><ArrowUpRight size={15} /> Saída</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-foot">
          <span><span className="live-dot" /> Saldo atualizado a cada movimentação</span>
          <Link to="/historico">Ver movimentações <ArrowRight size={14} /></Link>
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
