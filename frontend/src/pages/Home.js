// src/pages/Home.js
import React from 'react';
import { useAuthContext } from '../context/AuthContext';
import { useDeviceFingerprint } from '../hooks/useDeviceFingerprint';
import '../styles/Home.css';

const Home = () => {
  const { user, logout } = useAuthContext();
  const { fingerprint, deviceInfo } = useDeviceFingerprint();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error durante logout:', error);
    }
  };

  return (
    <div className="home-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-icon">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="header-title">
              Sistema de Acceso Seguro
            </h1>
          </div>
          
          <div className="header-right">
            <div className="status-indicator">
              <div className="status-dot"></div>
              <span className="status-text">Activo</span>
            </div>
            <span className="welcome-text">
              Bienvenido, <strong className="welcome-name">{user?.displayName || user?.username}</strong>
            </span>
            <button onClick={handleLogout} className="logout-btn">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="grid-layout">
          
          {/* Información del Usuario */}
          <div>
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <div className="card-icon blue">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="card-title">Información de la Sesión</h2>
              </div>
              
              <div className="user-info-grid">
                <div>
                  <div className="info-item">
                    <label className="info-label">Usuario</label>
                    <p className="info-value">{user?.username}</p>
                  </div>
                  
                  <div className="info-item" style={{ marginTop: '1rem' }}>
                    <label className="info-label">Email</label>
                    <p className="info-value">{user?.email || 'No disponible'}</p>
                  </div>
                </div>
                
                <div>
                  <div className="info-item">
                    <label className="info-label">Nombre Completo</label>
                    <p className="info-value">{user?.displayName || 'No disponible'}</p>
                  </div>
                  
                  <div className="info-item" style={{ marginTop: '1rem' }}>
                    <label className="info-label">Grupos AD</label>
                    <div className="groups-container">
                      {user?.groups && user.groups.length > 0 ? (
                        <>
                          {user.groups.slice(0, 3).map((group, index) => (
                            <span key={index} className="group-tag">
                              {group.split(',')[0].replace('CN=', '')}
                            </span>
                          ))}
                          {user.groups.length > 3 && (
                            <span className="group-tag more">
                              +{user.groups.length - 3} más
                            </span>
                          )}
                        </>
                      ) : (
                        <p className="info-value" style={{ fontSize: '0.875rem', color: '#6b7280' }}>No disponible</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Área de Trabajo */}
            <div className="card">
              <div className="card-header">
                <div className="card-icon green">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h2 className="card-title">Área de Trabajo</h2>
              </div>
              
              <div className="work-area">
                <div className="work-icon-container">
                  <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#22c55e' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="work-title">¡Acceso Autorizado!</h3>
                <p className="work-description">
                  Tu dispositivo y ubicación han sido verificados exitosamente.
                  El sistema de seguridad multi-factor ha validado tu identidad.
                </p>
                <button className="access-btn">
                  Acceder al Sistema
                </button>
              </div>
            </div>
          </div>

          {/* Panel de Seguridad */}
          <div>
            
            {/* Estado de Seguridad */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <div className="card-icon green">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="card-title">Estado de Seguridad</h3>
              </div>
              
              <div className="security-items">
                <div className="security-item">
                  <div className="security-dot"></div>
                  <span className="security-emoji">📍</span>
                  <span className="security-text">Ubicación verificada</span>
                </div>
                <div className="security-item">
                  <div className="security-dot"></div>
                  <span className="security-emoji">📱</span>
                  <span className="security-text">Dispositivo autorizado</span>
                </div>
                <div className="security-item">
                  <div className="security-dot"></div>
                  <span className="security-emoji">🔐</span>
                  <span className="security-text">Credenciales válidas</span>
                </div>
              </div>
            </div>

            {/* Información del Dispositivo */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <div className="card-icon purple">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="card-title">Información del Dispositivo</h3>
              </div>
              
              <div className="device-items">
                <div className="device-item fingerprint">
                  <label className="info-label">ID del Dispositivo</label>
                  <div className="device-fingerprint">
                    {fingerprint || 'Generando...'}
                  </div>
                </div>
                
                <div className="device-item">
                  <div className="device-header">
                    <span className="device-emoji">💻</span>
                    <label className="info-label">Plataforma</label>
                  </div>
                  <p className="device-value">{deviceInfo?.platform || 'No disponible'}</p>
                </div>
                
                <div className="device-item">
                  <div className="device-header">
                    <span className="device-emoji">📺</span>
                    <label className="info-label">Resolución</label>
                  </div>
                  <p className="device-value">{deviceInfo?.screenResolution || 'No disponible'}</p>
                </div>
                
                <div className="device-item">
                  <div className="device-header">
                    <span className="device-emoji">🌍</span>
                    <label className="info-label">Zona Horaria</label>
                  </div>
                  <p className="device-value">{deviceInfo?.timezone || 'No disponible'}</p>
                </div>
              </div>
            </div>

            {/* Panel de Ayuda */}
            <div className="help-panel">
              <div className="help-header">
                <div className="card-icon blue">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="help-title">Sistema de Seguridad Multi-Factor</h4>
              </div>
              <p className="help-text">
                Este sistema utiliza verificación de ubicación, identificación de dispositivo 
                y autenticación de Active Directory para garantizar la máxima seguridad de acceso.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;