import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import type { Movimento, Page } from '../api/client';
import { formatDate, formatQty, motiveLabel } from '../lib/format';

type Props = {
  data?: Page<Movimento>;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onPage: (page: number) => void;
  showProduct?: boolean;
  emptyText: string;
};

export function MovementsTable({ data, loading, error, onRetry, onPage, showProduct = true, emptyText }: Props) {
  const columns = showProduct ? 7 : 6;
  const rows = data?.content ?? [];
  return (
    <section className="table-card">
      <div className="table-scroll">
        <table className="responsive-table">
          <thead>
            <tr>
              <th scope="col">Data e hora</th>
              {showProduct && <th scope="col">Produto</th>}
              <th scope="col">Tipo</th>
              <th scope="col">Quantidade</th>
              <th scope="col">Saldo após</th>
              <th scope="col">Motivo</th>
              <th scope="col">Registrado por</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns} className="table-state">Carregando histórico…</td></tr>
            ) : error ? (
              <tr><td colSpan={columns} className="table-state error-state">Não foi possível carregar. <button onClick={onRetry}>Tentar novamente</button></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={columns} className="table-state">{emptyText}</td></tr>
            ) : rows.map((m) => (
              <tr key={m.id}>
                <td data-label="Data"><span className="date-cell"><Clock3 size={14} aria-hidden />{formatDate(m.criadoEm)}</span></td>
                {showProduct && <td data-label="Produto"><Link className="product-link" to={`/produtos/${m.produtoId}`}>{m.produtoNome}</Link><small className="table-sub">{m.produtoCodigo}</small></td>}
                <td data-label="Tipo"><span className={`type-badge ${m.tipo === 'ENTRADA' ? 'in' : 'out'}`}>{m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}</span></td>
                <td data-label="Quantidade" className={m.tipo === 'ENTRADA' ? 'qty-in' : 'qty-out'}>{m.tipo === 'ENTRADA' ? '+' : '−'}{formatQty(m.quantidade)}</td>
                <td data-label="Saldo após"><strong>{formatQty(m.saldoApos)}</strong></td>
                <td data-label="Motivo">{motiveLabel(m.motivo)}{m.observacao && <small className="table-sub">{m.observacao}</small>}</td>
                <td data-label="Por">{m.usuarioNome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
