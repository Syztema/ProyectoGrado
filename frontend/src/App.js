// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import LoadingSpinner from './components/common/LoadingSpinner';

// Componente para rutas protegidas
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuthContext();

  console.log('🛡️ ProtectedRoute check:', { isAuthenticated, loading, user: user?.username });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Verificando autenticación..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('❌ No autenticado, redirigiendo a login...');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ Usuario autenticado, mostrando contenido protegido');
  return children;
};

// Componente para rutas públicas (solo accesibles si NO está autenticado)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuthContext();

  console.log('🌐 PublicRoute check:', { isAuthenticated, loading, user: user?.username });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Verificando autenticación..." />
      </div>
    );
  }

  if (isAuthenticated) {
    console.log('✅ Usuario ya autenticado, redirigiendo a home...');
    return <Navigate to="/home" replace />;
  }

  console.log('👤 Usuario no autenticado, mostrando página pública');
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Ruta raíz - redirigir basado en autenticación */}
      <Route path="/" element={<Navigate to="/home" replace />} />
      
      {/* Rutas públicas */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      
      {/* Rutas protegidas */}
      <Route 
        path="/home" 
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } 
      />
      
      {/* Ruta 404 */}
      <Route 
        path="*" 
        element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Página no encontrada
              </h1>
              <p className="text-gray-600 mb-4">
                La página que buscas no existe.
              </p>
              <button
                onClick={() => window.location.href = '/'}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Ir al inicio
              </button>
            </div>
          </div>
        } 
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;