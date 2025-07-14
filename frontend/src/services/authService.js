// src/services/authService.js
import { getApiUrl } from "../utils/constants";

class AuthService {
  constructor() {
    this.baseURL = getApiUrl();
    console.log(`🔗 AuthService configurado para: ${this.baseURL}`);
  }

  // ===== MÉTODOS DE AUTENTICACIÓN EXISTENTES (MEJORADOS) =====

  async login({
    username,
    password,
    deviceFingerprint,
    location,
    deviceId,
    auth_token,
    useAD = false // Nuevo parámetro para elegir método
  }) {
    try {
      console.log("🔐 Intentando login:", {
        username,
        hasPassword: !!password,
        deviceFingerprint: deviceFingerprint?.substring(0, 8) + "...",
        method: useAD ? 'Active Directory' : 'MySQL'
      });

      // Elegir endpoint según el método
      const endpoint = useAD ? '/api/auth/login-ad' : '/api/auth/login';
      
      // Obtener información del equipo si es AD
      let computerInfo = {};
      if (useAD) {
        computerInfo = await this.getComputerInfo();
        console.log('🖥️ Información del equipo:', computerInfo);
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Para mantener sesiones
        body: JSON.stringify({
          username,
          password,
          deviceFingerprint,
          location,
          deviceId,
          auth_token,
          // Datos adicionales para AD
          ...(useAD && {
            deviceInfo: {
              ...deviceFingerprint, // Assuming deviceFingerprint has device info
              ...computerInfo
            },
            computerName: computerInfo.hostname
          })
        }),
      });

      const data = await response.json();

      console.log("📡 Respuesta del servidor:", {
        status: response.status,
        data,
      });

      if (!response.ok) {
        console.error("❌ Error del servidor:", data);
        
        // Manejar errores específicos de AD
        if (useAD && data.errorCode) {
          switch (data.errorCode) {
            case 'COMPUTER_NOT_IN_DOMAIN':
              throw new Error('Este equipo no está unido al dominio de la empresa. Contacta al administrador de TI.');
            case 'USER_NOT_IN_ALLOWED_OU':
              throw new Error('Tu cuenta no tiene permisos para acceder a este sistema.');
            case 'USER_NOT_IN_REQUIRED_GROUP':
              throw new Error('Tu cuenta no pertenece a los grupos autorizados.');
            default:
              throw new Error(data.error || 'Error de autenticación con Active Directory');
          }
        }
        
        throw new Error(
          data.error || `Error ${response.status}: ${response.statusText}`
        );
      }

      console.log("✅ Login exitoso");
      return {
        success: true,
        user: data.user,
        message: data.message,
        method: useAD ? 'ad' : 'mysql'
      };
    } catch (error) {
      console.error("💥 Error en login:", error);

      // Proporcionar información adicional para debugging
      if (error.message.includes("Failed to fetch")) {
        console.error("🔧 Problema de conectividad:");
        console.error(`   Frontend: ${window.location.origin}`);
        console.error(`   Backend: ${this.baseURL}`);
        console.error("   Verifica que el backend esté ejecutándose");
        throw new Error(
          "No se puede conectar al servidor. Verifica que esté ejecutándose."
        );
      }

      throw error;
    }
  }

  // ===== NUEVOS MÉTODOS PARA ACTIVE DIRECTORY =====

  /**
   * Detectar información del equipo para verificación AD
   */
  async getComputerInfo() {
    try {
      // Intentar obtener el nombre del equipo
      const hostname = window.location.hostname || 
                      navigator.userAgent.match(/Windows NT [^;)]+/)?.[0] ||
                      'unknown-computer';
      
      // Detectar si está en un dominio (aproximación)
      const isDomainJoined = await this.checkDomainConnection();
      
      // Obtener resolución de pantalla de forma segura
      let screenResolution = 'unknown';
      try {
        if (window.screen && window.screen.width && window.screen.height) {
          screenResolution = `${window.screen.width}x${window.screen.height}`;
        }
      } catch (screenError) {
        console.warn('No se pudo obtener resolución de pantalla:', screenError);
      }
      
      return {
        hostname,
        isDomainJoined,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        // Información adicional del navegador
        cookieEnabled: navigator.cookieEnabled,
        onlineStatus: navigator.onLine,
        hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
        maxTouchPoints: navigator.maxTouchPoints || 0
      };
    } catch (error) {
      console.error('Error obteniendo información del equipo:', error);
      return {
        hostname: 'unknown',
        isDomainJoined: false,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screenResolution: 'unknown',
        timezone: 'unknown'
      };
    }
  }

  /**
   * Verificar conexión al dominio (método básico)
   */
  async checkDomainConnection() {
    try {
      // Intentar acceder a recursos típicos del dominio
      const domainChecks = [
        // Verificar si puede resolver nombres del dominio
        fetch('http://empresa.com/favicon.ico', { mode: 'no-cors', timeout: 3000 }),
        // Otros checks específicos de tu empresa
      ];

      const results = await Promise.allSettled(domainChecks);
      return results.some(result => result.status === 'fulfilled');
    } catch (error) {
      return false;
    }
  }

  /**
   * Login específico con Active Directory
   */
  async loginWithAD({ username, password, deviceFingerprint, location, deviceInfo }) {
    try {
      console.log('🔐 Intentando login AD:', { username, hasPassword: !!password });
      
      // Obtener información del equipo
      const computerInfo = await this.getComputerInfo();
      console.log('🖥️ Información del equipo:', computerInfo);

      const response = await fetch(`${this.baseURL}/api/auth/login-ad`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username,
          password,
          deviceFingerprint,
          location,
          deviceInfo: {
            ...deviceInfo,
            ...computerInfo
          },
          computerName: computerInfo.hostname
        }),
      });

      const data = await response.json();
      
      console.log('📡 Respuesta del servidor AD:', { status: response.status, data });

      if (!response.ok) {
        console.error('❌ Error del servidor AD:', data);
        
        // Manejar errores específicos de AD
        if (data.errorCode === 'COMPUTER_NOT_IN_DOMAIN') {
          throw new Error('Este equipo no está unido al dominio de la empresa. Contacta al administrador de TI.');
        } else if (data.errorCode === 'USER_NOT_IN_ALLOWED_OU') {
          throw new Error('Tu cuenta no tiene permisos para acceder a este sistema.');
        } else if (data.errorCode === 'USER_NOT_IN_REQUIRED_GROUP') {
          throw new Error('Tu cuenta no pertenece a los grupos autorizados.');
        }
        
        throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Login AD exitoso');
      return {
        success: true,
        user: data.user,
        message: data.message,
        method: 'ad'
      };
    } catch (error) {
      console.error('💥 Error en login AD:', error);
      throw error;
    }
  }

  /**
   * Verificar estado de Active Directory
   */
  async checkADStatus() {
    try {
      const response = await fetch(`${this.baseURL}/api/admin/ad-status`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return { available: false, error: 'No se pudo verificar estado AD' };
      }

      return await response.json();
    } catch (error) {
      console.error('Error verificando estado AD:', error);
      return { available: false, error: error.message };
    }
  }

  /**
   * Login con detección automática de método (AD primero, MySQL como fallback)
   */
  async loginAuto(credentials) {
    try {
      // 1. Verificar si AD está disponible
      const adStatus = await this.checkADStatus();
      
      if (adStatus.available) {
        console.log('🔍 AD disponible, intentando autenticación AD...');
        try {
          return await this.login({ ...credentials, useAD: true });
        } catch (adError) {
          console.warn('⚠️ Falló autenticación AD:', adError.message);
          
          // Si el error es de configuración/credenciales, no hacer fallback
          if (adError.message.includes('no tiene permisos') || 
              adError.message.includes('no pertenece a los grupos') ||
              adError.message.includes('no está unido al dominio')) {
            throw adError;
          }
          
          // Para otros errores, intentar fallback si está habilitado
          console.log('🔄 Intentando fallback a MySQL...');
        }
      }
      
      // 2. Fallback a MySQL
      console.log('🔍 Usando autenticación MySQL...');
      return await this.login({ ...credentials, useAD: false });
      
    } catch (error) {
      console.error('💥 Error en loginAuto:', error);
      throw error;
    }
  }

  // ===== MÉTODOS EXISTENTES (SIN CAMBIOS) =====

  async logout() {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Error cerrando sesión");
      }

      return await response.json();
    } catch (error) {
      console.error("Error en logout:", error);
      throw error;
    }
  }

  async checkSession() {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/check-session`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return { authenticated: false };
      }

      return await response.json();
    } catch (error) {
      console.error("Error verificando sesión:", error);

      // Información adicional para debugging CORS
      if (error.message.includes("Failed to fetch")) {
        console.error("🔧 Posible problema CORS. Verifica:");
        console.error("1. Backend ejecutándose en puerto 3001");
        console.error("2. Configuración CORS del backend");
        console.error(`3. Frontend URL: ${window.location.origin}`);
        console.error(`4. Backend URL: ${this.baseURL}`);
      }

      return { authenticated: false };
    }
  }

  async refreshToken() {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Error refrescando token");
      }

      return await response.json();
    } catch (error) {
      console.error("Error refrescando token:", error);
      throw error;
    }
  }

  // ===== MÉTODOS DE GEOCERCAS (SIN CAMBIOS) =====

  /**
   * Verifica si una ubicación está dentro de alguna geocerca
   * @param {number} lat - Latitud
   * @param {number} lng - Longitud
   * @returns {Promise<{isInside: boolean, geofences: Array}>}
   */
  async checkGeofence(lat, lng) {
    try {
      console.log("📍 Verificando geocerca para:", { lat, lng });

      const response = await fetch(`${this.baseURL}/api/geofences/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ lat, lng }),
      });

      const data = await response.json();

      console.log("📡 Respuesta de verificación de geocerca:", {
        status: response.status,
        data,
      });

      if (!response.ok || !data.success) {
        const errorMsg =
          data.error || `Error ${response.status}: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (error) {
      console.error("💥 Error verificando geocerca:", error);

      // Retornar un objeto consistente incluso en caso de error
      return {
        success: false,
        isInside: false,
        geofences: [],
        error: error.message,
      };
    }
  }

  /**
   * Obtiene todas las geocercas disponibles
   * @returns {Promise<Array>}
   */
  async getGeofences() {
    try {
      console.log("🗺️ Obteniendo geocercas...");

      const response = await fetch(`${this.baseURL}/api/geofences`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });

      const data = await response.json();

      console.log(`✅ ${data.length} geocercas obtenidas`);

      if (!response.ok) {
        throw new Error(
          data.error || `Error ${response.status}: ${response.statusText}`
        );
      }

      return data;
    } catch (error) {
      console.error("💥 Error obteniendo geocercas:", error);
      throw error;
    }
  }

  /**
   * Crea una nueva geocerca
   * @param {Object} geofenceData - Datos de la geocerca
   * @param {string} geofenceData.name - Nombre de la geocerca
   * @param {Array} geofenceData.coordinates - Coordenadas del polígono
   * @param {number} [geofenceData.created_by] - ID del creador
   * @returns {Promise<Object>}
   */
  async createGeofence({ name, coordinates, created_by }) {
    try {
      console.log("🆕 Creando nueva geocerca:", { name, coordinates });

      const response = await fetch(`${this.baseURL}/api/geofences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ name, coordinates, created_by }),
      });

      const data = await response.json();

      console.log("✅ Geocerca creada con ID:", data.id);

      if (!response.ok) {
        throw new Error(
          data.error || `Error ${response.status}: ${response.statusText}`
        );
      }

      return data;
    } catch (error) {
      console.error("💥 Error creando geocerca:", error);
      throw error;
    }
  }

  /**
   * Elimina una geocerca
   * @param {number} id - ID de la geocerca a eliminar
   * @returns {Promise<Object>}
   */
  async deleteGeofence(id) {
    try {
      console.log(`🗑️ Eliminando geocerca ID: ${id}`);

      const response = await fetch(`${this.baseURL}/api/geofences/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });

      const data = await response.json();

      console.log("✅ Geocerca eliminada");

      if (!response.ok) {
        throw new Error(
          data.error || `Error ${response.status}: ${response.statusText}`
        );
      }

      return data;
    } catch (error) {
      console.error("💥 Error eliminando geocerca:", error);
      throw error;
    }
  }

  // ===== MÉTODOS DE ROLES (SIN CAMBIOS) =====

  async loginWithRoles(credentials) {
    try {
      // 1. Hacer login normal
      const loginResult = await this.login(credentials);

      if (!loginResult.success) {
        return loginResult;
      }

      // 2. Obtener roles del usuario
      const rolesResponse = await fetch(
        `${this.baseURL}/api/users/${loginResult.user.id}/roles`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!rolesResponse.ok) {
        throw new Error("Error obteniendo roles del usuario");
      }

      const roles = await rolesResponse.json();

      return {
        success: true,
        user: {
          ...loginResult.user,
          roles,
        },
      };
    } catch (error) {
      console.error("Error en loginWithRoles:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getUserWithRoles(userId) {
    try {
      const response = await fetch(
        `${this.baseURL}/api/users/${userId}/with-roles`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error al obtener información del usuario");
      }

      return await response.json();
    } catch (error) {
      console.error("Error obteniendo usuario con roles:", error);
      throw error;
    }
  }

  // ===== NUEVOS MÉTODOS COMBINADOS (AD + ROLES + GEOCERCAS) =====

  /**
   * Login completo con AD, roles y verificación de geocercas
   */
  async loginComplete(credentials, location) {
    try {
      console.log('🚀 Iniciando login completo...');
      
      // 1. Verificar geocerca si se proporciona ubicación
      if (location) {
        console.log('📍 Verificando geocerca...');
        const geofenceCheck = await this.checkGeofence(location.lat, location.lng);
        if (!geofenceCheck.isInside) {
          throw new Error('Tu ubicación actual no está dentro de las áreas autorizadas.');
        }
      }
      
      // 2. Autenticación automática (AD primero, MySQL como fallback)
      console.log('🔐 Iniciando autenticación...');
      const loginResult = await this.loginAuto(credentials);
      
      if (!loginResult.success) {
        return loginResult;
      }
      
      // 3. Obtener roles si el usuario tiene ID
      let userWithRoles = loginResult.user;
      if (loginResult.user.id) {
        try {
          console.log('👥 Obteniendo roles del usuario...');
          const rolesData = await this.getUserWithRoles(loginResult.user.id);
          userWithRoles = { ...loginResult.user, ...rolesData };
        } catch (rolesError) {
          console.warn('⚠️ No se pudieron obtener roles:', rolesError.message);
          // Continuar sin roles
        }
      }
      
      console.log('✅ Login completo exitoso');
      return {
        success: true,
        user: userWithRoles,
        message: loginResult.message,
        method: loginResult.method,
        geofenceVerified: !!location
      };
      
    } catch (error) {
      console.error('💥 Error en login completo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const authService = new AuthService();