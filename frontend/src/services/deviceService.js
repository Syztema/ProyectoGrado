// src/services/deviceService.js
import { getApiUrl } from '../utils/constants';

class DeviceService {
  constructor() {
    this.baseURL = getApiUrl();
  }

  async verifyDevice({ deviceFingerprint, deviceInfo, location }) {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/verify-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          deviceFingerprint,
          deviceInfo: {
            ...deviceInfo,
            location: location ? {
              lat: location.lat,
              lng: location.lng,
              accuracy: location.accuracy
            } : null
          }
        }),
      });

      const data = await response.json();

      if (!response.ok && response.status !== 403) {
        throw new Error(data.error || 'Error verificando dispositivo');
      }

      return {
        authorized: data.authorized || false,
        deviceId: data.deviceId,
        requiresManualApproval: data.requiresManualApproval || false,
        message: data.message
      };
    } catch (error) {
      console.error('Error verificando dispositivo:', error);
      throw error;
    }
  }

  async requestDeviceAuthorization({ deviceFingerprint, deviceInfo, justification }) {
    try {
      const response = await fetch(`${this.baseURL}/api/device/request-authorization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          deviceFingerprint,
          deviceInfo,
          justification
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error solicitando autorización');
      }

      return data;
    } catch (error) {
      console.error('Error solicitando autorización:', error);
      throw error;
    }
  }

  async getDeviceStatus(deviceFingerprint) {
    try {
      const response = await fetch(
        `${this.baseURL}/api/device/status?fingerprint=${encodeURIComponent(deviceFingerprint)}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo estado del dispositivo');
      }

      return data;
    } catch (error) {
      console.error('Error obteniendo estado del dispositivo:', error);
      throw error;
    }
  }

  async reportDeviceActivity({ deviceFingerprint, activity }) {
    try {
      const response = await fetch(`${this.baseURL}/api/device/activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          deviceFingerprint,
          activity,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error reportando actividad');
      }

      return await response.json();
    } catch (error) {
      console.error('Error reportando actividad:', error);
      throw error;
    }
  }
}

export const deviceService = new DeviceService();