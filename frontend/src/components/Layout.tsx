import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ChevronsUpDown, History, KeyRound, LogOut, Package, Users } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { initials, roleLabel } from '../lib/format';
import { Brand } from './Brand';
import { PasswordModal } from './PasswordModal';

function UserMenu({ variant, onPassword }: { variant: 'side' | 'mobile'; onPassword: () => void }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  if (!user) return null;
  const menu = open && (
    <div className="user-menu" role="menu">
      <div className="user-menu-head"><strong>{user.nome}</strong><small>{user.email}</small></div>
      <button role="menuitem" onClick={() => { setOpen(false); onPassword(); }}><KeyRound size={15} /> Trocar senha</button>
      <button role="menuitem" onClick={() => logout()}><LogOut size={15} /> Sair</button>
    </div>
  );
  if (variant === 'mobile') {
    return (
      <div className="user-area" ref={ref}>
        <button className="mobile-user" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" aria-label={`Conta de ${user.nome}`}>
          <span className="avatar">{initials(user.nome)}</span>
        </button>
        {menu}
      </div>
    );
  }
  return (
    <div className="side-user" ref={ref}>
      {menu}
      <button className="side-user-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu">
        <span className="avatar">{initials(user.nome)}</span>
        <span className="side-user-text"><strong>{user.nome}</strong><small>{roleLabel(user.perfil)}</small></span>
        <ChevronsUpDown size={16} aria-hidden />
      </button>
    </div>
  );
}

export function Layout() {
  const { user } = useAuth();
  const [password, setPassword] = useState(false);
  if (!user) return null;
  const isAdmin = user.perfil === 'ADMINISTRADOR';
  return (
    <div className="shell">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <aside className="sidebar">
        <Brand inverse />
        <nav className="side-nav" aria-label="Principal">
          <span className="side-label">Operação</span>
          <NavLink className="side-link" to="/" end><Package size={18} aria-hidden /> Estoque</NavLink>
          <NavLink className="side-link" to="/historico"><History size={18} aria-hidden /> Histórico</NavLink>
          {isAdmin && <>
            <span className="side-label">Administração</span>
            <NavLink className="side-link" to="/usuarios"><Users size={18} aria-hidden /> Usuários</NavLink>
          </>}
        </nav>
        <UserMenu variant="side" onPassword={() => setPassword(true)} />
      </aside>
      <div className="content">
        <header className="mobile-bar">
          <Brand inverse />
          <UserMenu variant="mobile" onPassword={() => setPassword(true)} />
        </header>
        <main className="main" id="conteudo" tabIndex={-1}>
          <Outlet />
        </main>
        <nav className="bottom-nav" aria-label="Principal no celular">
          <NavLink to="/" end><Package size={21} aria-hidden /> Estoque</NavLink>
          <NavLink to="/historico"><History size={21} aria-hidden /> Histórico</NavLink>
          {isAdmin && <NavLink to="/usuarios"><Users size={21} aria-hidden /> Usuários</NavLink>}
        </nav>
      </div>
      {password && <PasswordModal onClose={() => setPassword(false)} />}
    </div>
  );
}
