import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Pencil, Power, RotateCcw } from 'lucide-react';
import { api, query, type Movimento, type Page, type Produto } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/Modal';
import { MovementModal } from '../components/MovementModal';
import { MovementsTable } from '../components/MovementsTable';
import { ProductModal } from '../components/ProductModal';
import { useToast } from '../components/Toast';
import { formatDate, formatQty } from '../lib/format';
import { movementToast } from './InventoryPage';
import { NotFoundPage } from './NotFoundPage';

type ModalState = null | 'edit' | 'status' | 'ENTRADA' | 'SAIDA';

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

  return (
    <>
      <Link className="back-link" to={p.ativo ? '/' : '/?status=inativos'}><ArrowLeft size={15} /> Voltar ao estoque</Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Produto · <span className="code">{p.codigo}</span></span>
          <h1>{p.nome} {!p.ativo && <span className="badge muted">Inativo</span>}</h1>
          <p>{p.descricao || 'Sem descrição.'}</p>
        </div>
        <div className="heading-actions">
          {canManage && <button className="secondary" onClick={() => setModal('edit')}><Pencil size={15} /> Editar</button>}
          {canManage && <button className="secondary" onClick={() => { toggle.reset(); setModal('status'); }}>{p.ativo ? <><Power size={15} /> Inativar</> : <><RotateCcw size={15} /> Reativar</>}</button>}
        </div>
      </div>

      <section className="stat-grid" aria-label="Resumo do produto">
        <div className={`stat ${p.abaixoDoMinimo ? 'stat-warning' : ''}`}>
          <span>Disponível agora</span>
          <strong>{formatQty(p.saldoAtual)} <small>{p.unidadeMedida}</small></strong>
          {p.abaixoDoMinimo && <small>{p.saldoAtual === 0 ? 'Sem estoque' : 'Abaixo do mínimo'}</small>}
        </div>
        <div className="stat"><span>Estoque mínimo</span><strong>{p.estoqueMinimo > 0 ? <>{formatQty(p.estoqueMinimo)} <small>{p.unidadeMedida}</small></> : '—'}</strong>{p.estoqueMinimo === 0 && <small>Aviso desligado</small>}</div>
        <div className="stat"><span>Última atualização</span><strong className="stat-date">{formatDate(p.atualizadoEm)}</strong></div>
        {p.ativo && (
          <div className="stat stat-actions">
            <button className="movement-in" onClick={() => setModal('ENTRADA')}><ArrowDownLeft size={16} /> Registrar entrada</button>
            <button className="movement-out" onClick={() => setModal('SAIDA')} disabled={p.saldoAtual <= 0}><ArrowUpRight size={16} /> Registrar saída</button>
          </div>
        )}
      </section>

      <h2 className="section-title">Movimentações deste produto {history.data && <small>{history.data.totalElements} no total</small>}</h2>
      <MovementsTable data={history.data} loading={history.isLoading} error={history.isError} onRetry={() => history.refetch()} onPage={setPage} showProduct={false} emptyText="Ainda não há movimentações para este produto." />

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
