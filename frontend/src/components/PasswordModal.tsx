import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../api/client';
import { Modal } from './Modal';
import { useToast } from './Toast';

const schema = z.object({
  senhaAtual: z.string().min(1, 'Informe a senha atual.'),
  novaSenha: z.string().min(8, 'Use pelo menos 8 caracteres.').max(72, 'Use no máximo 72 caracteres.'),
  confirmacao: z.string(),
}).refine((v) => v.novaSenha === v.confirmacao, { path: ['confirmacao'], message: 'As senhas não conferem.' });
type Form = z.infer<typeof schema>;

export function PasswordModal({ onClose }: { onClose: () => void }) {
  const notify = useToast();
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { senhaAtual: '', novaSenha: '', confirmacao: '' } });
  const mutation = useMutation({
    mutationFn: ({ senhaAtual, novaSenha }: Form) => api<void>('/auth/senha', { method: 'PUT', body: JSON.stringify({ senhaAtual, novaSenha }) }),
    onSuccess: () => { notify('Senha alterada.'); onClose(); },
  });
  const errors = form.formState.errors;
  return (
    <Modal title="Trocar senha" subtitle="Use uma senha que só você saiba, com pelo menos 8 caracteres." onClose={onClose} size="small">
      <form className="form-stack" onSubmit={form.handleSubmit((v) => mutation.mutate(v))} noValidate>
        <label>Senha atual<input type="password" autoComplete="current-password" {...form.register('senhaAtual')} aria-invalid={!!errors.senhaAtual} />{errors.senhaAtual && <small className="field-error">{errors.senhaAtual.message}</small>}</label>
        <label>Nova senha<input type="password" autoComplete="new-password" {...form.register('novaSenha')} aria-invalid={!!errors.novaSenha} />{errors.novaSenha && <small className="field-error">{errors.novaSenha.message}</small>}</label>
        <label>Repita a nova senha<input type="password" autoComplete="new-password" {...form.register('confirmacao')} aria-invalid={!!errors.confirmacao} />{errors.confirmacao && <small className="field-error">{errors.confirmacao.message}</small>}</label>
        {mutation.isError && <p className="form-error" role="alert">{mutation.error.message}</p>}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
          <button className="primary" disabled={mutation.isPending}>{mutation.isPending ? 'Salvando…' : 'Salvar nova senha'}</button>
        </div>
      </form>
    </Modal>
  );
}
