// src/pages/Login.js - Versión actualizada con AD + Geocercas + Roles
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAuthContext } from '../context/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { isWithinArea } from '../utils/geoCheck';
import LocationMap from '../components/auth/LocationMap';
import '../styles/Login.css';

const Login = () => {
  const navigate = useNavigate();
  
  const { login, loading, error, authStep, authMethod, adStatus, clearError, switchAuthMethod } = useAuth();
  const { login: contextLogin, isAuthenticated } = useAuthContext();
  const { location, getCurrentPosition } = useGeolocation();
  
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [isInArea, setIsInArea] = useState(true);
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });

  // Redirigir si ya está autenticado
  useEffect(() => {
    console.log('🔍 Login - Estado de autenticación:', { isAuthenticated, loading });
    
    if (isAuthenticated && !loading) {
      console.log('✅ Usuario ya autenticado, redirigiendo a home...');
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // Verificar ubicación cuando se obtiene
  useEffect(() => {
    if (location) {
      const inside = isWithinArea(location.lat, location.lng);
      setIsInArea(inside);
      if (!inside) {
        setShowLocationDetails(true);
      }
    }
  }, [location]);

  // Limpiar errores automáticamente
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (credentials.username && credentials.password && !loading) {
      try {
        clearError();
        console.log('🚀 Iniciando proceso de login...');
        
        const result = await login(credentials);
        console.log('📊 Resultado del login:', result);
        
        if (result.success && result.user) {
          console.log('✅ Actualizando contexto con usuario:', result.user);
          contextLogin(result.user);
          
          console.log('🔄 Forzando redirección a /home...');
          navigate('/home', { replace: true });
        }
      } catch (err) {
        console.error('❌ Error en login:', err);
      }
    }
  };

  const handleInputChange = (field) => (e) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleCheckLocation = async () => {
    try {
      await getCurrentPosition();
      setShowLocationDetails(true);
    } catch (err) {
      console.error('Error obteniendo ubicación:', err);
    }
  };

  const getStepMessages = () => ({
    location: 'Verificando ubicación...',
    geofence: 'Verificando geocercas autorizadas...',
    computer: 'Verificando equipo en dominio...',
    device: 'Verificando dispositivo...',
    credentials: authMethod === 'ad' ? 'Autenticando con Active Directory...' : 'Autenticando credenciales...',
    authorization: 'Verificando permisos y grupos...',
    success: 'Acceso autorizado'
  });

  const stepMessages = getStepMessages();

  // Mostrar estado de loading durante redirección
  if (isAuthenticated && loading) {
    return (
      <div className="login-container">
        <div style={{ textAlign: 'center' }}>
          <div className="spinner"></div>
          <p>Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-wrapper">
        
        {/* Header */}
        <div className="login-header" style={{ gridColumn: '1 / -1' }}>
          <h1 className="login-title">Sistema de Acceso Seguro</h1>
          <p className="login-subtitle">
            Autenticación multi-factor con Active Directory, verificación de ubicación y dispositivo
          </p>
        </div>

        {/* Selector de método de autenticación */}
        <div className="auth-method-selector" style={{ gridColumn: '1 / -1' }}>
          <div className="method-tabs">
            <button
              type="button"
              className={`method-tab ${authMethod === 'auto' ? 'active' : ''}`}
              onClick={() => switchAuthMethod('auto')}
              disabled={loading}
              title="Detección automática: AD primero, MySQL como respaldo"
            >
              🤖 Automático
            </button>
            <button
              type="button"
              className={`method-tab ${authMethod === 'ad' ? 'active' : ''} ${!adStatus.available ? 'disabled' : ''}`}
              onClick={() => switchAuthMethod('ad')}
              disabled={loading || !adStatus.available}
              title="Autenticación exclusiva con Active Directory"
            >
              🏢 Active Directory
              {!adStatus.available && <span className="status-indicator offline">●</span>}
            </button>
            <button
              type="button"
              className={`method-tab ${authMethod === 'mysql' ? 'active' : ''}`}
              onClick={() => switchAuthMethod('mysql')}
              disabled={loading}
              title="Autenticación con base de datos local"
            >
              🔑 Base de Datos
            </button>
          </div>
          
          <div className="method-description">
            {authMethod === 'auto' && (
              <span>🔄 Detección automática: AD primero, base de datos como respaldo</span>
            )}
            {authMethod === 'ad' && (
              <span>
                {adStatus.available 
                  ? '🟢 Usa tu cuenta de dominio de la empresa' 
                  : '🔴 Active Directory no disponible'
                }
              </span>
            )}
            {authMethod === 'mysql' && (
              <span>🟡 Autenticación con base de datos local</span>
            )}
          </div>
        </div>

        {/* Formulario de login */}
        <div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                {authMethod === 'ad' && '🏢 '}
                {authMethod === 'auto' && '🤖 '}
                {authMethod === 'mysql' && '🔑 '}
                Iniciar Sesión
              </h2>
              
              {/* Estado de AD */}
              {adStatus.checked && (
                <div className={`ad-status ${adStatus.available ? 'available' : 'unavailable'}`}>
                  <span className={`status-dot ${adStatus.available ? 'online' : 'offline'}`}></span>
                  Active Directory: {adStatus.available ? 'Disponible' : 'No disponible'}
                </div>
              )}
            </div>
            
            {loading && (
              <div className="alert alert-info">
                <div className="loading-container">
                  <div className="spinner"></div>
                  <div className="loading-text">
                    {stepMessages[authStep] || "Procesando..."}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-error">
                <strong>Error de autenticación:</strong><br/>
                {error}
                {authMethod === 'auto' && error.includes('Active Directory') && (
                  <div className="error-suggestion">
                    💡 Sugerencia: Puedes intentar con autenticación de base de datos
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  {authMethod === 'ad' ? 'Usuario de dominio' : 'Usuario'}
                </label>
                <input
                  id="username"
                  type="text"
                  value={credentials.username}
                  onChange={handleInputChange('username')}
                  placeholder={
                    authMethod === 'ad' 
                      ? "usuario (sin @empresa.com)" 
                      : "usuario@empresa.com"
                  }
                  disabled={loading}
                  className="form-input"
                  required
                />
                {authMethod === 'ad' && (
                  <small className="form-hint">
                    Ingresa solo tu nombre de usuario, sin el dominio
                  </small>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  {authMethod === 'ad' ? 'Contraseña de dominio' : 'Contraseña'}
                </label>
                <input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={handleInputChange('password')}
                  placeholder="••••••••"
                  disabled={loading}
                  className="form-input"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!credentials.username || !credentials.password || loading}
                className={`btn btn-primary ${authMethod === 'ad' ? 'btn-ad' : ''}`}
              >
                {loading ? 'Verificando...' : 
                 authMethod === 'ad' ? 'Ingresar con AD' : 
                 authMethod === 'auto' ? 'Ingresar (Auto)' : 'Ingresar'}
              </button>
            </form>

            {!location && !loading && (
              <div className="text-center mt-4">
                <button
                  onClick={handleCheckLocation}
                  className="btn-link"
                >
                  📍 Verificar mi ubicación
                </button>
              </div>
            )}

            {/* Requisitos según método */}
            <div className="auth-requirements">
              <h4>Requisitos de acceso:</h4>
              <ul>
                <li className={location && isInArea ? 'requirement-met' : 'requirement-pending'}>
                  📍 Ubicación dentro del área permitida
                </li>
                {(authMethod === 'ad' || authMethod === 'auto') && adStatus.available && (
                  <>
                    <li className="requirement-pending">🖥️ Equipo unido al dominio de la empresa</li>
                    <li className="requirement-pending">🏢 Cuenta en unidades organizacionales autorizadas</li>
                    <li className="requirement-pending">👥 Pertenencia a grupos de seguridad requeridos</li>
                  </>
                )}
                <li className="requirement-pending">📱 Dispositivo autorizado</li>
                <li className="requirement-pending">🔐 Credenciales válidas</li>
              </ul>
            </div>

            <div className="text-center mt-4">
              <p className="text-sm text-gray-500">
                Al iniciar sesión, tu ubicación, dispositivo y credenciales serán verificados por seguridad.
                {(authMethod === 'ad' || authMethod === 'auto') && ' Además se verificará que tu equipo esté en el dominio.'}
              </p>
            </div>
            
            {/* Debug info en desarrollo */}
            {process.env.NODE_ENV === 'development' && (
              <div className="debug-info">
                <strong>Debug:</strong><br/>
                isAuthenticated: {isAuthenticated ? 'true' : 'false'}<br/>
                loading: {loading ? 'true' : 'false'}<br/>
                authStep: {authStep}<br/>
                authMethod: {authMethod}<br/>
                adAvailable: {adStatus.available ? 'true' : 'false'}<br/>
                location: {location ? `${location.lat}, ${location.lng}` : 'none'}
              </div>
            )}
          </div>
        </div>

        {/* Información de ubicación y proceso */}
        <div>
          {showLocationDetails && location ? (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Verificación de Ubicación</h3>
              </div>
              
              <div className="location-map-container">
                <div className={`location-status ${isInArea ? 'location-authorized' : 'location-denied'}`}>
                  <span className={`status-dot ${isInArea ? 'status-dot-green' : 'status-dot-red'}`}></span>
                  {isInArea ? 'Ubicación autorizada' : 'Fuera del área permitida'}
                </div>
                
                <LocationMap
                  location={location}
                  isInArea={isInArea}
                  width="100%"
                  height="300px"
                />
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Proceso de Autenticación</h3>
              </div>
              
              <div className="auth-steps">
                <div className="auth-step">
                  <div className={`step-number ${
                    authStep === 'location' ? 'step-active' :
                    ['geofence', 'computer', 'device', 'credentials', 'authorization', 'success'].includes(authStep) ? 'step-completed' : 'step-inactive'
                  }`}>
                    1
                  </div>
                  <div className="step-content">
                    <div className="step-title">Verificación de Ubicación</div>
                    <div className="step-description">Confirmar que estás en una zona permitida</div>
                  </div>
                </div>

                <div className="auth-step">
                  <div className={`step-number ${
                    authStep === 'geofence' ? 'step-active' :
                    ['computer', 'device', 'credentials', 'authorization', 'success'].includes(authStep) ? 'step-completed' : 'step-inactive'
                  }`}>
                    2
                  </div>
                  <div className="step-content">
                    <div className="step-title">Verificación de Geocercas</div>
                    <div className="step-description">Validar ubicación contra geocercas autorizadas</div>
                  </div>
                </div>

                {(authMethod === 'ad' || authMethod === 'auto') && (
                  <div className="auth-step">
                    <div className={`step-number ${
                      authStep === 'computer' ? 'step-active' :
                      ['device', 'credentials', 'authorization', 'success'].includes(authStep) ? 'step-completed' : 'step-inactive'
                    }`}>
                      3
                    </div>
                    <div className="step-content">
                      <div className="step-title">Verificación de Equipo en Dominio</div>
                      <div className="step-description">Confirmar que el equipo está unido al dominio</div>
                    </div>
                  </div>
                )}

                <div className="auth-step">
                  <div className={`step-number ${
                    authStep === 'device' ? 'step-active' :
                    ['credentials', 'authorization', 'success'].includes(authStep) ? 'step-completed' : 'step-inactive'
                  }`}>
                    {(authMethod === 'ad' || authMethod === 'auto') ? '4' : '3'}
                  </div>
                  <div className="step-content">
                    <div className="step-title">Verificación de Dispositivo</div>
                    <div className="step-description">Validar que el dispositivo está autorizado</div>
                  </div>
                </div>

                <div className="auth-step">
                  <div className={`step-number ${
                    authStep === 'credentials' ? 'step-active' :
                    ['authorization', 'success'].includes(authStep) ? 'step-completed' : 'step-inactive'
                  }`}>
                    {(authMethod === 'ad' || authMethod === 'auto') ? '5' : '4'}
                  </div>
                  <div className="step-content">
                    <div className="step-title">
                      {authMethod === 'ad' ? 'Autenticación Active Directory' : 'Autenticación de Credenciales'}
                    </div>
                    <div className="step-description">
                      {authMethod === 'ad' 
                        ? 'Verificar usuario y contraseña con Active Directory' 
                        : 'Verificar usuario y contraseña con base de datos'}
                    </div>
                  </div>
                </div>

                {(authMethod === 'ad' || authMethod === 'auto') && (
                  <div className="auth-step">
                    <div className={`step-number ${
                      authStep === 'authorization' ? 'step-active' :
                      authStep === 'success' ? 'step-completed' : 'step-inactive'
                    }`}>
                      6
                    </div>
                    <div className="step-content">
                      <div className="step-title">Verificación de Autorización</div>
                      <div className="step-description">Verificar OUs, grupos y permisos</div>
                    </div>
                  </div>
                )}

                <div className="auth-step">
                  <div className={`step-number ${authStep === 'success' ? 'step-completed' : 'step-inactive'}`}>
                    ✓
                  </div>
                  <div className="step-content">
                    <div className="step-title">Acceso Autorizado</div>
                    <div className="step-description">Bienvenido al sistema</div>
                  </div>
                </div>
              </div>

              {loading && (
                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                  <div className="loading-container">
                    <div className="spinner"></div>
                    <div className="loading-text">
                      Procesando autenticación...
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Información adicional */}
        <div className="info-footer" style={{ gridColumn: '1 / -1' }}>
          <div className="info-card">
            <p className="info-text">
              <span className="info-highlight">Seguridad Multi-Factor Avanzada:</span> Este sistema utiliza 
              verificación de ubicación con geocercas, identificación de dispositivo, 
              {(authMethod === 'ad' || authMethod === 'auto') && ' verificación de dominio Active Directory,'} 
              {' '}autenticación robusta y control de roles para garantizar el acceso autorizado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;