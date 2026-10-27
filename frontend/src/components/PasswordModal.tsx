import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../api/client';
import { Field } from './Field';
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
        <Field label="Senha atual" error={errors.senhaAtual?.message}>{(p) => <input {...p} type="password" autoComplete="current-password" {...form.register('senhaAtual')} />}</Field>
        <Field label="Nova senha" error={errors.novaSenha?.message}>{(p) => <input {...p} type="password" autoComplete="new-password" {...form.register('novaSenha')} />}</Field>
        <Field label="Repita a nova senha" error={errors.confirmacao?.message}>{(p) => <input {...p} type="password" autoComplete="new-password" {...form.register('confirmacao')} />}</Field>
        {mutation.isError && <p className="form-error" role="alert">{mutation.error.message}</p>}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
          <button className="primary" disabled={mutation.isPending}>{mutation.isPending ? 'Salvando…' : 'Salvar nova senha'}</button>
        </div>
      </form>
    </Modal>
  );
}
