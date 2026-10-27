import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Power, RotateCcw, UserPlus } from 'lucide-react';
import { api, type UsuarioAdmin } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/Modal';
import { useToast } from '../components/Toast';
import { UserModal } from '../components/UserModal';
import { roleLabel } from '../lib/format';

type ModalState = null | { kind: 'form'; user?: UsuarioAdmin } | { kind: 'status'; user: UsuarioAdmin };

export function UsersPage() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const notify = useToast();
  const [modal, setModal] = useState<ModalState>(null);
  const users = useQuery({ queryKey: ['users'], queryFn: () => api<UsuarioAdmin[]>('/usuarios') });
  const toggle = useMutation({
    mutationFn: (u: UsuarioAdmin) => api<UsuarioAdmin>(`/usuarios/${u.id}/${u.ativo ? 'inativar' : 'reativar'}`, { method: 'PATCH' }),
    onSuccess: (u) => { setModal(null); qc.invalidateQueries({ queryKey: ['users'] }); notify(u.ativo ? `${u.nome} pode entrar de novo.` : `${u.nome} não consegue mais entrar.`); },
  });
  const list = users.data ?? [];

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Equipe</span>
          <h1>Usuários</h1>
          <p>Quem pode entrar no sistema. Operadores registram entradas e saídas; administradores também cuidam dos produtos e da equipe.</p>
        </div>
        <button className="primary" onClick={() => setModal({ kind: 'form' })}><UserPlus size={17} /> Novo usuário</button>
      </div>
      <section className="table-card">
        <div className="table-scroll">
          <table className="responsive-table">
            <thead><tr><th scope="col">Nome</th><th scope="col">E-mail</th><th scope="col">Perfil</th><th scope="col">Situação</th><th scope="col" className="actions-head">Ações</th></tr></thead>
            <tbody>
              {users.isLoading ? (
                <tr><td colSpan={5} className="table-state">Carregando usuários…</td></tr>
              ) : users.isError ? (
                <tr><td colSpan={5} className="table-state error-state">{users.error.message} <button onClick={() => users.refetch()}>Tentar novamente</button></td></tr>
              ) : list.map((u) => (
                <tr key={u.id} className={u.ativo ? '' : 'row-inactive'}>
                  <td data-label="Nome"><strong className="cell-title">{u.nome}</strong>{u.id === me?.id && <small className="table-sub">Você</small>}</td>
                  <td data-label="E-mail">{u.email}</td>
                  <td data-label="Perfil"><span className={`badge ${u.perfil === 'ADMINISTRADOR' ? 'admin' : 'muted'}`}>{roleLabel(u.perfil)}</span></td>
                  <td data-label="Situação">{u.ativo ? <span className="badge good">Ativo</span> : <span className="badge muted">Inativo</span>}</td>
                  <td className="row-actions-cell">
                    <div className="row-actions">
                      <button className="secondary small" onClick={() => setModal({ kind: 'form', user: u })} aria-label={`Editar ${u.nome}`}><Pencil size={14} /> Editar</button>
                      {u.id !== me?.id && (
                        <button className="secondary small" onClick={() => { toggle.reset(); setModal({ kind: 'status', user: u }); }} aria-label={`${u.ativo ? 'Inativar' : 'Reativar'} ${u.nome}`}>
                          {u.ativo ? <><Power size={14} /> Inativar</> : <><RotateCcw size={14} /> Reativar</>}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {modal?.kind === 'form' && (
        <UserModal user={modal.user} isSelf={modal.user?.id === me?.id} onClose={() => setModal(null)} onSaved={(u) => { setModal(null); qc.invalidateQueries({ queryKey: ['users'] }); notify(modal.user ? 'Usuário atualizado.' : `${u.nome} já pode entrar com o e-mail ${u.email}.`); }} />
      )}
      {modal?.kind === 'status' && (
        <ConfirmDialog
          title={modal.user.ativo ? 'Inativar usuário?' : 'Reativar usuário?'}
          message={<p>{modal.user.ativo ? `${modal.user.nome} não vai conseguir mais entrar. As movimentações registradas por essa pessoa continuam no histórico.` : `${modal.user.nome} volta a poder entrar com o mesmo e-mail e senha.`}</p>}
          confirmLabel={modal.user.ativo ? 'Inativar' : 'Reativar'}
          danger={modal.user.ativo}
          busy={toggle.isPending}
          error={toggle.error?.message}
          onConfirm={() => toggle.mutate(modal.user)}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
