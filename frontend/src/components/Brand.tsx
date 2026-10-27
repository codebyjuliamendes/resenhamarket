import { Link } from 'react-router-dom';
import { Warehouse } from 'lucide-react';

export function Brand({ className = '' }: { className?: string }) {
  return (
    <Link className={`brand ${className}`} to="/" aria-label="ResenhaMarket, ir para o estoque">
      <span className="brand-mark"><Warehouse size={19} /></span>
      <span>resenha<span className="brand-light">market</span></span>
    </Link>
  );
}
