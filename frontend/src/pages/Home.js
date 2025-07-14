// src/pages/Home.js - Actualizado con información de AD
import React, { useState, useEffect } from "react";
import { useAuthContext } from "../context/AuthContext";
import { useDeviceFingerprint } from "../hooks/useDeviceFingerprint";
import { useNavigate } from "react-router-dom";
import "../styles/Home.css";

const Home = () => {
  const { user, logout } = useAuthContext();
  const { fingerprint, deviceInfo } = useDeviceFingerprint();
  const navigate = useNavigate();
  
  // Estados para información adicional del usuario
  const [userDetails, setUserDetails] = useState({
    email: user?.email || '',
    displayName: user?.displayName || '',
    groups: [],
    department: user?.department || '',
    title: user?.title || '',
    source: user?.source || 'mysql'
  });
  const [loadingUserInfo, setLoadingUserInfo] = useState(false);

  // Cargar información adicional del usuario al montar el componente
  useEffect(() => {
    if (user && user.username) {
      loadUserDetails();
    }
  }, [user]);

  const loadUserDetails = async () => {
    if (!user || !user.username) return;

    setLoadingUserInfo(true);
    try {
      console.log('🔍 Cargando detalles del usuario:', user.username);
      
      // Intentar obtener información del usuario desde el backend
      const response = await fetch(`/api/users/${user.id || user.username}/with-roles`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('📊 Datos del usuario obtenidos:', userData);
        
        // Actualizar estado con la información obtenida
        setUserDetails(prevDetails => ({
          ...prevDetails,
          email: userData.email || user.email || prevDetails.email,
          displayName: userData.displayName || user.displayName || prevDetails.displayName,
          groups: userData.groups || [],
          department: userData.department || user.department || prevDetails.department,
          title: userData.title || user.title || prevDetails.title,
          source: userData.source || user.source || prevDetails.source
        }));
      } else {
        console.warn('⚠️ No se pudo obtener información adicional del usuario');
        
        // Usar información del contexto si está disponible
        if (user.memberOf || user.groups) {
          setUserDetails(prevDetails => ({
            ...prevDetails,
            groups: user.memberOf || user.groups || [],
            email: user.email || prevDetails.email,
            displayName: user.displayName || prevDetails.displayName,
            department: user.department || prevDetails.department,
            title: user.title || prevDetails.title,
            source: user.source || prevDetails.source
          }));
        }
      }
    } catch (error) {
      console.error('❌ Error cargando detalles del usuario:', error);
      
      // En caso de error, usar la información disponible en el contexto
      if (user.memberOf || user.groups) {
        setUserDetails(prevDetails => ({
          ...prevDetails,
          groups: user.memberOf || user.groups || [],
          email: user.email || prevDetails.email,
          displayName: user.displayName || prevDetails.displayName,
          department: user.department || prevDetails.department,
          title: user.title || prevDetails.title,
          source: user.source || prevDetails.source
        }));
      }
    } finally {
      setLoadingUserInfo(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error durante logout:", error);
    }
  };

  const handleAccessMoodle = () => {
    console.log("El usuario recibido es: ");
    console.log(user);
    if(!user){
      alert("Falta Usuario");
      console.log("Falta Usuario");
      return;
    }else if(!user.username){
      alert("Falta Username");
      console.log("Falta Username");
      return;
    }else if(!user.auth_token){
      alert("Falta Token");
      console.log("Falta Token");
      return;
    }    

    const redirectUrl = new URL(
      "https://moodleud.zieete.com.co/login/index.php"
    );
    redirectUrl.searchParams.append("auth_token", user.auth_token);
    redirectUrl.searchParams.append("username", user.username.trim());
    redirectUrl.searchParams.append("redirect", "/my/");

    // Redirigir al dashboard de Moodle
    window.location.href = redirectUrl.toString();
  };

  // Función para formatear grupos de AD
  const formatADGroups = (groups) => {
    if (!groups || !Array.isArray(groups)) return [];
    
    return groups.map(group => {
      // Si el grupo viene en formato DN (Distinguished Name)
      if (typeof group === 'string' && group.includes('CN=')) {
        const match = group.match(/CN=([^,]+)/i);
        return match ? match[1].trim() : group;
      }
      return group;
    }).filter(group => group && group.length > 0);
  };

  // Función para obtener el ícono según el método de autenticación
  const getAuthSourceIcon = (source) => {
    switch (source) {
      case 'active_directory':
      case 'ad':
        return '🏢';
      case 'mysql':
        return '🔑';
      default:
        return '👤';
    }
  };

  // Función para obtener el nombre del método de autenticación
  const getAuthSourceName = (source) => {
    switch (source) {
      case 'active_directory':
      case 'ad':
        return 'Active Directory';
      case 'mysql':
        return 'Base de Datos';
      default:
        return 'Sistema Local';
    }
  };

  const formattedGroups = formatADGroups(userDetails.groups);

  return (
    <div className="home-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-icon">
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h1 className="header-title">Sistema de Acceso Seguro</h1>
          </div>

          <div className="header-right">
            <div className="status-indicator">
              <div className="status-dot"></div>
              <span className="status-text">Activo</span>
            </div>
            <span className="welcome-text">
              Bienvenido,{" "}
              <strong className="welcome-name">
                {userDetails.displayName || user?.displayName || user?.username}
              </strong>
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
            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <div className="card-header">
                <div className="card-icon blue">
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <h2 className="card-title">Información de la Sesión</h2>
                {loadingUserInfo && (
                  <div className="loading-indicator">
                    <div className="spinner-small"></div>
                  </div>
                )}
              </div>

              <div className="user-info-grid">
                <div>
                  <div className="info-item">
                    <label className="info-label">Usuario</label>
                    <p className="info-value">{user?.username}</p>
                  </div>

                  <div className="info-item" style={{ marginTop: "1rem" }}>
                    <label className="info-label">Email</label>
                    <p className="info-value">
                      {userDetails.email || "No disponible"}
                    </p>
                  </div>

                  <div className="info-item" style={{ marginTop: "1rem" }}>
                    <label className="info-label">Método de Autenticación</label>
                    <div className="auth-source-info">
                      <span className="auth-icon">{getAuthSourceIcon(userDetails.source)}</span>
                      <span className="auth-name">{getAuthSourceName(userDetails.source)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="info-item">
                    <label className="info-label">Nombre Completo</label>
                    <p className="info-value">
                      {userDetails.displayName || "No disponible"}
                    </p>
                  </div>

                  {userDetails.department && (
                    <div className="info-item" style={{ marginTop: "1rem" }}>
                      <label className="info-label">Departamento</label>
                      <p className="info-value">{userDetails.department}</p>
                    </div>
                  )}

                  {userDetails.title && (
                    <div className="info-item" style={{ marginTop: "1rem" }}>
                      <label className="info-label">Cargo</label>
                      <p className="info-value">{userDetails.title}</p>
                    </div>
                  )}

                  <div className="info-item" style={{ marginTop: "1rem" }}>
                    <label className="info-label">
                      {userDetails.source === 'active_directory' || userDetails.source === 'ad' 
                        ? 'Grupos de Active Directory' 
                        : 'Roles del Sistema'}
                    </label>
                    <div className="groups-container">
                      {formattedGroups && formattedGroups.length > 0 ? (
                        <>
                          {formattedGroups.slice(0, 3).map((group, index) => (
                            <span key={index} className="group-tag">
                              {group}
                            </span>
                          ))}
                          {formattedGroups.length > 3 && (
                            <span className="group-tag more">
                              +{formattedGroups.length - 3} más
                            </span>
                          )}
                        </>
                      ) : (
                        <p
                          className="info-value"
                          style={{ fontSize: "0.875rem", color: "#6b7280" }}
                        >
                          {loadingUserInfo ? "Cargando..." : "No disponible"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Información adicional de debug en desarrollo */}
              {process.env.NODE_ENV === 'development' && (
                <div className="debug-info-user" style={{
                  marginTop: "1rem",
                  padding: "0.75rem",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "0.375rem",
                  fontSize: "0.75rem",
                  fontFamily: "monospace"
                }}>
                  <details>
                    <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
                      🔍 Debug Info (Desarrollo)
                    </summary>
                    <div style={{ marginTop: "0.5rem" }}>
                      <strong>Usuario completo:</strong>
                      <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.7rem" }}>
                        {JSON.stringify(user, null, 2)}
                      </pre>
                      <strong>Detalles cargados:</strong>
                      <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.7rem" }}>
                        {JSON.stringify(userDetails, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              )}
            </div>

            {/* Área de Trabajo */}
            <div className="card">
              <div className="card-header">
                <div className="card-icon green">
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <h2 className="card-title">Área de Trabajo</h2>
              </div>

              <div className="work-area">
                <div className="work-icon-container">
                  <svg
                    width="64"
                    height="64"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    style={{ color: "#22c55e" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="work-title">¡Acceso Autorizado!</h3>
                <p className="work-description">
                  Tu dispositivo y ubicación han sido verificados exitosamente.
                  {userDetails.source === 'active_directory' || userDetails.source === 'ad' 
                    ? ' Tu cuenta de Active Directory ha sido autenticada y verificada.'
                    : ' El sistema de seguridad multi-factor ha validado tu identidad.'
                  }
                </p>
                <div className="action-buttons">
                  <button className="access-btn" onClick={handleAccessMoodle}>
                    Acceder al Sistema
                  </button>
                  <button
                    className="config-btn"
                    onClick={() => navigate("/admin")}
                  >
                    ⚙️ Configuración
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Panel de Seguridad */}
          <div>
            {/* Estado de Seguridad */}
            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <div className="card-header">
                <div className="card-icon green">
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
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
                  <span className="security-emoji">
                    {getAuthSourceIcon(userDetails.source)}
                  </span>
                  <span className="security-text">
                    {userDetails.source === 'active_directory' || userDetails.source === 'ad' 
                      ? 'Active Directory verificado'
                      : 'Credenciales válidas'
                    }
                  </span>
                </div>
                {(userDetails.source === 'active_directory' || userDetails.source === 'ad') && formattedGroups.length > 0 && (
                  <div className="security-item">
                    <div className="security-dot"></div>
                    <span className="security-emoji">👥</span>
                    <span className="security-text">Grupos AD autorizados</span>
                  </div>
                )}
              </div>
            </div>

            {/* Información del Dispositivo */}
            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <div className="card-header">
                <div className="card-icon purple">
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="card-title">Información del Dispositivo</h3>
              </div>

              <div className="device-items">
                <div className="device-item fingerprint">
                  <label className="info-label">ID del Dispositivo</label>
                  <div className="device-fingerprint">
                    {fingerprint || "Generando..."}
                  </div>
                </div>

                <div className="device-item">
                  <div className="device-header">
                    <span className="device-emoji">💻</span>
                    <label className="info-label">Plataforma</label>
                  </div>
                  <p className="device-value">
                    {deviceInfo?.platform || "No disponible"}
                  </p>
                </div>

                <div className="device-item">
                  <div className="device-header">
                    <span className="device-emoji">📺</span>
                    <label className="info-label">Resolución</label>
                  </div>
                  <p className="device-value">
                    {deviceInfo?.screenResolution || "No disponible"}
                  </p>
                </div>

                <div className="device-item">
                  <div className="device-header">
                    <span className="device-emoji">🌍</span>
                    <label className="info-label">Zona Horaria</label>
                  </div>
                  <p className="device-value">
                    {deviceInfo?.timezone || "No disponible"}
                  </p>
                </div>
              </div>
            </div>

            {/* Panel de Ayuda */}
            <div className="help-panel">
              <div className="help-header">
                <div className="card-icon blue">
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h4 className="help-title">
                  Sistema de Seguridad Multi-Factor
                </h4>
              </div>
              <p className="help-text">
                Este sistema utiliza verificación de ubicación, identificación
                de dispositivo{userDetails.source === 'active_directory' || userDetails.source === 'ad' 
                  ? ', autenticación de Active Directory y verificación de grupos'
                  : ' y autenticación de base de datos'
                } para garantizar la máxima seguridad de acceso.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;