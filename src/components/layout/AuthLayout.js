// src/components/layout/AuthLayout.js
import React from 'react';

const AuthLayout = ({ 
  children, 
  title = "Sistema de Acceso Seguro",
  subtitle = "Autenticación con verificación de ubicación y dispositivo",
  showLogo = true,
  backgroundGradient = "from-blue-50 to-indigo-100"
}) => {
  return (
    <div className={`min-h-screen bg-gradient-to-br ${backgroundGradient}`}>
      {/* Header opcional */}
      {(showLogo || title) && (
        <div className="pt-8 pb-4">
          <div className="max-w-md mx-auto text-center px-4">
            {showLogo && (
              <div className="mb-4">
                <div className="mx-auto h-16 w-16 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            )}
            
            {title && (
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {title}
              </h1>
            )}
            
            {subtitle && (
              <p className="text-gray-600 text-sm">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-6xl">
          {children}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 w-full pb-4">
        <div className="text-center">
          <p className="text-xs text-gray-500">
            © 2025 Sistema de Acceso Seguro. Todos los derechos reservados.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Verificación Multi-Factor: Ubicación + Dispositivo + Credenciales
          </p>
        </div>
      </div>
    </div>
  );
};

// Componente wrapper para páginas de autenticación
export const AuthContainer = ({ children, className = "" }) => {
  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {children}
    </div>
  );
};

// Componente para secciones dentro del contenedor de auth
export const AuthSection = ({ children, className = "", padding = "p-6" }) => {
  return (
    <div className={`${padding} ${className}`}>
      {children}
    </div>
  );
};

// Componente para el header de secciones
export const AuthSectionHeader = ({ title, subtitle, icon }) => {
  return (
    <div className="mb-6">
      {icon && (
        <div className="mb-3">
          {icon}
        </div>
      )}
      
      {title && (
        <h2 className="text-xl font-semibold text-gray-900">
          {title}
        </h2>
      )}
      
      {subtitle && (
        <p className="text-gray-600 text-sm mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default AuthLayout;