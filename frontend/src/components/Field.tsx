import { useId, type ReactNode } from 'react';

export type FieldControlProps = { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string };

/**
 * Rótulo, controle e mensagem ligados por id: o erro ou a dica é lido pelo leitor de tela
 * como descrição do campo, sem entrar no nome dele.
 */
export function Field({ label, optional, error, hint, children }: { label: ReactNode; optional?: boolean; error?: string | null; hint?: ReactNode; children: (props: FieldControlProps) => ReactNode }) {
  const id = useId();
  const messageId = `${id}-mensagem`;
  const message = error || hint;
  return (
    <div className="field">
      <label htmlFor={id}>{label}{optional && <span className="optional"> opcional</span>}</label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': message ? messageId : undefined })}
      {error ? <small id={messageId} className="field-error">{error}</small> : hint ? <small id={messageId} className="hint">{hint}</small> : null}
    </div>
  );
}
