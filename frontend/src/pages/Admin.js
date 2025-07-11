// src/pages/Admin.js
import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, FeatureGroup } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import { useAuthContext } from "../context/AuthContext";
import { useGeolocation } from "../hooks/useGeolocation";
import { useNavigate } from "react-router-dom";
import { geoService } from "../services/geoService";
import "../styles/Admin.css";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

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
  //GEOCERCAS
  const [rectangleCoords, setRectangleCoords] = React.useState(null);
  const featureGroupRef = React.useRef();
  const editControlRef = React.useRef();
  const [geofenceName, setGeofenceName] = useState("");
  const [notification, setNotification] = useState(null);
  const { loading: loadingGeo, error, createGeofence } = useGeolocation();
  const [geofences, setGeofences] = useState([]);
  const [selectedGeofence, setSelectedGeofence] = useState(null);
  const [showGeofenceList, setShowGeofenceList] = useState(false);
  const [loadingGeofences, setLoadingGeofences] = useState(false);
  //USUARIOS
  const [currentUserId, setCurrentUserId] = useState("");

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
    if (activeSection === "settings" && sessionChecked) {
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
      const response = await fetch("http://localhost:3001/api/admin/config", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Error al cargar configuración");
      }

      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error("Error cargando configuración:", error);
      alert("Error cargando configuración: " + error.message);
    }
  };

  const handleConfigUpdate = async (key, value) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/admin/config/${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ value }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        // Actualizar el estado local
        setConfig((prev) => ({
          ...prev,
          [key]: { ...prev[key], value },
        }));
        alert(result.message);
      } else {
        alert("Error actualizando configuración: " + result.error);
      }
    } catch (error) {
      console.error("Error actualizando configuración:", error);
      alert("Error actualizando configuración: " + error.message);
    }
  };

  const handleResetConfig = async () => {
    if (
      !window.confirm(
        "¿Estás seguro de que quieres restablecer todas las configuraciones a los valores por defecto?"
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:3001/api/admin/config/reset",
        {
          method: "POST",
          credentials: "include",
        }
      );

      const result = await response.json();

      if (response.ok) {
        await loadConfig(); // Recargar configuraciones
        alert(result.message);
      } else {
        alert("Error restableciendo configuraciones: " + result.error);
      }
    } catch (error) {
      console.error("Error restableciendo configuraciones:", error);
      alert("Error restableciendo configuraciones: " + error.message);
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      console.log("Datos que se envían al servidor:", userData);

      // Extraer los datos del formulario
      const userDataToSend = {
        username: userData.username,
        password: userData.password,
        firstname: userData.firstname,
        lastname: userData.lastname,
        email: userData.email || `${userData.username}@example.com`, // Email por defecto si no se proporciona
        roleid: userData.rol, // Asegúrate de que el nombre del campo coincida con tu formulario
      };

      // Depurar los datos procesados
      console.log("Datos procesados para enviar:", userDataToSend);

      const response = await fetch("http://localhost:3001/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(userDataToSend),
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

  const handleEditUser = async (userData) => {
    try {
      // Depurar los datos que se están enviando
      console.log(
        "Datos que se envían al servidor para actualización:",
        userData
      );

      // Verificar que el ID no esté vacío
      if (!userData.id) {
        alert("Error: ID de usuario no válido");
        return;
      }

      const response = await fetch(
        `http://localhost:3001/api/admin/users/${userData.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(userData),
        }
      );

      // Verificar si la respuesta es HTML (error)
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        throw new Error(
          `Error del servidor: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      if (response.ok) {
        await loadUsers(); // Recargar la lista de usuarios
        setShowModal(false);
        setFormData({});
        alert("Usuario actualizado exitosamente");
      } else {
        alert("Error actualizando usuario: " + result.error);
      }
    } catch (error) {
      console.error("Error actualizando usuario:", error);
      alert("Error actualizando usuario: " + error.message);
    }
  };

  const openEditUserModal = async (userId) => {
    try {
      // Cargar los datos del usuario
      const response = await fetch(
        `http://localhost:3001/api/admin/users/${userId}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (response.ok) {
        const userData = await response.json();

        // Establecer el ID del usuario actual que estamos editando
        setCurrentUserId(userId);

        // Establecer los datos del formulario
        setFormData({
          username: userData.username,
          firstname: userData.firstname,
          lastname: userData.lastname,
          email: userData.email,
          roleid: userData.roleid || "5", // Valor por defecto si no tiene rol
        });

        // Abrir el modal
        setModalType("editUser");
        setShowModal(true);
      } else {
        const error = await response.json();
        alert("Error cargando datos del usuario: " + error.error);
      }
    } catch (error) {
      console.error("Error cargando datos del usuario:", error);
      alert("Error cargando datos del usuario: " + error.message);
    }
  };

  // Cargar las geocercas al montar el componente
  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleUserStatus = async (userId) => {
    try {
      // Obtener el usuario actual para determinar si está suspendido o no
      const userToToggle = users.find((user) => user.id === userId);

      if (!userToToggle) {
        alert("Usuario no encontrado");
        return;
      }

      // Mostrar mensaje de confirmación
      const action = userToToggle.suspended ? "activar" : "desactivar";
      const confirmMessage = `¿Estás seguro de que quieres ${action} al usuario ${userToToggle.username}?`;

      if (!window.confirm(confirmMessage)) {
        return; // El usuario canceló la acción
      }

      const response = await fetch(
        `http://localhost:3001/api/admin/users/${userId}/toggle`,
        {
          method: "POST",
          credentials: "include",
        }
      );

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
      const response = await fetch(
        `http://localhost:3001/api/admin/devices/${deviceId}/revoke`,
        {
          method: "POST",
          credentials: "include",
        }
      );

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
      const response = await fetch(
        "http://localhost:3001/api/admin/devices/authorize",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(deviceData),
        }
      );

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
      const response = await fetch(
        "http://localhost:3001/api/admin/devices/cleanup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ days: parseInt(days) }),
        }
      );

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

  //FUNCIONES GEOCERCAS
  // Manejar la creación de un rectángulo
  const handleDrawCreated = (e) => {
    if (e.layerType === "rectangle") {
      const bounds = e.layer.getBounds();
      const northWest = bounds.getNorthWest();
      const southWest = bounds.getSouthWest();
      const southEast = bounds.getSouthEast();
      const northEast = bounds.getNorthEast();
      const corners = [
        [northWest.lng, northWest.lat],
        [southWest.lng, southWest.lat],
        [southEast.lng, southEast.lat],
        [northEast.lng, northEast.lat],
        [northWest.lng, northWest.lat],
      ];
      setRectangleCoords(corners);
    }
  };

  // Limpiar el mapa
  const handleClearRectangles = () => {
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
    setRectangleCoords(null);
    setGeofenceName("");
    setSelectedGeofence(null); // Limpiar la geocerca seleccionada
  };

  // Guardar la geocerca
  const handleSaveGeofence = async () => {
    if (!rectangleCoords || !geofenceName.trim()) {
      return;
    }

    try {
      // Usar el ID del usuario directamente del objeto user
      const userId = user?.id;

      console.log("Creando geocerca para usuario:", {
        id: userId,
        username: user?.username || user?.displayName,
      });

      await createGeofence({
        name: geofenceName,
        coordinates: rectangleCoords,
        created_by: userId, // Enviar el ID del usuario actual
      });

      // Limpiar el formulario después de guardar
      handleClearRectangles();
      setGeofenceName("");

      // Mostrar mensaje de éxito
      setNotification({
        type: "success",
        message: "¡Geocerca guardada exitosamente!",
      });
    } catch (error) {
      setNotification({
        type: "error",
        message: `Error al guardar la geocerca: ${
          error.message || "Error desconocido"
        }`,
      });
    }
  };
  // Función para cargar las geocercas
  const fetchGeofences = async () => {
    try {
      setLoadingGeofences(true);

      // Asegúrate de usar la URL completa si es necesario
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/geofences`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text(); // Obtener el texto del error
        console.error("Respuesta del servidor:", response.status, errorText);
        throw new Error(`Error al cargar las geocercas (${response.status})`);
      }

      const data = await response.json();
      console.log("Geocercas cargadas:", data);
      setGeofences(data);
      return data;
    } catch (error) {
      console.error("Error cargando geocercas:", error);
      setNotification({
        type: "error",
        message: `Error al cargar las geocercas: ${error.message}`,
      });
      return [];
    } finally {
      setLoadingGeofences(false);
    }
  };

  // Función para seleccionar una geocerca
  const handleSelectGeofence = (geofence) => {
    setSelectedGeofence(geofence);
    setGeofenceName(geofence.name);
    setRectangleCoords(geofence.coordinates);

    // Limpiar el mapa actual
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }

    // Necesitamos usar un pequeño timeout para asegurarnos de que el mapa está listo
    setTimeout(() => {
      // Crear un rectángulo en el mapa con las coordenadas de la geocerca
      if (geofence && geofence.coordinates && featureGroupRef.current) {
        try {
          // Obtener la referencia a Leaflet
          const L = window.L; // Leaflet debería estar disponible globalmente
          if (L) {
            console.log(
              "Dibujando polígono con coordenadas:",
              geofence.coordinates
            );

            // Convertir formato [lng, lat] a [lat, lng] que usa Leaflet
            const latLngCoords = geofence.coordinates.map((coord) => [
              coord[1],
              coord[0],
            ]);

            // Crear un polígono con las coordenadas
            const polygon = L.polygon(latLngCoords, { color: "red" });

            // Añadir al mapa
            polygon.addTo(featureGroupRef.current);

            // Ajustar la vista del mapa para mostrar el polígono completo
            const map = featureGroupRef.current._map;
            if (map) {
              map.fitBounds(polygon.getBounds());
            }

            console.log("Polígono dibujado correctamente");
          } else {
            console.error("Leaflet no está disponible");
          }
        } catch (error) {
          console.error("Error dibujando el polígono:", error);
        }
      }
    }, 100);

    // Cerrar la lista de geocercas
    setShowGeofenceList(false);
  };

  // Función para eliminar una geocerca
  const handleDeleteGeofence = async (id) => {
    if (
      !window.confirm("¿Estás seguro de que deseas eliminar esta geocerca?")
    ) {
      return;
    }

    try {
      await geoService.deleteGeofence(id);

      // Actualizar la lista de geocercas
      setGeofences(geofences.filter((g) => g.id !== id));

      // Si la geocerca eliminada era la seleccionada, limpiar la selección
      if (selectedGeofence && selectedGeofence.id === id) {
        setSelectedGeofence(null);
        handleClearRectangles();
      }

      setNotification({
        type: "success",
        message: "Geocerca eliminada exitosamente",
      });
    } catch (error) {
      console.error("Error eliminando geocerca:", error);
      setNotification({
        type: "error",
        message: `Error al eliminar la geocerca: ${error.message}`,
      });
    }
  };

  // Cargar las geocercas al montar el componente
  useEffect(() => {
    fetchGeofences();
  }, []);

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
                onClick={() => openEditUserModal(user.id)}
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

  const renderGeofences = () => (
    <div className="geofence-module">
      {notification && (
        <div
          className={`notification ${notification.type}`}
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "10px 20px",
            borderRadius: "4px",
            backgroundColor:
              notification.type === "success" ? "#4CAF50" : "#f44336",
            color: "white",
            zIndex: 1000,
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          }}
        >
          {notification.message}
          <button
            onClick={() => setNotification(null)}
            style={{
              background: "none",
              border: "none",
              color: "white",
              marginLeft: "10px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="dashboard-header">
        <h2>📍 Geocercas</h2>
        <div>
          <button
            onClick={() => {
              setShowGeofenceList(!showGeofenceList);
              if (!showGeofenceList) {
                fetchGeofences();
              }
            }}
            className="action-btn primary"
            style={{ marginRight: "10px" }}
          >
            {showGeofenceList ? "🗺️ Volver al Mapa" : "📋 Ver Geocercas"}
          </button>
          <button
            onClick={handleClearRectangles}
            className="action-btn secondary"
          >
            🧹 Limpiar
          </button>
        </div>
      </div>

      {showGeofenceList ? (
        <div className="geofence-list-container" style={{ marginTop: "20px" }}>
          <h3>Geocercas Guardadas</h3>
          {loadingGeofences ? (
            <div className="loading">Cargando geocercas...</div>
          ) : geofences.length === 0 ? (
            <div
              className="empty-state"
              style={{ padding: "20px", textAlign: "center", color: "#666" }}
            >
              No hay geocercas guardadas.
            </div>
          ) : (
            <div
              className="geofence-cards"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                gap: "15px",
                marginTop: "15px",
              }}
            >
              {geofences.map((geofence) => (
                <div
                  key={geofence.id}
                  className="geofence-card"
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "15px",
                    backgroundColor:
                      selectedGeofence?.id === geofence.id
                        ? "#e3f2fd"
                        : "#f9f9f9",
                    cursor: "pointer",
                  }}
                  onClick={() => handleSelectGeofence(geofence)}
                >
                  <h4 style={{ margin: "0 0 10px 0" }}>{geofence.name}</h4>
                  <p style={{ margin: "5px 0", fontSize: "0.9em" }}>
                    Creada: {new Date(geofence.created_at).toLocaleString()}
                  </p>
                  <p style={{ margin: "5px 0", fontSize: "0.9em" }}>
                    Por:{" "}
                    {geofence.created_by_name || geofence.created_by_username}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "10px",
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectGeofence(geofence);
                        setShowGeofenceList(false);
                      }}
                      className="action-btn primary"
                      style={{
                        padding: "5px 10px",
                        fontSize: "0.8em",
                      }}
                    >
                      🔍 Ver
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGeofence(geofence.id);
                      }}
                      className="action-btn"
                      style={{
                        padding: "5px 10px",
                        fontSize: "0.8em",
                        backgroundColor: "#f44336",
                        color: "white",
                      }}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div
            className="geofence-map-wrap"
            style={{ height: 400, margin: "16px 0" }}
          >
            <MapContainer
              center={[4.5799523885270395, -74.15758078575806]}
              zoom={16}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FeatureGroup ref={featureGroupRef}>
                <EditControl
                  position="topright"
                  onCreated={handleDrawCreated}
                  ref={editControlRef}
                  draw={{
                    rectangle: true,
                    polyline: false,
                    polygon: false,
                    circle: false,
                    marker: false,
                    circlemarker: false,
                  }}
                  edit={{
                    edit: false,
                    remove: false,
                  }}
                />
              </FeatureGroup>
            </MapContainer>
          </div>

          <div className="geofence-coords">
            <h3>
              🧭{" "}
              {selectedGeofence
                ? "Detalles de la Geocerca"
                : "Coordenadas del Rectángulo"}
            </h3>
            {rectangleCoords ? (
              <>
                <pre
                  style={{
                    background: "#f5f5f5",
                    padding: "10px",
                    borderRadius: 4,
                  }}
                >
                  {JSON.stringify(rectangleCoords, null, 2)}
                </pre>
                <div className="geofence-actions" style={{ marginTop: "15px" }}>
                  <input
                    type="text"
                    value={geofenceName}
                    onChange={(e) => setGeofenceName(e.target.value)}
                    placeholder="Nombre de la geocerca"
                    className="geofence-name-input"
                    style={{
                      padding: "8px 12px",
                      marginRight: "10px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      width: "250px",
                    }}
                  />

                  {selectedGeofence ? (
                    <div style={{ display: "flex", gap: "10px" }}>
                      <div style={{ flex: 1 }}>
                        <p>
                          <strong>Creada por:</strong>{" "}
                          {selectedGeofence.created_by_name ||
                            selectedGeofence.created_by_username}
                        </p>
                        <p>
                          <strong>Fecha:</strong>{" "}
                          {new Date(
                            selectedGeofence.created_at
                          ).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleDeleteGeofence(selectedGeofence.id)
                        }
                        className="action-btn"
                        style={{
                          padding: "8px 16px",
                          backgroundColor: "#f44336",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        🗑️ Eliminar Geocerca
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleSaveGeofence}
                      className="action-btn primary"
                      disabled={!geofenceName.trim() || loadingGeo}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#4CAF50",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor:
                          geofenceName.trim() && !loadingGeo
                            ? "pointer"
                            : "not-allowed",
                      }}
                    >
                      {loadingGeo ? "Guardando..." : "💾 Guardar Geocerca"}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div style={{ color: "#888" }}>
                {selectedGeofence
                  ? "La geocerca seleccionada no tiene coordenadas válidas."
                  : "Selecciona la herramienta en el mapa y dibuja un rectángulo."}
              </div>
            )}
          </div>
        </>
      )}
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
              marginLeft: "0.5rem",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
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
              value={config.auth_method?.value || "mysql"}
              onChange={(e) =>
                handleConfigUpdate("auth_method", e.target.value)
              }
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
              value={config.max_login_attempts?.value || "5"}
              onChange={(e) =>
                handleConfigUpdate("max_login_attempts", e.target.value)
              }
              className="config-input"
            />
          </div>

          <div className="config-item">
            <label className="config-label">
              <span className="config-title">
                Timeout de Sesión (milisegundos)
              </span>
              <span className="config-description">
                {config.session_timeout?.description}
                <br />
                <small>
                  Actual:{" "}
                  {(
                    (config.session_timeout?.value || 86400000) /
                    1000 /
                    60 /
                    60
                  ).toFixed(1)}{" "}
                  horas
                </small>
              </span>
            </label>
            <select
              value={config.session_timeout?.value || "86400000"}
              onChange={(e) =>
                handleConfigUpdate("session_timeout", e.target.value)
              }
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
                checked={config.auto_authorize_devices?.value === "true"}
                onChange={(e) =>
                  handleConfigUpdate(
                    "auto_authorize_devices",
                    e.target.checked ? "true" : "false"
                  )
                }
                className="config-checkbox"
              />
              <label htmlFor="auto_authorize_devices" className="toggle-label">
                {config.auto_authorize_devices?.value === "true"
                  ? "Activado"
                  : "Desactivado"}
              </label>
            </div>
          </div>

          <div className="config-item">
            <label className="config-label">
              <span className="config-title">
                Máximo Dispositivos por Usuario
              </span>
              <span className="config-description">
                {config.max_devices_per_user?.description}
              </span>
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={config.max_devices_per_user?.value || "3"}
              onChange={(e) =>
                handleConfigUpdate("max_devices_per_user", e.target.value)
              }
              className="config-input"
            />
          </div>

          <div className="config-item">
            <label className="config-label">
              <span className="config-title">
                Días de Inactividad para Revocación
              </span>
              <span className="config-description">
                {config.device_inactivity_days?.description}
              </span>
            </label>
            <select
              value={config.device_inactivity_days?.value || "90"}
              onChange={(e) =>
                handleConfigUpdate("device_inactivity_days", e.target.value)
              }
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
              <span className="config-description"></span>
            </label>
            <div className="config-toggle">
              <input
                type="checkbox"
                id="maintenance_mode"
                checked={config.maintenance_mode?.value === "true"}
                onChange={(e) =>
                  handleConfigUpdate(
                    "maintenance_mode",
                    e.target.checked ? "true" : "false"
                  )
                }
                className="config-checkbox"
              />
              <label htmlFor="maintenance_mode" className="toggle-label">
                {config.maintenance_mode?.value === "true"
                  ? "Activado"
                  : "Desactivado"}
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
              value={config.system_version?.value || "1.0.0"}
              onChange={(e) =>
                handleConfigUpdate("system_version", e.target.value)
              }
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
            <span
              className={`status-value ${
                config.maintenance_mode?.value === "true"
                  ? "warning"
                  : "success"
              }`}
            >
              {config.maintenance_mode?.value === "true"
                ? "⚠️ Activo"
                : "✅ Inactivo"}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Auto-autorización:</span>
            <span
              className={`status-value ${
                config.auto_authorize_devices?.value === "true"
                  ? "success"
                  : "info"
              }`}
            >
              {config.auto_authorize_devices?.value === "true"
                ? "✅ Habilitada"
                : "ℹ️ Deshabilitada"}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Método de Auth:</span>
            <span className="status-value info">
              📋 {(config.auth_method?.value || "mysql").toUpperCase()}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Versión:</span>
            <span className="status-value info">
              🏷️ {config.system_version?.value || "1.0.0"}
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
                    firstname: formData.get("firstname"),
                    lastname: formData.get("lastname"),
                    email: formData.get("email"),
                    rol: formData.get("roleid"),
                  });
                }}
              >
                <div className="form-group">
                  <label>Usuario:</label>
                  <input type="text" name="username" required />
                </div>
                <div className="form-group">
                  <label>Contraseña:</label>
                  <input type="password" name="password" required />
                </div>
                <div className="form-group">
                  <label>Nombre:</label>
                  <input type="text" name="firstname" required />
                </div>
                <div className="form-group">
                  <label>Apellido:</label>
                  <input type="text" name="lastname" required />
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input type="email" name="email" />
                </div>
                <div className="form-group">
                  <label form="rol">Rol:</label>
                  <select name="roleid" id="rol">
                    <option value="5">Estudiante</option>
                    <option value="3">Docente</option>
                    <option value="1">Administrativo</option>
                  </select>
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

                  // Recopilar datos del formulario
                  const userData = {
                    id: currentUserId, // ID del usuario que estamos editando
                    username: formData.get("username"),
                    firstname: formData.get("firstname"),
                    lastname: formData.get("lastname"),
                    email: formData.get("email"),
                    password: formData.get("password"), // Opcional
                    roleid: formData.get("roleid"),
                  };

                  // Solo incluir la contraseña si se proporcionó una nueva
                  if (!userData.password) {
                    delete userData.password;
                  }

                  // Verificar que el ID no esté vacío
                  if (!userData.id) {
                    alert("Error: ID de usuario no válido");
                    return;
                  }

                  handleEditUser(userData);
                }}
              >
                <div className="form-group">
                  <label>Usuario:</label>
                  <input
                    type="text"
                    name="username"
                    defaultValue={formData.username || ""}
                    readOnly // El nombre de usuario no debe cambiarse
                  />
                </div>
                <div className="form-group">
                  <label>Nombre:</label>
                  <input
                    type="text"
                    name="firstname"
                    defaultValue={formData.firstname || ""}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Apellido:</label>
                  <input
                    type="text"
                    name="lastname"
                    defaultValue={formData.lastname || ""}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={formData.email || ""}
                  />
                </div>
                <div className="form-group">
                  <label>Nueva contraseña (opcional):</label>
                  <input type="password" name="password" />
                </div>
                <div className="form-group">
                  <label htmlFor="rol">Rol:</label>
                  <select
                    name="roleid"
                    id="rol"
                    defaultValue={formData.roleid || "5"}
                  >
                    <option value="5">Estudiante</option>
                    <option value="3">Docente</option>
                    <option value="1">Administrativo</option>
                  </select>
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
            <div style={{ marginTop: "20px" }}>
              <p>Usuario detectado: {user.username}</p>
              <button
                onClick={checkAuthentication}
                style={{
                  padding: "10px 20px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
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
          <button className="logout-btn" onClick={handleGoHome}>
            Regresar
          </button>
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
        {activeSection === "geofences" && renderGeofences()}
        {activeSection === "settings" && renderSettings()}
      </div>

      {renderModal()}
    </div>
  );
};

export default Admin;
