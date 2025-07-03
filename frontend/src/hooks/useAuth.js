// src/hooks/useAuth.js
import { useState, useCallback } from 'react';
import { authService } from '../services/authService';
import { deviceService } from '../services/deviceService';
import { useGeolocation } from './useGeolocation';
import { useDeviceFingerprint } from './useDeviceFingerprint';
import { isWithinArea } from '../utils/geoCheck';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authStep, setAuthStep] = useState('idle'); // idle, location, device, credentials, success
  
  const { getCurrentPosition } = useGeolocation();
  const { fingerprint, deviceInfo, generateFingerprint } = useDeviceFingerprint();

  const login = useCallback(async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      setAuthStep('location');

      // 1. Verificar ubicación
      console.log('🗺️ Verificando ubicación...');
      const location = await getCurrentPosition();
      
      const isLocationValid = isWithinArea(location.lat, location.lng);
      if (!isLocationValid) {
        throw new Error('Estás fuera del área permitida para iniciar sesión.');
      }

      setAuthStep('device');
      
      // 2. Generar y verificar dispositivo
      console.log('🔍 Verificando dispositivo...');
      const { fingerprint: deviceFingerprint, deviceInfo: deviceData } = await generateFingerprint();
      
      const deviceVerification = await deviceService.verifyDevice({
        deviceFingerprint,
        deviceInfo: deviceData,
        location
      });

      if (!deviceVerification.authorized) {
        if (deviceVerification.requiresManualApproval) {
          throw new Error(
            'Este dispositivo requiere autorización manual. ' +
            'Contacta al administrador del sistema. ' +
            `Código de dispositivo: ${deviceFingerprint.substring(0, 8)}...`
          );
        }
        throw new Error('Dispositivo no autorizado para acceder al sistema.');
      }

      setAuthStep('credentials');

      // 3. Autenticar credenciales con backend
      console.log('🔐 Verificando credenciales...');
      const authResult = await authService.login({
        ...credentials,
        deviceFingerprint,
        location,
        deviceId: deviceVerification.deviceId
      });

      if (!authResult.success) {
        throw new Error(authResult.error || 'Credenciales inválidas');
      }

      setAuthStep('success');
      
      // 🎯 CRÍTICO: Actualizar estado local Y contexto
      console.log('✅ Actualizando estado de autenticación...', authResult.user);
      setUser(authResult.user);
      setLoading(false);

      return {
        success: true,
        user: authResult.user,
        deviceId: deviceVerification.deviceId
      };

    } catch (err) {
      console.error('❌ Error en useAuth.login:', err);
      setError(err.message);
      setLoading(false);
      setAuthStep('idle');
      throw err;
    }
  }, [getCurrentPosition, generateFingerprint]);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await authService.logout();
      setUser(null);
      setError(null);
      setAuthStep('idle');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 🎯 AÑADIR: Estado computado más claro
  const isAuthenticated = !!user;

  console.log('🔍 useAuth state:', { user, isAuthenticated, loading, authStep });

  return {
    user,
    loading,
    error,
    authStep,
    login,
    logout,
    clearError,
    isAuthenticated
  };
};