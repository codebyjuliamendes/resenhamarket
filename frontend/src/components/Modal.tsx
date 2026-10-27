import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

const focusable = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Modal({ title, subtitle, onClose, children, size }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; size?: 'small' }) {
  const titleId = useId();
  const dialog = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    const first = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>('input,select,textarea') ?? node?.querySelector<HTMLElement>(focusable);
    first?.focus();
    document.body.classList.add('modal-open');
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); close.current(); return; }
      if (event.key !== 'Tab' || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>(focusable)];
      if (!items.length) return;
      const [head, tail] = [items[0], items[items.length - 1]];
      if (event.shiftKey && document.activeElement === head) { event.preventDefault(); tail.focus(); }
      else if (!event.shiftKey && document.activeElement === tail) { event.preventDefault(); head.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
      previous?.focus?.();
    };
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section ref={dialog} className={`modal ${size === 'small' ? 'modal-small' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar janela"><X size={18} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel, danger, busy, error, onConfirm, onClose }: { title: string; message: ReactNode; confirmLabel: string; danger?: boolean; busy?: boolean; error?: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal title={title} onClose={onClose} size="small">
      <div className="confirm-body">{message}</div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
        <button type="button" data-autofocus className={danger ? 'danger' : 'primary'} disabled={busy} onClick={onConfirm}>{busy ? 'Aguarde…' : confirmLabel}</button>
      </div>
    </Modal>
  );
}
