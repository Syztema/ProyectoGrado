// src/services/geoService.js
import { getApiUrl, GEOLOCATION_OPTIONS } from "../utils/constants";

class GeoService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'https://localhost:3001';
    console.log('GeoService inicializado con baseURL:', this.baseURL);
    this.watchId = null;
    this.lastKnownLocation = null;
  }

  // Obtener ubicación actual con opciones personalizadas
  async getCurrentPosition(options = GEOLOCATION_OPTIONS) {
    return new Promise((resolve, reject) => {
      if (!window.navigator.geolocation) {
        reject(new Error("Geolocalización no soportada por este navegador"));
        return;
      }

      window.navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          };

          this.lastKnownLocation = locationData;
          resolve(locationData);
        },
        (error) => {
          reject(this.handleGeolocationError(error));
        },
        options
      );
    });
  }

  // Observar cambios de ubicación
  watchPosition(onSuccess, onError, options = GEOLOCATION_OPTIONS) {
    if (!window.navigator.geolocation) {
      onError(new Error("Geolocalización no soportada"));
      return null;
    }

    this.watchId = window.navigator.geolocation.watchPosition(
      (position) => {
        const locationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        };

        this.lastKnownLocation = locationData;
        onSuccess(locationData);
      },
      (error) => {
        onError(this.handleGeolocationError(error));
      },
      options
    );

    return this.watchId;
  }

  // Detener observación de ubicación
  clearWatch() {
    if (this.watchId !== null) {
      window.navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  // Manejar errores de geolocalización
  handleGeolocationError(error) {
    let message = "Error desconocido obteniendo ubicación";

    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = "Permisos de ubicación denegados por el usuario";
        break;
      case error.POSITION_UNAVAILABLE:
        message = "Información de ubicación no disponible";
        break;
      case error.TIMEOUT:
        message = "Tiempo de espera agotado para obtener ubicación";
        break;
      default:
        message = `Error de geolocalización: ${error.message}`;
        break;
    }

    return new Error(message);
  }

  // Verificar permisos de geolocalización
  async checkPermissions() {
    if (!window.navigator.permissions) {
      return { state: "unknown" };
    }

    try {
      const permission = await window.navigator.permissions.query({
        name: "geolocation",
      });
      return {
        state: permission.state, // 'granted', 'denied', 'prompt'
        onchange: permission.onchange,
      };
    } catch (error) {
      return { state: "unknown", error: error.message };
    }
  }

  // Calcular distancia entre dos puntos (en metros)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Enviar ubicación al servidor para validación
  async validateLocationWithServer(location) {
    try {
      const response = await fetch(`${this.baseURL}/api/geo/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
          timestamp: location.timestamp,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error validando ubicación");
      }

      return await response.json();
    } catch (error) {
      console.error("Error validando ubicación con servidor:", error);
      throw error;
    }
  }

  // Reportar ubicación al servidor (para auditoría)
  async reportLocation(location, context = {}) {
    try {
      const response = await fetch(`${this.baseURL}/api/geo/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          location: {
            lat: location.lat,
            lng: location.lng,
            accuracy: location.accuracy,
            timestamp: location.timestamp,
          },
          context: {
            userAgent: window.navigator.userAgent,
            platform: window.navigator.platform,
            ...context,
          },
        }),
      });

      if (!response.ok) {
        console.warn("No se pudo reportar la ubicación al servidor");
      }

      return response.ok;
    } catch (error) {
      console.warn("Error reportando ubicación:", error);
      return false;
    }
  }

  // Obtener la última ubicación conocida
  getLastKnownLocation() {
    return this.lastKnownLocation;
  }

  // Verificar si el navegador soporta geolocalización
  isGeolocationSupported() {
    return "geolocation" in window.navigator;
  }

  // Obtener información sobre las capacidades de geolocalización
  getGeolocationCapabilities() {
    return {
      supported: this.isGeolocationSupported(),
      permissions: "permissions" in window.navigator,
      highAccuracy: true, // La mayoría de navegadores modernos lo soportan
      watchPosition: this.isGeolocationSupported(),
    };
  }

  //FUNCIONES DE CREACIÓN DE GEOCERCAS
  async saveGeofence(geofenceData) {
    try {
      const response = await fetch(`${this.baseURL}/api/geofences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(geofenceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al guardar la geocerca");
      }

      return await response.json();
    } catch (error) {
      console.error("Error guardando geocerca:", error);
      throw error;
    }
  }

  async deleteGeofence(id) {
    try {
      // Asegúrate de que baseURL apunte a tu backend
      console.log(
        `Eliminando geocerca con ID ${id} en URL: ${this.baseURL}/api/geofences/${id}`
      );

      const response = await fetch(`${this.baseURL}/api/geofences/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Si la respuesta no es OK, obtén el texto para depuración
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error ${response.status}:`, errorText);
        throw new Error(`Error al eliminar la geocerca (${response.status})`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error eliminando geocerca:", error);
      throw error;
    }
  }
}

export const geoService = new GeoService();
