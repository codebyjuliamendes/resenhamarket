import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { HistoryPage } from './pages/HistoryPage';
import { InventoryPage } from './pages/InventoryPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProductPage } from './pages/ProductPage';
import { UsersPage } from './pages/UsersPage';

function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user?.perfil === 'ADMINISTRADOR' ? children : <Navigate to="/" replace />;
}

function App() {
  const { user } = useAuth();
  if (!user) return <LoginPage />;
  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<InventoryPage />} />
          <Route path="produtos/:id" element={<ProductPage />} />
          <Route path="historico" element={<HistoryPage />} />
          <Route path="usuarios" element={<AdminOnly><UsersPage /></AdminOnly>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}

export default App;
