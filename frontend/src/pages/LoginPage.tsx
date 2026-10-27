import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Brand } from '../components/Brand';

const demoAccounts = [
  { label: 'Administrador', email: 'admin@resenha.dev', senha: 'admin123' },
  { label: 'Operador', email: 'operador@resenha.dev', senha: 'operador123' },
];

const benefits = ['Saldo que nunca fica negativo', 'Aviso quando um produto chega ao mínimo', 'Histórico de quem registrou cada movimentação'];

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
    <div className="login-page">
      <section className="login-aside">
        <Brand inverse link={false} />
        <div className="login-pitch">
          <h1>O estoque da sua loja, sem caderno e sem planilha.</h1>
          <p>Registre cada entrada e saída e saiba, a qualquer hora, quanto tem de cada produto.</p>
          <ul>
            {benefits.map((text) => <li key={text}><span aria-hidden><Check size={15} strokeWidth={2.6} /></span>{text}</li>)}
          </ul>
        </div>
        <small>Para varejo, farmácia, alimentos e qualquer negócio que movimenta produtos.</small>
      </section>
      <main className="login-main">
        <div className="login-card">
          <header>
            <h2>Entrar</h2>
            <p>Use o e-mail e a senha que o administrador da loja criou para você.</p>
          </header>
          {notice && <p className="notice" role="status">{notice}</p>}
          <form onSubmit={submit} className="form-stack">
            <label>E-mail<input type="email" autoComplete="username" placeholder="voce@sualoja.com.br" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
            <label>Senha
              <span className="password-field">
                <input type={visible ? 'text' : 'password'} autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
                <button type="button" className="icon-button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </span>
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}<ArrowRight size={17} aria-hidden /></button>
          </form>
          {showDemo && (
            <div className="demo-box">
              <strong>Ambiente de demonstração · toque para preencher</strong>
              {demoAccounts.map((a) => (
                <button key={a.email} type="button" onClick={() => { setEmail(a.email); setSenha(a.senha); setError(''); }}>
                  <span>{a.label}</span><code>{a.email}</code>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
