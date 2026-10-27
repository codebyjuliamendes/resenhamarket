import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ChevronDown, KeyRound, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { roleLabel } from '../lib/format';
import { Brand } from './Brand';
import { PasswordModal } from './PasswordModal';

export function Layout() {
  const { user, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const [password, setPassword] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !menuRef.current?.contains(event.target as Node)) setMenu(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [menu]);

  if (!user) return null;
  const isAdmin = user.perfil === 'ADMINISTRADOR';
  return (
    <div className="app">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header className="topbar">
        <Brand />
        <nav className="nav" aria-label="Principal">
          <NavLink to="/" end>Estoque</NavLink>
          <NavLink to="/historico">Histórico</NavLink>
          {isAdmin && <NavLink to="/usuarios">Usuários</NavLink>}
        </nav>
        <div className="user-area" ref={menuRef}>
          <button className="user-button" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-haspopup="menu">
            <span className="user-avatar"><UserRound size={16} /></span>
            <span className="user-name">{user.nome}<small>{roleLabel(user.perfil)}</small></span>
            <ChevronDown size={15} />
          </button>
          {menu && (
            <div className="user-menu" role="menu">
              <div className="user-menu-head"><strong>{user.nome}</strong><small>{user.email}</small></div>
              <button role="menuitem" onClick={() => { setMenu(false); setPassword(true); }}><KeyRound size={15} /> Trocar senha</button>
              <button role="menuitem" onClick={() => logout()}><LogOut size={15} /> Sair</button>
            </div>
          )}
        </div>
      </header>
      <main className="main" id="conteudo" tabIndex={-1}>
        <Outlet />
      </main>
      {password && <PasswordModal onClose={() => setPassword(false)} />}
    </div>
  );
}
