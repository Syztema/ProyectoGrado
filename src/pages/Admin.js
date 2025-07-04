// src/pages/Admin.js
import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';
import '../styles/Admin.css'; 

const Admin = () => {
  const { user } = useAuthContext();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});

  // Cargar datos iniciales
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadUsers(),
        loadDevices(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  const loadDevices = async () => {
    try {
      const response = await fetch('/api/admin/devices');
      const data = await response.json();
      setDevices(data);
    } catch (error) {
      console.error('Error cargando dispositivos:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      if (response.ok) {
        await loadUsers();
        setShowModal(false);
        setFormData({});
        alert('Usuario creado exitosamente');
      }
    } catch (error) {
      console.error('Error creando usuario:', error);
      alert('Error creando usuario');
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/toggle`, {
        method: 'POST'
      });
      
      if (response.ok) {
        await loadUsers();
        alert('Estado del usuario actualizado');
      }
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      alert('Error actualizando usuario');
    }
  };

  const handleRevokeDevice = async (deviceId) => {
    if (!window.confirm('¿Estás seguro de que quieres revocar este dispositivo?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/devices/${deviceId}/revoke`, {
        method: 'POST'
      });
      
      if (response.ok) {
        await loadDevices();
        alert('Dispositivo revocado exitosamente');
      }
    } catch (error) {
      console.error('Error revocando dispositivo:', error);
      alert('Error revocando dispositivo');
    }
  };

  const handleAuthorizeDevice = async (deviceData) => {
    try {
      const response = await fetch('/api/admin/devices/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceData)
      });
      
      if (response.ok) {
        await loadDevices();
        setShowModal(false);
        setFormData({});
        alert('Dispositivo autorizado exitosamente');
      }
    } catch (error) {
      console.error('Error autorizando dispositivo:', error);
      alert('Error autorizando dispositivo');
    }
  };

  const openModal = (type, data = {}) => {
    setModalType(type);
    setFormData(data);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
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
              {stats.activeUsers || 0} activos, {stats.inactiveUsers || 0} inactivos
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
            <div className="stat-detail">
              Accesos exitosos
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>Promedio</h3>
            <div className="stat-number">{stats.avgDevices || 0}</div>
            <div className="stat-detail">
              Dispositivos por usuario
            </div>
          </div>
        </div>
      </div>
      
      <div className="quick-actions">
        <h3>⚡ Acciones Rápidas</h3>
        <div className="action-buttons">
          <button onClick={() => openModal('createUser')} className="action-btn primary">
            ➕ Crear Usuario
          </button>
          <button onClick={() => openModal('authorizeDevice')} className="action-btn secondary">
            📱 Autorizar Dispositivo
          </button>
          <button onClick={() => setActiveSection('users')} className="action-btn">
            👥 Ver Usuarios
          </button>
          <button onClick={() => setActiveSection('devices')} className="action-btn">
            📱 Ver Dispositivos
          </button>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="admin-users">
      <div className="section-header">
        <h2>👥 Gestión de Usuarios</h2>
        <button onClick={() => openModal('createUser')} className="create-btn">
          ➕ Crear Usuario
        </button>
      </div>
      
      <div className="users-grid">
        {users.map(user => (
          <div key={user.id} className="user-card">
            <div className="user-header">
              <div className="user-avatar">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <h4>{user.full_name || user.username}</h4>
                <p>{user.email || user.username}</p>
              </div>
              <div className={`user-status ${user.is_active ? 'active' : 'inactive'}`}>
                {user.is_active ? '✅ Activo' : '❌ Inactivo'}
              </div>
            </div>
            
            <div className="user-details">
              <div className="detail-item">
                <span>Dispositivos:</span>
                <strong>{user.device_count || 0}</strong>
              </div>
              <div className="detail-item">
                <span>Creado:</span>
                <strong>{new Date(user.created_at).toLocaleDateString()}</strong>
              </div>
            </div>
            
            <div className="user-actions">
              <button 
                onClick={() => handleToggleUserStatus(user.id)}
                className={`toggle-btn ${user.is_active ? 'deactivate' : 'activate'}`}
              >
                {user.is_active ? '🔒 Desactivar' : '🔓 Activar'}
              </button>
              <button className="edit-btn" onClick={() => openModal('editUser', user)}>
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
        <button onClick={() => openModal('authorizeDevice')} className="create-btn">
          ➕ Autorizar Dispositivo
        </button>
      </div>
      
      <div className="devices-grid">
        {devices.map(device => (
          <div key={device.id} className="device-card">
            <div className="device-header">
              <div className="device-icon">
                {device.device_info?.platform === 'Win32' ? '🖥️' : 
                 device.device_info?.platform === 'MacIntel' ? '🍎' : 
                 device.device_info?.platform?.includes('Linux') ? '🐧' : '📱'}
              </div>
              <div className="device-info">
                <h4>{device.username}</h4>
                <p>{device.device_info?.platform || 'Plataforma desconocida'}</p>
              </div>
              <div className={`device-status ${device.is_active ? 'active' : 'revoked'}`}>
                {device.is_active ? '✅ Activo' : '❌ Revocado'}
              </div>
            </div>
            
            <div className="device-details">
              <div className="detail-item">
                <span>Huella:</span>
                <code>{device.fingerprint.substring(0, 16)}...</code>
              </div>
              <div className="detail-item">
                <span>Autorización:</span>
                <strong>{device.auto_authorized ? 'Automática' : 'Manual'}</strong>
              </div>
              <div className="detail-item">
                <span>Última conexión:</span>
                <strong>
                  {device.last_seen ? new Date(device.last_seen).toLocaleDateString() : 'Nunca'}
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
              <button className="details-btn">
                ℹ️ Detalles
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderModal = () => {
    if (!showModal) return null;

    return (
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>
              {modalType === 'createUser' && '➕ Crear Usuario'}
              {modalType === 'editUser' && '✏️ Editar Usuario'}
              {modalType === 'authorizeDevice' && '📱 Autorizar Dispositivo'}
            </h3>
            <button onClick={closeModal} className="modal-close">✕</button>
          </div>
          
          <div className="modal-body">
            {modalType === 'createUser' && (
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleCreateUser({
                  username: formData.get('username'),
                  password: formData.get('password'),
                  full_name: formData.get('full_name'),
                  email: formData.get('email')
                });
              }}>
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
                  <button type="submit" className="submit-btn">Crear Usuario</button>
                  <button type="button" onClick={closeModal} className="cancel-btn">Cancelar</button>
                </div>
              </form>
            )}
            
            {modalType === 'authorizeDevice' && (
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleAuthorizeDevice({
                  fingerprint: formData.get('fingerprint'),
                  username: formData.get('username'),
                  admin_notes: formData.get('admin_notes')
                });
              }}>
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
                  <button type="submit" className="submit-btn">Autorizar Dispositivo</button>
                  <button type="button" onClick={closeModal} className="cancel-btn">Cancelar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="sidebar-header">
          <h2>🔐 Administración</h2>
          <p>Bienvenido, {user?.displayName || user?.username}</p>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={activeSection === 'dashboard' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveSection('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={activeSection === 'users' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveSection('users')}
          >
            👥 Usuarios
          </button>
          <button 
            className={activeSection === 'devices' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveSection('devices')}
          >
            📱 Dispositivos
          </button>
          <button 
            className={activeSection === 'logs' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveSection('logs')}
          >
            📋 Logs
          </button>
          <button 
            className={activeSection === 'settings' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveSection('settings')}
          >
            ⚙️ Configuración
          </button>
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="admin-main">
        {loading && <div className="loading">Cargando...</div>}
        
        {activeSection === 'dashboard' && renderDashboard()}
        {activeSection === 'users' && renderUsers()}
        {activeSection === 'devices' && renderDevices()}
        {activeSection === 'logs' && (
          <div className="coming-soon">
            <h2>📋 Logs de Auditoría</h2>
            <p>Función en desarrollo...</p>
          </div>
        )}
        {activeSection === 'settings' && (
          <div className="coming-soon">
            <h2>⚙️ Configuración del Sistema</h2>
            <p>Función en desarrollo...</p>
          </div>
        )}
      </div>
      
      {renderModal()}
    </div>
  );
};

export default Admin;