import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, ApiError, type UsuarioAdmin } from '../api/client';
import { roleLabel } from '../lib/format';
import { Modal } from './Modal';

const schema = (creating: boolean) => z.object({
  nome: z.string().trim().min(2, 'Informe o nome.').max(120),
  email: z.string().trim().email('Informe um e-mail válido.').max(160),
  perfil: z.enum(['ADMINISTRADOR', 'OPERADOR']),
  senha: creating ? z.string().min(8, 'Use pelo menos 8 caracteres.').max(72) : z.string().max(72).refine((v) => v === '' || v.length >= 8, 'Use pelo menos 8 caracteres.'),
});
type Form = z.infer<ReturnType<typeof schema>>;

export function UserModal({ user, isSelf, onClose, onSaved }: { user?: UsuarioAdmin; isSelf: boolean; onClose: () => void; onSaved: (u: UsuarioAdmin) => void }) {
  const form = useForm<Form>({
    resolver: zodResolver(schema(!user)),
    defaultValues: user ? { nome: user.nome, email: user.email, perfil: user.perfil, senha: '' } : { nome: '', email: '', perfil: 'OPERADOR', senha: '' },
  });
  const mutation = useMutation({
    mutationFn: (data: Form) => api<UsuarioAdmin>(user ? `/usuarios/${user.id}` : '/usuarios', { method: user ? 'PUT' : 'POST', body: JSON.stringify({ ...data, senha: data.senha || null }) }),
    onSuccess: onSaved,
    onError: (error) => { if (error instanceof ApiError && error.code === 'EMAIL_DUPLICADO') form.setError('email', { message: error.message }); },
  });
  const errors = form.formState.errors;
  const duplicate = mutation.error instanceof ApiError && mutation.error.code === 'EMAIL_DUPLICADO';
  return (
    <Modal title={user ? 'Editar usuário' : 'Novo usuário'} subtitle={user ? 'Deixe a senha em branco para manter a atual.' : 'Compartilhe a senha inicial com a pessoa. Ela pode trocá-la depois.'} onClose={onClose}>
      <form className="form-stack" onSubmit={form.handleSubmit((v) => mutation.mutate(v))} noValidate>
        <label>Nome<input autoComplete="off" {...form.register('nome')} aria-invalid={!!errors.nome} />{errors.nome && <small className="field-error">{errors.nome.message}</small>}</label>
        <label>E-mail<input type="email" autoComplete="off" {...form.register('email')} aria-invalid={!!errors.email} />{errors.email && <small className="field-error">{errors.email.message}</small>}</label>
        <div className="form-grid">
          <label>Perfil
            {isSelf ? <input readOnly value={roleLabel(user?.perfil ?? 'OPERADOR')} /> : (
              <select {...form.register('perfil')}>
                <option value="OPERADOR">Operador</option>
                <option value="ADMINISTRADOR">Administrador</option>
              </select>
            )}
            <small className="hint">{isSelf ? 'Você não pode mudar o seu próprio perfil.' : 'Administradores cadastram produtos e gerenciam usuários.'}</small>
          </label>
          <label>{user ? 'Nova senha' : 'Senha inicial'} {user && <span className="optional">opcional</span>}
            <input type="password" autoComplete="new-password" {...form.register('senha')} aria-invalid={!!errors.senha} />
            {errors.senha && <small className="field-error">{errors.senha.message}</small>}
          </label>
        </div>
        {mutation.isError && !duplicate && <p className="form-error" role="alert">{mutation.error.message}</p>}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
          <button className="primary" disabled={mutation.isPending}>{mutation.isPending ? 'Salvando…' : user ? 'Salvar alterações' : 'Criar usuário'}</button>
        </div>
      </form>
    </Modal>
  );
}
