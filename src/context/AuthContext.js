// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext debe ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar sesión existente al cargar la aplicación
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        console.log('🔍 AuthContext - Verificando sesión existente...');
        setLoading(true);
        
        const sessionData = await authService.checkSession();
        console.log('📊 AuthContext - Respuesta de sesión:', sessionData);
        
        if (sessionData.authenticated && sessionData.user) {
          console.log('✅ AuthContext - Sesión válida encontrada:', sessionData.user);
          setUser(sessionData.user);
          setIsAuthenticated(true);
        } else {
          console.log('❌ AuthContext - No hay sesión válida');
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('❌ AuthContext - Error verificando sesión existente:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
        console.log('🏁 AuthContext - Verificación de sesión completada');
      }
    };

    checkExistingSession();
  }, []);

  const login = (userData) => {
    console.log('✅ AuthContext - Login:', userData);
    setUser(userData);
    setIsAuthenticated(true);
    setLoading(false);
  };

  const logout = async () => {
    try {
      console.log('🚪 AuthContext - Cerrando sesión...');
      setLoading(true);
      await authService.logout();
    } catch (error) {
      console.error('❌ AuthContext - Error durante logout:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      console.log('✅ AuthContext - Sesión cerrada');
    }
  };

  const updateUser = (userData) => {
    console.log('🔄 AuthContext - Actualizando usuario:', userData);
    setUser(prevUser => ({
      ...prevUser,
      ...userData
    }));
  };

  // 🎯 AÑADIR: Log del estado actual para debugging
  useEffect(() => {
    console.log('📊 AuthContext State Update:', {
      user: user?.username || 'No user',
      isAuthenticated,
      loading
    });
  }, [user, isAuthenticated, loading]);

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};