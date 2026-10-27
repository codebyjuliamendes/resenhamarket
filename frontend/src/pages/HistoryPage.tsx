import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, X } from 'lucide-react';
import { api, query, type Movimento, type Page, type Produto } from '../api/client';
import { MovementsTable } from '../components/MovementsTable';
import { localDayToIso } from '../lib/format';

export function HistoryPage() {
  const [params, setParams] = useSearchParams();
  const tipo = params.get('tipo') ?? '';
  const produtoId = params.get('produto') ?? '';
  const de = params.get('de') ?? '';
  const ate = params.get('ate') ?? '';
  const page = Math.max(0, Number(params.get('pagina') ?? 1) - 1);
  const invalidPeriod = Boolean(de && ate && de > ate);

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) if (value) next.set(key, value); else next.delete(key);
    if (!('pagina' in changes)) next.delete('pagina');
    setParams(next, { replace: true });
  };

  const products = useQuery({ queryKey: ['products', 'all-for-filter'], queryFn: () => api<Produto[]>('/produtos?ativo=true'), staleTime: 60_000 });
  const history = useQuery({
    queryKey: ['movements', tipo, produtoId, de, ate, page],
    queryFn: () => api<Page<Movimento>>(`/movimentacoes${query({ size: 25, page, tipo, produtoId, de: de ? localDayToIso(de) : undefined, ate: ate ? localDayToIso(ate, 1) : undefined })}`),
    enabled: !invalidPeriod,
    placeholderData: (previous) => previous,
  });
  const hasFilters = Boolean(tipo || produtoId || de || ate);

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Rastreabilidade</span>
          <h1>Histórico de movimentações</h1>
          <p>Cada entrada e saída fica registrada para você consultar quando precisar.</p>
        </div>
      </div>
      <div className="inventory-tools history-filters">
        <label className="filter-select">Tipo
          <select value={tipo} onChange={(e) => update({ tipo: e.target.value })}>
            <option value="">Todos</option><option value="ENTRADA">Entradas</option><option value="SAIDA">Saídas</option>
          </select><ChevronDown size={15} aria-hidden />
        </label>
        <label className="filter-select">Produto
          <select value={produtoId} onChange={(e) => update({ produto: e.target.value })}>
            <option value="">Todos</option>
            {products.data?.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select><ChevronDown size={15} aria-hidden />
        </label>
        <label className="filter-select">De<input type="date" value={de} max={ate || undefined} onChange={(e) => update({ de: e.target.value })} /></label>
        <label className="filter-select">Até<input type="date" value={ate} min={de || undefined} onChange={(e) => update({ ate: e.target.value })} /></label>
        {hasFilters && <button className="clear-filters" onClick={() => setParams({}, { replace: true })}><X size={14} /> Limpar filtros</button>}
        <span className="result-count" aria-live="polite">{history.data ? `${history.data.totalElements} ${history.data.totalElements === 1 ? 'registro' : 'registros'}` : ''}</span>
      </div>
      {invalidPeriod ? (
        <p className="form-error" role="alert">A data inicial precisa ser anterior ou igual à data final.</p>
      ) : (
        <MovementsTable
          data={history.data}
          loading={history.isLoading}
          error={history.isError}
          onRetry={() => history.refetch()}
          onPage={(p) => update({ pagina: String(p + 1) })}
          emptyText={hasFilters ? 'Nenhuma movimentação com esses filtros.' : 'Ainda não há movimentações. Elas aparecerão aqui depois do primeiro registro.'}
        />
      )}
    </>
  );
}
