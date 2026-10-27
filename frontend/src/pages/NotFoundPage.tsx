import { Link } from 'react-router-dom';

export function NotFoundPage({ text = 'Esta página não existe ou você não tem acesso a ela.' }: { text?: string }) {
  return (
    <div className="empty-box page-empty">
      <strong>Nada por aqui</strong>
      <p>{text}</p>
      <Link className="primary" to="/">Voltar ao estoque</Link>
    </div>
  );
}
