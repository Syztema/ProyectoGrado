// src/services/authService.js
import { getApiUrl } from '../utils/constants';

class AuthService {
  constructor() {
    this.baseURL = getApiUrl();
    console.log(`🔗 AuthService configurado para: ${this.baseURL}`);
  }

  async login({ username, password, deviceFingerprint, location, deviceId }) {
    try {
      console.log('🔐 Intentando login:', { username, hasPassword: !!password, deviceFingerprint: deviceFingerprint?.substring(0, 8) + '...' });
      
      const response = await fetch(`${this.baseURL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Para mantener sesiones
        body: JSON.stringify({
          username,
          password,
          deviceFingerprint,
          location,
          deviceId
        }),
      });

      const data = await response.json();
      
      console.log('📡 Respuesta del servidor:', { status: response.status, data });

      if (!response.ok) {
        console.error('❌ Error del servidor:', data);
        throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Login exitoso');
      return {
        success: true,
        user: data.user,
        message: data.message
      };
    } catch (error) {
      console.error('💥 Error en login:', error);
      
      // Proporcionar información adicional para debugging
      if (error.message.includes('Failed to fetch')) {
        console.error('🔧 Problema de conectividad:');
        console.error(`   Frontend: ${window.location.origin}`);
        console.error(`   Backend: ${this.baseURL}`);
        console.error('   Verifica que el backend esté ejecutándose');
        throw new Error('No se puede conectar al servidor. Verifica que esté ejecutándose.');
      }
      
      throw error;
    }
  }

  async logout() {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error cerrando sesión');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en logout:', error);
      throw error;
    }
  }

  async checkSession() {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/check-session`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return { authenticated: false };
      }

      return await response.json();
    } catch (error) {
      console.error('Error verificando sesión:', error);
      
      // Información adicional para debugging CORS
      if (error.message.includes('Failed to fetch')) {
        console.error('🔧 Posible problema CORS. Verifica:');
        console.error('1. Backend ejecutándose en puerto 3001');
        console.error('2. Configuración CORS del backend');
        console.error(`3. Frontend URL: ${window.location.origin}`);
        console.error(`4. Backend URL: ${this.baseURL}`);
      }
      
      return { authenticated: false };
    }
  }

  async refreshToken() {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error refrescando token');
      }

      return await response.json();
    } catch (error) {
      console.error('Error refrescando token:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();