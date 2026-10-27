import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Brand } from '../components/Brand';

const demoAccounts = [
  { label: 'Administrador', email: 'admin@resenha.dev', senha: 'admin123' },
  { label: 'Operador', email: 'operador@resenha.dev', senha: 'operador123' },
];

export function LoginPage({ showDemo = import.meta.env.VITE_SHOW_DEMO !== 'false' }: { showDemo?: boolean }) {
  const { login, notice } = useAuth();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, senha);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <Brand className="login-brand" />
        <span className="eyebrow">Estoque sem complicação</span>
        <h1>Bom ter você por aqui.</h1>
        <p>Entre para acompanhar o estoque do seu negócio.</p>
        {notice && <p className="notice" role="status">{notice}</p>}
        <form onSubmit={submit} className="form-stack">
          <label>E-mail<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
          <label>Senha
            <span className="password-field">
              <input type={visible ? 'text' : 'password'} autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
              <button type="button" className="icon-button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </span>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}<ArrowRight size={17} /></button>
        </form>
        {showDemo && (
          <div className="demo-box">
            <strong>Ambiente de demonstração — toque para preencher</strong>
            {demoAccounts.map((a) => (
              <button key={a.email} type="button" onClick={() => { setEmail(a.email); setSenha(a.senha); setError(''); }}>
                <span>{a.label}</span><code>{a.email}</code>
              </button>
            ))}
          </div>
        )}
      </section>
      <p className="login-foot">ResenhaMarket · Controle de estoque para qualquer negócio</p>
    </main>
  );
}
