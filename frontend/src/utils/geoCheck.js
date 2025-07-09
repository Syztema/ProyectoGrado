// src/utils/geoCheck.js

import { authService } from "../services/authService";

// Coordenadas del polígono
// export const polygonCoordinates = [
//   [-74.19177577881777, 4.622497286638605],
//   [-74.19177577881777, 4.620544132388574],
//   [-74.1893973205417, 4.620544132388574],
//   [-74.1893973205417, 4.622497286638605],
//   [-74.19177577881777, 4.622497286638605],
// ];

// Función que verifica si un punto está dentro de alguna geocerca
export async function isWithinArea(userLat, userLng) {
  try {
    // Validación básica de coordenadas en el frontend también
    if (
      typeof userLat !== "number" ||
      typeof userLng !== "number" ||
      isNaN(userLat) ||
      isNaN(userLng)
    ) {
      console.error("❌ Coordenadas inválidas:", { userLat, userLng });
      return false;
    }

    const result = await authService.checkGeofence(userLat, userLng);

    if (!result.success) {
      console.error("❌ Error en verificación de geocerca:", result.error);
      return false;
    }

    if (result.geofences.length === 0) {
      console.warn("⚠️ No hay geocercas definidas en el sistema");
      return false;
    }

    return result.isInside;
  } catch (error) {
    console.error("❌ Error inesperado verificando geocerca:", error);
    return false;
  }
}

// Función para obtener todas las geocercas (opcional, para mostrar en mapa)
export async function getGeofences() {
  try {
    const response = await authService.getGeofences();
    return response;
  } catch (error) {
    console.error("Error obteniendo geocercas:", error);
    return [];
  }
}
