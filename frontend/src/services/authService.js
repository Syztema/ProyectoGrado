// src/services/authService.js
import { getApiUrl } from "../utils/constants";

class AuthService {
  constructor() {
    this.baseURL = getApiUrl();
    console.log(`🔗 AuthService configurado para: ${this.baseURL}`);
  }

  async login({
    username,
    password,
    deviceFingerprint,
    location,
    deviceId,
    auth_token,
  }) {
    try {
      console.log("🔐 Intentando login:", {
        username,
        hasPassword: !!password,
        deviceFingerprint: deviceFingerprint?.substring(0, 8) + "...",
      });

      const response = await fetch(`${this.baseURL}/api/auth/login`, {
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
        }),
      });

      const data = await response.json();

      console.log("📡 Respuesta del servidor:", {
        status: response.status,
        data,
      });

      if (!response.ok) {
        console.error("❌ Error del servidor:", data);
        throw new Error(
          data.error || `Error ${response.status}: ${response.statusText}`
        );
      }

      console.log("✅ Login exitoso");
      return {
        success: true,
        user: data.user,
        message: data.message,
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
}

export const authService = new AuthService();
