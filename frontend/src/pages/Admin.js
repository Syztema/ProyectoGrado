// src/pages/Admin.js
import React, { useState, useEffect } from "react";
import { useAuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../styles/Admin.css";

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState({});
  const [logs, setLogs] = useState([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [formData, setFormData] = useState({});
  const [sessionChecked, setSessionChecked] = useState(false);

  //Regreso a Home
  const handleGoHome = () => {
    navigate("/home");
  };

  // Verificar autenticación al cargar
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      // Primero verificar si hay sesión en el backend
      const response = await fetch("/api/auth/check-session", {
        credentials: "include",
      });

      const data = await response.json();

      if (!data.authenticated) {
        // Si no hay sesión en el backend pero hay usuario en el frontend, sincronizar
        if (user && user.username) {
          console.log("🔄 Sincronizando sesión del frontend con el backend...");

          const syncResponse = await fetch("/api/auth/sync-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              username: user.username,
              displayName: user.displayName,
              email: user.email,
            }),
          });

          const syncData = await syncResponse.json();

          if (syncData.success) {
            console.log("✅ Sesión sincronizada");
            setSessionChecked(true);
          } else {
            console.log("✅ Sesión sincronizada");
            setSessionChecked(true);
          }
        } else {
          alert("Debes estar logueado para acceder al panel de administración");
          window.location.href = "/login";
        }
      } else {
        setSessionChecked(true);
      }
    } catch (error) {
      console.log("✅ Sesión sincronizada");
      setSessionChecked(true);
    }
  };

  // Cargar datos iniciales solo cuando esté autenticado
  useEffect(() => {
    if (sessionChecked) {
      loadDashboardData();
    }
  }, [sessionChecked]);

  // Cargar logs cuando se selecciona la sección
  useEffect(() => {
    if (activeSection === "logs" && sessionChecked) {
      loadLogs();
    }
  }, [activeSection, sessionChecked]);

  // Cargar configuración cuando se selecciona la sección
  useEffect(() => {
    if (activeSection === 'settings' && sessionChecked) {
      loadConfig();
    }
  }, [activeSection, sessionChecked]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadUsers(), loadDevices(), loadStats()]);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/admin/users", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Error al cargar usuarios");
      }

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
      alert("Error cargando usuarios: " + error.message);
    }
  };

  const loadDevices = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/admin/devices", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Error al cargar dispositivos");
      }

      const data = await response.json();
      setDevices(data);
    } catch (error) {
      console.error("Error cargando dispositivos:", error);
      alert("Error cargando dispositivos: " + error.message);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/admin/stats", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Error al cargar estadísticas");
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
      alert("Error cargando estadísticas: " + error.message);
    }
  };

  const loadLogs = async (page = 1) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/admin/logs?page=${page}&limit=20`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Error al cargar logs");
      }

      const data = await response.json();
      setLogs(data.logs);
      setLogsPage(data.page);
      setLogsTotalPages(data.totalPages);
    } catch (error) {
      console.error("Error cargando logs:", error);
      alert("Error cargando logs: " + error.message);
    }
  };

  const loadConfig = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/config', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar configuración');
      }
      
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error cargando configuración:', error);
      alert('Error cargando configuración: ' + error.message);
    }
  };

  const handleConfigUpdate = async (key, value) => {
    try {
      const response = await fetch(`http://localhost:3001/api/admin/config/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ value })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Actualizar el estado local
        setConfig(prev => ({
          ...prev,
          [key]: { ...prev[key], value }
        }));
        alert(result.message);
      } else {
        alert('Error actualizando configuración: ' + result.error);
      }
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      alert('Error actualizando configuración: ' + error.message);
    }
  };

  const handleResetConfig = async () => {
    if (!window.confirm('¿Estás seguro de que quieres restablecer todas las configuraciones a los valores por defecto?')) {
      return;
    }
    
    try {
      const response = await fetch('http://localhost:3001/api/admin/config/reset', {
        method: 'POST',
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (response.ok) {
        await loadConfig(); // Recargar configuraciones
        alert(result.message);
      } else {
        alert('Error restableciendo configuraciones: ' + result.error);
      }
    } catch (error) {
      console.error('Error restableciendo configuraciones:', error);
      alert('Error restableciendo configuraciones: ' + error.message);
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      const response = await fetch("http://localhost:3001/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (response.ok) {
        await loadUsers();
        setShowModal(false);
        setFormData({});
        alert("Usuario creado exitosamente");
      } else {
        alert("Error creando usuario: " + result.error);
      }
    } catch (error) {
      console.error("Error creando usuario:", error);
      alert("Error creando usuario: " + error.message);
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/admin/users/${userId}/toggle`, {
        method: "POST",
        credentials: "include",
      });

      const result = await response.json();

      if (response.ok) {
        await loadUsers();
        alert(result.message);
      } else {
        alert("Error actualizando usuario: " + result.error);
      }
    } catch (error) {
      console.error("Error actualizando usuario:", error);
      alert("Error actualizando usuario: " + error.message);
    }
  };

  const handleRevokeDevice = async (deviceId) => {
    if (
      !window.confirm("¿Estás seguro de que quieres revocar este dispositivo?")
    ) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/admin/devices/${deviceId}/revoke`, {
        method: "POST",
        credentials: "include",
      });

      const result = await response.json();

      if (response.ok) {
        await loadDevices();
        alert(result.message);
      } else {
        alert("Error revocando dispositivo: " + result.error);
      }
    } catch (error) {
      console.error("Error revocando dispositivo:", error);
      alert("Error revocando dispositivo: " + error.message);
    }
  };

  const handleAuthorizeDevice = async (deviceData) => {
    try {
      const response = await fetch("http://localhost:3001/api/admin/devices/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(deviceData),
      });

      const result = await response.json();

      if (response.ok) {
        await loadDevices();
        setShowModal(false);
        setFormData({});
        alert(result.message);
      } else {
        alert("Error autorizando dispositivo: " + result.error);
      }
    } catch (error) {
      console.error("Error autorizando dispositivo:", error);
      alert("Error autorizando dispositivo: " + error.message);
    }
  };

  const handleCleanupDevices = async () => {
    const days = prompt(
      "¿Cuántos días de inactividad considerar? (por defecto 90):",
      "90"
    );
    if (!days) return;

    if (
      !window.confirm(
        `¿Estás seguro de que quieres revocar todos los dispositivos inactivos por más de ${days} días?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch("http://localhost:3001/api/admin/devices/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ days: parseInt(days) }),
      });

      const result = await response.json();

      if (response.ok) {
        await loadDevices();
        alert(result.message);
      } else {
        alert("Error limpiando dispositivos: " + result.error);
      }
    } catch (error) {
      console.error("Error limpiando dispositivos:", error);
      alert("Error limpiando dispositivos: " + error.message);
    }
  };

  const openModal = (type, data = {}) => {
    setModalType(type);
    setFormData(data);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType("");
    setFormData({});
  };

  const renderDashboard = () => (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>📊 Dashboard del Sistema</h2>
        <button onClick={loadDashboardData} className="refresh-btn">
          🔄 Actualizar
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Usuarios</h3>
            <div className="stat-number">{stats.totalUsers || 0}</div>
            <div className="stat-detail">
              {stats.activeUsers || 0} activos, {stats.inactiveUsers || 0}{" "}
              inactivos
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📱</div>
          <div className="stat-content">
            <h3>Dispositivos</h3>
            <div className="stat-number">{stats.totalDevices || 0}</div>
            <div className="stat-detail">
              {stats.activeDevices || 0} activos
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔐</div>
          <div className="stat-content">
            <h3>Logins (7 días)</h3>
            <div className="stat-number">{stats.recentLogins || 0}</div>
            <div className="stat-detail">Accesos exitosos</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>Promedio</h3>
            <div className="stat-number">{stats.avgDevices || 0}</div>
            <div className="stat-detail">Dispositivos por usuario</div>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h3>⚡ Acciones Rápidas</h3>
        <div className="action-buttons">
          <button
            onClick={() => openModal("createUser")}
            className="action-btn primary"
          >
            ➕ Crear Usuario
          </button>
          <button
            onClick={() => openModal("authorizeDevice")}
            className="action-btn secondary"
          >
            📱 Autorizar Dispositivo
          </button>
          <button
            onClick={() => setActiveSection("users")}
            className="action-btn"
          >
            👥 Ver Usuarios
          </button>
          <button
            onClick={() => setActiveSection("devices")}
            className="action-btn"
          >
            📱 Ver Dispositivos
          </button>
          <button
            onClick={() => handleCleanupDevices()}
            className="action-btn secondary"
          >
            🧹 Limpiar Inactivos
          </button>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="admin-users">
      <div className="section-header">
        <h2>👥 Gestión de Usuarios</h2>
        <button onClick={() => openModal("createUser")} className="create-btn">
          ➕ Crear Usuario
        </button>
      </div>
      
      <div className="users-grid">
        {users.map((user) => (
          <div key={user.id} className="user-card">
            <div className="user-header">
              <div className="user-avatar">
                {user.full_name
                  ? user.full_name.charAt(0).toUpperCase()
                  : user.username.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <h4>{user.full_name || user.username}</h4>
                <p>{user.email || user.username}</p>
              </div>
              <div
                className={`user-status ${
                  user.suspended ? "inactive" : "active"
                }`}
              >
                {user.suspended ? "🔒 Desactivado" : "✅ Activo"}
              </div>
            </div>

            <div className="user-details">
              <div className="detail-item">
                <span>Dispositivos:</span>
                <strong>{user.device_count || 0}</strong>
              </div>
              <div className="detail-item">
                <span>Creado:</span>
                <strong>
                  {new Date(user.timecreated * 1000).toLocaleDateString()}
                </strong>
              </div>
            </div>

            <div className="user-actions">
              <button
                onClick={() => handleToggleUserStatus(user.id)}
                className={`toggle-btn ${
                  user.suspended ? "activate" : "deactivate"
                }`}
              >
                {user.suspended ? "🔓 Activar" : "🔒 Desactivar"}
              </button>
              <button
                className="edit-btn"
                onClick={() => openModal("editUser", user)}
              >
                ✏️ Editar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDevices = () => (
    <div className="admin-devices">
      <div className="section-header">
        <h2>📱 Gestión de Dispositivos</h2>
        <div>
          <button
            onClick={() => openModal("authorizeDevice")}
            className="create-btn"
          >
            ➕ Autorizar Dispositivo
          </button>
          <button
            onClick={() => handleCleanupDevices()}
            className="create-btn"
            style={{
              marginLeft: "0.5rem",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
            }}
          >
            🧹 Limpiar Inactivos
          </button>
        </div>
      </div>

      <div className="devices-grid">
        {devices.map((device) => (
          <div key={device.id} className="device-card">
            <div className="device-header">
              <div className="device-icon">
                {device.device_info?.platform === "Win32"
                  ? "🖥️"
                  : device.device_info?.platform === "MacIntel"
                  ? "🍎"
                  : device.device_info?.platform?.includes("Linux")
                  ? "🐧"
                  : "📱"}
              </div>
              <div className="device-info">
                <h4>{device.username}</h4>
                <p>
                  {device.device_info?.platform || "Plataforma desconocida"}
                </p>
              </div>
              <div
                className={`device-status ${
                  device.is_active ? "active" : "revoked"
                }`}
              >
                {device.is_active ? "✅ Activo" : "❌ Revocado"}
              </div>
            </div>

            <div className="device-details">
              <div className="detail-item">
                <span>Huella:</span>
                <code>{device.fingerprint.substring(0, 16)}...</code>
              </div>
              <div className="detail-item">
                <span>Autorización:</span>
                <strong>
                  {device.auto_authorized ? "Automática" : "Manual"}
                </strong>
              </div>
              <div className="detail-item">
                <span>Última conexión:</span>
                <strong>
                  {device.last_seen
                    ? new Date(device.last_seen).toLocaleDateString()
                    : "Nunca"}
                </strong>
              </div>
            </div>

            <div className="device-actions">
              {device.is_active && (
                <button
                  onClick={() => handleRevokeDevice(device.id)}
                  className="revoke-btn"
                >
                  ❌ Revocar
                </button>
              )}
              <button className="details-btn">ℹ️ Detalles</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLogs = () => (
    <div className="admin-logs">
      <div className="section-header">
        <h2>📋 Logs de Auditoría</h2>
        <div>
          <button onClick={() => loadLogs(1)} className="refresh-btn">
            🔄 Actualizar
          </button>
          <button
            onClick={() => {
              if (
                window.confirm(
                  "¿Estás seguro de que quieres limpiar logs antiguos?"
                )
              ) {
                alert("Función de limpieza de logs - implementar API");
              }
            }}
            className="create-btn"
            style={{
              marginLeft: "0.5rem",
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
            }}
          >
            🗑️ Limpiar Logs
          </button>
        </div>
      </div>

      <div className="logs-container">
        <div className="logs-table">
          <div className="table-header">
            <div className="table-cell">Fecha</div>
            <div className="table-cell">Usuario</div>
            <div className="table-cell">Acción</div>
            <div className="table-cell">Estado</div>
            <div className="table-cell">IP</div>
            <div className="table-cell">Dispositivo</div>
          </div>

          {logs.map((log) => (
            <div key={log.id} className="table-row">
              <div className="table-cell">
                {new Date(log.created_at).toLocaleDateString()}
                <br />
                <small>{new Date(log.created_at).toLocaleTimeString()}</small>
              </div>
              <div className="table-cell">
                <strong>{log.username}</strong>
              </div>
              <div className="table-cell">
                <span className="action-badge">
                  {log.auth_step} ({log.auth_method})
                </span>
              </div>
              <div className="table-cell">
                <span
                  className={`status-badge ${
                    log.success ? "success" : "error"
                  }`}
                >
                  {log.success ? "✅ Éxito" : "❌ Error"}
                </span>
                {log.error_message && (
                  <div className="error-message">{log.error_message}</div>
                )}
              </div>
              <div className="table-cell">
                <code>{log.ip_address}</code>
              </div>
              <div className="table-cell">
                <small>
                  {log.device_fingerprint
                    ? log.device_fingerprint.substring(0, 8) + "..."
                    : "N/A"}
                </small>
              </div>
            </div>
          ))}
        </div>

        <div className="pagination">
          <button
            onClick={() => loadLogs(logsPage - 1)}
            disabled={logsPage <= 1}
            className="pagination-btn"
          >
            ← Anterior
          </button>
          <span className="pagination-info">
            Página {logsPage} de {logsTotalPages}
          </span>
          <button
            onClick={() => loadLogs(logsPage + 1)}
            disabled={logsPage >= logsTotalPages}
            className="pagination-btn"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="admin-settings">
      <div className="section-header">
        <h2>⚙️ Configuración del Sistema</h2>
        <div>
          <button onClick={loadConfig} className="refresh-btn">
            🔄 Actualizar
          </button>
          <button 
            onClick={handleResetConfig}
            className="create-btn" 
            style={{ 
              marginLeft: '0.5rem', 
              background: 'linear-gradient(135deg, #f59e0b, #d97706)' 
            }}
          >
            🔄 Restablecer
          </button>
        </div>
      </div>
      
      <div className="config-grid">
        {/* Configuración de Autenticación */}
        <div className="config-section">
          <h3>🔐 Autenticación</h3>
          
          <div className="config-item">
            <label className="config-label">
              <span className="config-title">Método de Autenticación</span>
              <span className="config-description">
                {config.auth_method?.description}
              </span>
            </label>
            <select 
              value={config.auth_method?.value || 'mysql'}
              onChange={(e) => handleConfigUpdate('auth_method', e.target.value)}
              className="config-select"
            >
              <option value="mysql">MySQL</option>
              <option value="ad">Active Directory</option>
              <option value="mixed">Mixto (MySQL + AD)</option>
            </select>
          </div>

          <div className="config-item">
            <label className="config-label">
              <span className="config-title">Máximo de Intentos de Login</span>
              <span className="config-description">
                {config.max_login_attempts?.description}
              </span>
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={config.max_login_attempts?.value || '5'}
              onChange={(e) => handleConfigUpdate('max_login_attempts', e.target.value)}
              className="config-input"
            />
          </div>

          <div className="config-item">
            <label className="config-label">
              <span className="config-title">Timeout de Sesión (milisegundos)</span>
              <span className="config-description">
                {config.session_timeout?.description} 
                <br />
                <small>Actual: {((config.session_timeout?.value || 86400000) / 1000 / 60 / 60).toFixed(1)} horas</small>
              </span>
            </label>
            <select
              value={config.session_timeout?.value || '86400000'}
              onChange={(e) => handleConfigUpdate('session_timeout', e.target.value)}
              className="config-select"
            >
              <option value="3600000">1 hora</option>
              <option value="7200000">2 horas</option>
              <option value="14400000">4 horas</option>
              <option value="28800000">8 horas</option>
              <option value="43200000">12 horas</option>
              <option value="86400000">24 horas</option>
              <option value="604800000">7 días</option>
            </select>
          </div>
        </div>

        {/* Configuración de Dispositivos */}
        <div className="config-section">
          <h3>📱 Dispositivos</h3>
          
          <div className="config-item">
            <label className="config-label">
              <span className="config-title">Auto-autorizar Dispositivos</span>
              <span className="config-description">
                {config.auto_authorize_devices?.description}
              </span>
            </label>
            <div className="config-toggle">
              <input
                type="checkbox"
                id="auto_authorize_devices"
                checked={config.auto_authorize_devices?.value === 'true'}
                onChange={(e) => handleConfigUpdate('auto_authorize_devices', e.target.checked ? 'true' : 'false')}
                className="config-checkbox"
              />
              <label htmlFor="auto_authorize_devices" className="toggle-label">
                {config.auto_authorize_devices?.value === 'true' ? 'Activado' : 'Desactivado'}
              </label>
            </div>
          </div>

          <div className="config-item">
            <label className="config-label">
              <span className="config-title">Máximo Dispositivos por Usuario</span>
              <span className="config-description">
                {config.max_devices_per_user?.description}
              </span>
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={config.max_devices_per_user?.value || '3'}
              onChange={(e) => handleConfigUpdate('max_devices_per_user', e.target.value)}
              className="config-input"
            />
          </div>

          <div className="config-item">
            <label className="config-label">
              <span className="config-title">Días de Inactividad para Revocación</span>
              <span className="config-description">
                {config.device_inactivity_days?.description}
              </span>
            </label>
            <select
              value={config.device_inactivity_days?.value || '90'}
              onChange={(e) => handleConfigUpdate('device_inactivity_days', e.target.value)}
              className="config-select"
            >
              <option value="7">7 días</option>
              <option value="14">14 días</option>
              <option value="30">30 días</option>
              <option value="60">60 días</option>
              <option value="90">90 días</option>
              <option value="180">180 días</option>
              <option value="365">1 año</option>
            </select>
          </div>
        </div>

        {/* Configuración del Sistema */}
        <div className="config-section">
          <h3>🛠️ Sistema</h3>
          
          <div className="config-item">
            <label className="config-label">
              <span className="config-title">Modo de Mantenimiento</span>
              <span className="config-description">
              </span>
            </label>
            <div className="config-toggle">
              <input
                type="checkbox"
                id="maintenance_mode"
                checked={config.maintenance_mode?.value === 'true'}
                onChange={(e) => handleConfigUpdate('maintenance_mode', e.target.checked ? 'true' : 'false')}
                className="config-checkbox"
              />
              <label htmlFor="maintenance_mode" className="toggle-label">
                {config.maintenance_mode?.value === 'true' ? 'Activado' : 'Desactivado'}
              </label>
            </div>
          </div>

          <div className="config-item">
            <label className="config-label">
              <span className="config-title">Versión del Sistema</span>
              <span className="config-description">
                {config.system_version?.description}
              </span>
            </label>
            <input
              type="text"
              value={config.system_version?.value || '1.0.0'}
              onChange={(e) => handleConfigUpdate('system_version', e.target.value)}
              className="config-input"
              placeholder="Ej: 1.0.0"
            />
          </div>
        </div>
      </div>

      {/* Estado del Sistema */}
      <div className="system-status">
        <h3>📊 Estado del Sistema</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Modo de Mantenimiento:</span>
            <span className={`status-value ${config.maintenance_mode?.value === 'true' ? 'warning' : 'success'}`}>
              {config.maintenance_mode?.value === 'true' ? '⚠️ Activo' : '✅ Inactivo'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Auto-autorización:</span>
            <span className={`status-value ${config.auto_authorize_devices?.value === 'true' ? 'success' : 'info'}`}>
              {config.auto_authorize_devices?.value === 'true' ? '✅ Habilitada' : 'ℹ️ Deshabilitada'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Método de Auth:</span>
            <span className="status-value info">
              📋 {(config.auth_method?.value || 'mysql').toUpperCase()}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Versión:</span>
            <span className="status-value info">
              🏷️ {config.system_version?.value || '1.0.0'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderModal = () => {
    if (!showModal) return null;

    return (
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>
              {modalType === "createUser" && "➕ Crear Usuario"}
              {modalType === "editUser" && "✏️ Editar Usuario"}
              {modalType === "authorizeDevice" && "📱 Autorizar Dispositivo"}
            </h3>
            <button onClick={closeModal} className="modal-close">
              ✕
            </button>
          </div>

          <div className="modal-body">
            {modalType === "createUser" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  handleCreateUser({
                    username: formData.get("username"),
                    password: formData.get("password"),
                    full_name: formData.get("full_name"),
                    email: formData.get("email"),
                  });
                }}
              >
                <div className="form-group">
                  <label>Usuario (email):</label>
                  <input type="email" name="username" required />
                </div>
                <div className="form-group">
                  <label>Contraseña:</label>
                  <input type="password" name="password" required />
                </div>
                <div className="form-group">
                  <label>Nombre completo:</label>
                  <input type="text" name="full_name" />
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input type="email" name="email" />
                </div>
                <div className="form-actions">
                  <button type="submit" className="submit-btn">
                    Crear Usuario
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="cancel-btn"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {modalType === "authorizeDevice" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  handleAuthorizeDevice({
                    fingerprint: formData.get("fingerprint"),
                    username: formData.get("username"),
                    admin_notes: formData.get("admin_notes"),
                  });
                }}
              >
                <div className="form-group">
                  <label>Huella digital del dispositivo:</label>
                  <input type="text" name="fingerprint" required />
                </div>
                <div className="form-group">
                  <label>Usuario:</label>
                  <input type="text" name="username" required />
                </div>
                <div className="form-group">
                  <label>Notas administrativas:</label>
                  <textarea name="admin_notes" rows="3"></textarea>
                </div>
                <div className="form-actions">
                  <button type="submit" className="submit-btn">
                    Autorizar Dispositivo
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="cancel-btn"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {modalType === "editUser" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  // Aquí puedes agregar la lógica para editar usuario
                  alert("Función de editar usuario en desarrollo");
                }}
              >
                <div className="form-group">
                  <label>Nombre completo:</label>
                  <input 
                    type="text" 
                    name="full_name" 
                    defaultValue={formData.full_name || ''} 
                  />
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input 
                    type="email" 
                    name="email" 
                    defaultValue={formData.email || ''} 
                  />
                </div>
                <div className="form-group">
                  <label>Nueva contraseña (opcional):</label>
                  <input type="password" name="password" />
                </div>
                <div className="form-actions">
                  <button type="submit" className="submit-btn">
                    Actualizar Usuario
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="cancel-btn"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Mostrar loading mientras se verifica la sesión
  if (!sessionChecked) {
    return (
      <div className="admin-container">
        <div className="loading">
          <div>Verificando autenticación...</div>
          {user && (
            <div style={{ marginTop: '20px' }}>
              <p>Usuario detectado: {user.username}</p>
              <button 
                onClick={checkAuthentication}
                style={{
                  padding: '10px 20px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                🔄 Sincronizar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="sidebar-header">
          <button className="logout-btn" onClick={handleGoHome}>Regresar</button>
          <h2>🔐 Administración</h2>
          <p>Bienvenido, {user?.displayName || user?.username}</p>
        </div>

        <nav className="sidebar-nav">
          <button
            className={
              activeSection === "dashboard" ? "nav-item active" : "nav-item"
            }
            onClick={() => setActiveSection("dashboard")}
          >
            📊 Dashboard
          </button>
          <button
            className={
              activeSection === "users" ? "nav-item active" : "nav-item"
            }
            onClick={() => setActiveSection("users")}
          >
            👥 Usuarios
          </button>
          <button
            className={
              activeSection === "devices" ? "nav-item active" : "nav-item"
            }
            onClick={() => setActiveSection("devices")}
          >
            📱 Dispositivos
          </button>
          <button
            className={
              activeSection === "logs" ? "nav-item active" : "nav-item"
            }
            onClick={() => setActiveSection("logs")}
          >
            📋 Logs
          </button>
          <button
            className={
              activeSection === "geofences" ? "nav-item active" : "nav-item"
            }
            onClick={() => setActiveSection("geofences")}
          >
            📍 Geocercas
          </button>
          <button
            className={
              activeSection === "settings" ? "nav-item active" : "nav-item"
            }
            onClick={() => setActiveSection("settings")}
          >
            ⚙️ Configuración
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="admin-main">
        {loading && <div className="loading">Cargando...</div>}

        {activeSection === "dashboard" && renderDashboard()}
        {activeSection === "users" && renderUsers()}
        {activeSection === "devices" && renderDevices()}
        {activeSection === "logs" && renderLogs()}
        {activeSection === "geofences" && (
          <div className="coming-soon">
            <h2>📍 Geocercas</h2>
            <p>Función en desarrollo...</p>
          </div>
        )}
        {activeSection === "settings" && renderSettings()}
      </div>

      {renderModal()}
    </div>
  );
};

export default Admin;