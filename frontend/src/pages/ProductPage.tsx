import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Pencil, Power, RotateCcw } from 'lucide-react';
import { api, query, type Movimento, type Page, type Produto } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/Modal';
import { MovementModal } from '../components/MovementModal';
import { ProductModal } from '../components/ProductModal';
import { useToast } from '../components/Toast';
import { formatDate, formatQty, levelPercent, motiveLabel, stockState, unitName } from '../lib/format';
import { movementToast, StockBadge } from './InventoryPage';
import { NotFoundPage } from './NotFoundPage';

type ModalState = null | 'edit' | 'status' | 'ENTRADA' | 'SAIDA';

function relativeDay(iso: string) {
  const date = new Date(iso);
  const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days === 0) return `Hoje, ${time}`;
  if (days === 1) return `Ontem, ${time}`;
  return formatDate(iso);
}

function Timeline({ data, unit, loading, error, onRetry, onPage }: { data?: Page<Movimento>; unit: string; loading: boolean; error: boolean; onRetry: () => void; onPage: (p: number) => void }) {
  const rows = data?.content ?? [];
  return (
    <section className="timeline-card" aria-labelledby="historico-produto">
      <div className="timeline-head">
        <h2 className="section-title" id="historico-produto">Movimentações</h2>
        {data && <span>{data.totalElements} {data.totalElements === 1 ? 'registro' : 'registros'}</span>}
      </div>
      {loading ? <p className="timeline-state">Carregando histórico…</p>
        : error ? <p className="timeline-state error-state">Não foi possível carregar. <button onClick={onRetry}>Tentar novamente</button></p>
        : rows.length === 0 ? <p className="timeline-state">Ainda não há movimentações para este produto.</p>
        : (
          <ol className="timeline">
            {rows.map((m) => {
              const isIn = m.tipo === 'ENTRADA';
              return (
                <li key={m.id}>
                  <span className={`timeline-icon ${isIn ? 'in' : 'out'}`} aria-hidden>{isIn ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span>
                  <span className="timeline-text">
                    <strong><span className="sr-only">{isIn ? 'Entrada' : 'Saída'}: </span>{motiveLabel(m.motivo)}</strong>
                    <small>{relativeDay(m.criadoEm)} · {m.usuarioNome}{m.observacao ? ` · ${m.observacao}` : ''}</small>
                  </span>
                  <span className={`timeline-delta ${isIn ? 'in' : 'out'}`}>{isIn ? '+' : '−'}{formatQty(m.quantidade)} {unit}</span>
                  <span className="timeline-after">saldo <strong>{formatQty(m.saldoApos)} {unit}</strong></span>
                </li>
              );
            })}
          </ol>
        )}
      {data && data.totalPages > 1 && (
        <nav className="pagination" aria-label="Paginação do histórico">
          <span>Página {data.page + 1} de {data.totalPages}</span>
          <div>
            <button className="secondary" onClick={() => onPage(data.page - 1)} disabled={data.page === 0}><ChevronLeft size={15} /> Anterior</button>
            <button className="secondary" onClick={() => onPage(data.page + 1)} disabled={data.page + 1 >= data.totalPages}>Próxima <ChevronRight size={15} /></button>
          </div>
        </nav>
      )}
    </section>
  );
}

export function ProductPage() {
  const id = Number(useParams().id);
  const { user } = useAuth();
  const canManage = user?.perfil === 'ADMINISTRADOR';
  const qc = useQueryClient();
  const notify = useToast();
  const [modal, setModal] = useState<ModalState>(null);
  const [page, setPage] = useState(0);

  const product = useQuery({ queryKey: ['product', id], queryFn: () => api<Produto>(`/produtos/${id}`), enabled: Number.isFinite(id) });
  const history = useQuery({
    queryKey: ['movements', 'product', id, page],
    queryFn: () => api<Page<Movimento>>(`/movimentacoes${query({ produtoId: id, page, size: 10 })}`),
    enabled: Number.isFinite(id),
    placeholderData: (previous) => previous,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['product', id] });
    qc.invalidateQueries({ queryKey: ['products'] });
    qc.invalidateQueries({ queryKey: ['movements'] });
  };
  const toggle = useMutation({
    mutationFn: (p: Produto) => api<Produto>(`/produtos/${p.id}/${p.ativo ? 'inativar' : 'reativar'}`, { method: 'PATCH' }),
    onSuccess: (p) => { setModal(null); refresh(); notify(p.ativo ? 'Produto reativado.' : 'Produto inativado. Ele não aparece mais no estoque.'); },
  });

  if (product.isLoading) return <p className="page-state">Carregando produto…</p>;
  if (product.isError || !product.data) return <NotFoundPage text={product.error?.message ?? 'Produto não encontrado.'} />;
  const p = product.data;
  const state = stockState(p);
  const missing = Math.max(0, Math.round((p.estoqueMinimo - p.saldoAtual) * 1000) / 1000);
  const width = state === 'out' ? 0 : Math.max(6, levelPercent(p.saldoAtual, p.estoqueMinimo));

  return (
    <>
      <nav className="crumbs" aria-label="Trilha">
        <Link to={p.ativo ? '/' : '/?filtro=inativos'}>Estoque</Link>
        <ChevronRight size={14} aria-hidden />
        <span aria-current="page">{p.nome}</span>
      </nav>
      <div className="page-heading">
        <div className="product-head">
          <span className="initial large" aria-hidden>{p.nome.slice(0, 1).toUpperCase()}</span>
          <div>
            <h1>{p.nome}</h1>
            <div className="product-meta">
              <span className="code-chip">{p.codigo}</span>
              <span>Medido em {unitName(p.unidadeMedida)} ({p.unidadeMedida})</span>
              {p.ativo ? <StockBadge state={state} /> : <span className="badge muted">Inativo</span>}
            </div>
            {p.descricao && <p>{p.descricao}</p>}
          </div>
        </div>
        {canManage && (
          <div className="heading-actions">
            <button className="secondary" onClick={() => setModal('edit')}><Pencil size={15} aria-hidden /> Editar</button>
            <button className="secondary" onClick={() => { toggle.reset(); setModal('status'); }}>{p.ativo ? <><Power size={15} aria-hidden /> Inativar</> : <><RotateCcw size={15} aria-hidden /> Reativar</>}</button>
          </div>
        )}
      </div>

      <section className="stat-grid" aria-label="Resumo do produto">
        <div className={`stat ${state === 'low' ? 'stat-warning' : state === 'out' ? 'stat-out' : ''}`}>
          <span>Disponível agora</span>
          <span className="stat-value"><strong>{formatQty(p.saldoAtual)}</strong><small>{p.unidadeMedida}</small></span>
          {p.estoqueMinimo > 0 && <span className={`level-track ${state}`} aria-hidden><span style={{ width: `${width}%` }} /></span>}
          <small>{state === 'out' ? 'Registre uma entrada para repor.' : state === 'low' ? (missing > 0 ? `Faltam ${formatQty(missing)} ${p.unidadeMedida} para o mínimo` : 'No limite do mínimo') : 'Acima do mínimo'}</small>
        </div>
        <div className="stat">
          <span>Estoque mínimo</span>
          <span className="stat-value">{p.estoqueMinimo > 0 ? <><strong>{formatQty(p.estoqueMinimo)}</strong><small>{p.unidadeMedida}</small></> : <strong>—</strong>}</span>
          <small>{p.estoqueMinimo > 0 ? 'Avisamos quando o saldo chegar a esse valor' : 'Aviso desligado'}</small>
        </div>
        {p.ativo && (
          <div className="stat stat-actions">
            <button className="primary" onClick={() => setModal('ENTRADA')}><ArrowDownLeft size={16} aria-hidden /> Registrar entrada</button>
            <button className="movement-out" onClick={() => setModal('SAIDA')} disabled={p.saldoAtual <= 0}><ArrowUpRight size={16} aria-hidden /> Registrar saída</button>
          </div>
        )}
      </section>

      <Timeline data={history.data} unit={p.unidadeMedida} loading={history.isLoading} error={history.isError} onRetry={() => history.refetch()} onPage={setPage} />

      {modal === 'edit' && <ProductModal product={p} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); notify('Produto atualizado.'); }} />}
      {(modal === 'ENTRADA' || modal === 'SAIDA') && <MovementModal product={p} type={modal} onClose={() => setModal(null)} onSaved={(m) => { setModal(null); setPage(0); refresh(); notify(movementToast(m, p.unidadeMedida)); }} />}
      {modal === 'status' && (
        <ConfirmDialog
          title={p.ativo ? 'Inativar produto?' : 'Reativar produto?'}
          message={p.ativo
            ? <p>“{p.nome}” sai da lista do estoque e deixa de aceitar entradas e saídas. O histórico é mantido e você pode reativá-lo quando quiser.</p>
            : <p>“{p.nome}” volta para a lista do estoque com o saldo de {formatQty(p.saldoAtual)} {p.unidadeMedida}.</p>}
          confirmLabel={p.ativo ? 'Inativar' : 'Reativar'}
          danger={p.ativo}
          busy={toggle.isPending}
          error={toggle.error?.message}
          onConfirm={() => toggle.mutate(p)}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
