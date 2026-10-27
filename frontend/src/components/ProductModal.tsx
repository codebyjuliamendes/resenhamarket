import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, ApiError, type Produto } from '../api/client';
import { isIntegerUnit } from '../lib/movementRules';
import { unitOptions } from '../lib/format';
import { Modal } from './Modal';

const productSchema = z.object({
  codigo: z.string().trim().min(1, 'Informe o código.').max(40, 'Use no máximo 40 caracteres.'),
  nome: z.string().trim().min(2, 'Informe o nome do produto.').max(150, 'Use no máximo 150 caracteres.'),
  descricao: z.string().max(500, 'Use no máximo 500 caracteres.').optional(),
  unidadeMedida: z.string().min(1),
  estoqueMinimo: z.coerce.number({ message: 'Informe um número.' }).min(0, 'O mínimo não pode ser negativo.'),
});
type ProductForm = z.infer<typeof productSchema>;

export function ProductModal({ product, onClose, onSaved }: { product?: Produto; onClose: () => void; onSaved: (p: Produto) => void }) {
  const form = useForm<z.input<typeof productSchema>, unknown, ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? { codigo: product.codigo, nome: product.nome, descricao: product.descricao || '', unidadeMedida: product.unidadeMedida, estoqueMinimo: product.estoqueMinimo }
      : { codigo: '', nome: '', descricao: '', unidadeMedida: 'UN', estoqueMinimo: 0 },
  });
  const mutation = useMutation({
    mutationFn: (data: ProductForm) => api<Produto>(product ? `/produtos/${product.id}` : '/produtos', { method: product ? 'PUT' : 'POST', body: JSON.stringify(data) }),
    onSuccess: onSaved,
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'CODIGO_DUPLICADO') form.setError('codigo', { message: error.message });
    },
  });
  const errors = form.formState.errors;
  const unit = form.watch('unidadeMedida');
  const duplicate = mutation.error instanceof ApiError && mutation.error.code === 'CODIGO_DUPLICADO';
  return (
    <Modal title={product ? 'Editar produto' : 'Cadastrar produto'} subtitle={product ? 'O saldo não muda ao editar. Use entradas e saídas para ajustar quantidades.' : 'O saldo começa em zero. Depois registre a primeira entrada.'} onClose={onClose}>
      <form className="form-stack" onSubmit={form.handleSubmit((v) => mutation.mutate(v))} noValidate>
        <div className="form-grid">
          <label>Código<input placeholder="Ex.: 10025" {...form.register('codigo')} aria-invalid={!!errors.codigo} />{errors.codigo && <small className="field-error">{errors.codigo.message}</small>}</label>
          <label>Nome do produto<input placeholder="Ex.: Caderno 10 matérias" {...form.register('nome')} aria-invalid={!!errors.nome} />{errors.nome && <small className="field-error">{errors.nome.message}</small>}</label>
        </div>
        <label><span>Descrição <span className="optional">opcional</span></span><input placeholder="Uma informação para identificar melhor" {...form.register('descricao')} />{errors.descricao && <small className="field-error">{errors.descricao.message}</small>}</label>
        <div className="form-grid">
          <label>Unidade de medida
            <select {...form.register('unidadeMedida')}>{unitOptions.map((u) => <option key={u}>{u}</option>)}</select>
            <small className="hint">{isIntegerUnit(unit) ? 'Quantidades inteiras (ex.: 12).' : 'Aceita frações (ex.: 2,5).'}</small>
          </label>
          <label>Estoque mínimo
            <input type="number" min="0" step="any" inputMode="decimal" {...form.register('estoqueMinimo')} aria-invalid={!!errors.estoqueMinimo} />
            {errors.estoqueMinimo ? <small className="field-error">{errors.estoqueMinimo.message}</small> : <small className="hint">Avisamos quando o saldo chegar a esse valor. 0 desliga o aviso.</small>}
          </label>
        </div>
        {mutation.isError && !duplicate && <p className="form-error" role="alert">{mutation.error.message}</p>}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
          <button className="primary" disabled={mutation.isPending}>{mutation.isPending ? 'Salvando…' : product ? 'Salvar alterações' : 'Cadastrar produto'}</button>
        </div>
      </form>
    </Modal>
  );
}
