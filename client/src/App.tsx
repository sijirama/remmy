import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import AuthRedirect from './components/AuthRedirect';
import Landing from './pages/Landing';
import Me from './pages/Dashboard';
import LogDetail from './pages/LogDetail';
import Chat from './pages/Chat';
import NotFound from './pages/NotFound';
import { Toaster } from 'sonner';

function App() {
  return (
    <AuthProvider>
      <Toaster theme="light" position="bottom-center" richColors />
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route element={<AuthRedirect />}>
                <Route index element={<Landing />} />
              </Route>
              <Route path="me" element={
                <ProtectedRoute>
                  <Me />
                </ProtectedRoute>
              } />
              <Route path="logs/:id" element={
                <ProtectedRoute>
                  <LogDetail />
                </ProtectedRoute>
              } />
              <Route path="chat" element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              } />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
