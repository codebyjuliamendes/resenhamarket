import { Link } from 'react-router-dom';

export function BrandMark({ size = 18 }: { size?: number }) {
  return (
    <span className="brand-mark" aria-hidden>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M7 21v-8h10v8" /><path d="M7 17h10" />
      </svg>
    </span>
  );
}

export function Brand({ inverse = false, link = true }: { inverse?: boolean; link?: boolean }) {
  const content = <><BrandMark /><span>resenha<span className="brand-light">market</span></span></>;
  const className = `brand ${inverse ? 'brand-inverse' : ''}`;
  return link
    ? <Link className={className} to="/" aria-label="ResenhaMarket, ir para o estoque">{content}</Link>
    : <span className={className}>{content}</span>;
}
