import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowDownLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { api, type Movimento, type Produto, type TipoMovimento } from '../api/client';
import { calculateNextBalance, isIntegerUnit, quantityError } from '../lib/movementRules';
import { formatQty, motives } from '../lib/format';
import { Modal } from './Modal';

const movementSchema = z.object({
  tipo: z.enum(['ENTRADA', 'SAIDA']),
  quantidade: z.coerce.number({ message: 'Informe a quantidade.' }).positive('Informe uma quantidade maior que zero.'),
  motivo: z.string().min(1),
  observacao: z.string().max(255, 'Use no máximo 255 caracteres.').optional(),
});
type MovementForm = z.infer<typeof movementSchema>;
const defaultMotive = (tipo: TipoMovimento) => (tipo === 'ENTRADA' ? 'COMPRA' : 'VENDA');

export function MovementModal({ product, type, onClose, onSaved }: { product: Produto; type: TipoMovimento; onClose: () => void; onSaved: (m: Movimento) => void }) {
  const [activeType, setActiveType] = useState(type);
  const form = useForm<z.input<typeof movementSchema>, unknown, MovementForm>({
    resolver: zodResolver(movementSchema),
    defaultValues: { tipo: type, quantidade: '', motivo: defaultMotive(type), observacao: '' },
  });
  const raw = form.watch('quantidade');
  const qty = Number(raw || 0);
  const next = calculateNextBalance(product.saldoAtual, qty, activeType);
  const qtyProblem = raw !== '' && raw !== undefined ? quantityError(product.unidadeMedida, qty) : null;
  const outOfStock = next < 0;
  const mutation = useMutation({
    mutationFn: (data: MovementForm) => api<Movimento>('/movimentacoes', { method: 'POST', body: JSON.stringify({ produtoId: product.id, ...data, tipo: activeType }) }),
    onSuccess: onSaved,
  });
  const switchType = (tipo: TipoMovimento) => {
    setActiveType(tipo);
    form.setValue('tipo', tipo);
    form.setValue('motivo', defaultMotive(tipo));
  };
  const isEntry = activeType === 'ENTRADA';
  return (
    <Modal title={isEntry ? 'Registrar entrada' : 'Registrar saída'} subtitle="A movimentação fica registrada no histórico do estoque." onClose={onClose}>
      <div className="selected-product">
        <span className="product-initial" aria-hidden>{product.nome.slice(0, 1).toUpperCase()}</span>
        <div><strong>{product.nome}</strong><small>Código {product.codigo} · disponível agora: {formatQty(product.saldoAtual)} {product.unidadeMedida}</small></div>
      </div>
      <div className="type-toggle" role="radiogroup" aria-label="Tipo de movimentação">
        <button type="button" role="radio" aria-checked={isEntry} className={isEntry ? 'entry-active' : ''} onClick={() => switchType('ENTRADA')}><ArrowDownLeft size={16} /> Entrada</button>
        <button type="button" role="radio" aria-checked={!isEntry} className={!isEntry ? 'exit-active' : ''} onClick={() => switchType('SAIDA')}><ArrowUpRight size={16} /> Saída</button>
      </div>
      <form className="form-stack" onSubmit={form.handleSubmit((v) => mutation.mutate(v))} noValidate>
        <label>Quantidade ({product.unidadeMedida})
          <input data-autofocus type="number" min="0.001" step="any" inputMode={isIntegerUnit(product.unidadeMedida) ? 'numeric' : 'decimal'} placeholder={isIntegerUnit(product.unidadeMedida) ? 'Ex.: 12' : 'Ex.: 2,5'} {...form.register('quantidade')} aria-invalid={!!(qtyProblem || form.formState.errors.quantidade)} />
          {qtyProblem ? <small className="field-error">{qtyProblem}</small> : form.formState.errors.quantidade && <small className="field-error">{form.formState.errors.quantidade.message}</small>}
        </label>
        <label>Motivo<select {...form.register('motivo')}>{motives[activeType].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Observação <span className="optional">opcional</span><input placeholder="Ex.: reposição semanal" maxLength={255} {...form.register('observacao')} /></label>
        <div className={`balance-preview ${outOfStock ? 'balance-error' : ''}`} aria-live="polite">
          <span>Saldo depois da movimentação</span>
          <strong>{formatQty(product.saldoAtual)} <ArrowRight size={15} aria-label="vai para" /> {formatQty(next)} <small>{product.unidadeMedida}</small></strong>
          {outOfStock && <small>Não há saldo suficiente. Disponível: {formatQty(product.saldoAtual)} {product.unidadeMedida}.</small>}
        </div>
        {mutation.isError && <p className="form-error" role="alert">{mutation.error.message}</p>}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
          <button className={isEntry ? 'primary' : 'primary exit'} disabled={mutation.isPending || outOfStock || !!qtyProblem || qty <= 0}>{mutation.isPending ? 'Registrando…' : `Registrar ${isEntry ? 'entrada' : 'saída'}`}</button>
        </div>
      </form>
    </Modal>
  );
}
