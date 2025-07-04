// src/components/auth/LoginForm.js
import React, { useState } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { AUTH_STEP_MESSAGES } from '../../utils/constants';

const LoginForm = ({ onSubmit, loading, error, authStep }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (credentials.username && credentials.password) {
      onSubmit(credentials);
    }
  };

  const handleInputChange = (field) => (e) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const isFormValid = credentials.username && credentials.password;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Iniciar Sesión
        </h2>
        
        {loading && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <LoadingSpinner 
              message={AUTH_STEP_MESSAGES[authStep] || "Procesando..."} 
              size="small" 
            />
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="username" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Usuario
            </label>
            <input
              id="username"
              type="text"
              value={credentials.username}
              onChange={handleInputChange('username')}
              placeholder="usuario@empresa.com"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
            />
          </div>

          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={credentials.password}
              onChange={handleInputChange('password')}
              placeholder="••••••••"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
            />
          </div>

          <button
            type="submit"
            disabled={!isFormValid || loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Al iniciar sesión, tu ubicación y dispositivo serán verificados por seguridad.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;