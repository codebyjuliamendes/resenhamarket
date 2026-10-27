import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';

const Context = createContext<(text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState('');
  const timer = useRef<number>();
  const notify = useCallback((message: string) => {
    window.clearTimeout(timer.current);
    setText(message);
    timer.current = window.setTimeout(() => setText(''), 4000);
  }, []);
  return (
    <Context.Provider value={notify}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {text && <div className="toast"><Check size={16} aria-hidden />{text}</div>}
      </div>
    </Context.Provider>
  );
}

export const useToast = () => useContext(Context);
