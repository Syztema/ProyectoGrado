// src/hooks/useAuth.js
import { useState, useCallback, useEffect } from 'react';
import { authService } from '../services/authService';
import { deviceService } from '../services/deviceService';
import { useGeolocation } from './useGeolocation';
import { useDeviceFingerprint } from './useDeviceFingerprint';
import { isWithinArea } from '../utils/geoCheck';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authStep, setAuthStep] = useState('idle'); // idle, location, geofence, computer, device, credentials, authorization, success
  const [authMethod, setAuthMethod] = useState('auto'); // 'auto', 'ad', 'mysql'
  const [adStatus, setAdStatus] = useState({ available: false, checked: false });
  
  const { getCurrentPosition } = useGeolocation();
  const { fingerprint, deviceInfo, generateFingerprint } = useDeviceFingerprint();

  // Verificar estado de AD al inicializar
  useEffect(() => {
    const checkADAvailability = async () => {
      try {
        const status = await authService.checkADStatus();
        setAdStatus({ available: status.available, checked: true });
        console.log('🔍 Estado de AD:', status);
      } catch (error) {
        console.warn('⚠️ No se pudo verificar estado de AD:', error);
        setAdStatus({ available: false, checked: true });
      }
    };

    checkADAvailability();
  }, []);

  const login = useCallback(async (credentials, method = authMethod) => {
    try {
      setLoading(true);
      setError(null);
      setAuthStep('location');

      console.log(`🚀 Iniciando proceso de login con método: ${method}`);

      // 1. Verificar ubicación básica
      console.log('🗺️ Verificando ubicación...');
      const location = await getCurrentPosition();
      
      // Verificación básica de área (tu lógica existente)
      const isLocationValid = isWithinArea(location.lat, location.lng);
      if (!isLocationValid) {
        throw new Error('Estás fuera del área permitida para iniciar sesión.');
      }

      // 2. Verificar geocercas (nueva funcionalidad)
      setAuthStep('geofence');
      console.log('📍 Verificando geocercas...');
      
      try {
        const geofenceCheck = await authService.checkGeofence(location.lat, location.lng);
        if (!geofenceCheck.isInside) {
          throw new Error('Tu ubicación no está dentro de las geocercas autorizadas.');
        }
        console.log('✅ Geocerca verificada');
      } catch (geofenceError) {
        console.warn('⚠️ Error verificando geocerca:', geofenceError.message);
        // Continuar sin geocerca si no es crítico
      }

      // 3. Generar fingerprint del dispositivo
      setAuthStep('device');
      console.log('🔍 Generando fingerprint del dispositivo...');
      const { fingerprint: deviceFingerprint, deviceInfo: deviceData } = await generateFingerprint();

      // 4. Proceso según método de autenticación
      if (method === 'auto') {
        // Detección automática: AD primero, MySQL como fallback
        console.log('🔄 Modo automático: intentando AD primero...');
        
        if (adStatus.available) {
          setAuthStep('computer');
          console.log('🖥️ Verificando equipo en dominio...');
          
          setAuthStep('credentials');
          console.log('🔐 Autenticando con Active Directory...');
          
          try {
            const authResult = await authService.loginComplete({
              ...credentials,
              deviceFingerprint,
              location,
              deviceInfo: deviceData
            }, location);

            if (authResult.success) {
              setAuthStep('success');
              setUser(authResult.user);
              setLoading(false);

              return {
                success: true,
                user: authResult.user,
                method: authResult.method,
                geofenceVerified: authResult.geofenceVerified
              };
            }
          } catch (adError) {
            console.warn('⚠️ Falló autenticación AD:', adError.message);
            
            // Si el error es de autorización, no hacer fallback
            if (adError.message.includes('no tiene permisos') || 
                adError.message.includes('no pertenece a los grupos') ||
                adError.message.includes('no está unido al dominio')) {
              throw adError;
            }
            
            console.log('🔄 Intentando fallback a MySQL...');
          }
        }
        
        // Fallback a MySQL
        console.log('🔐 Usando autenticación MySQL...');
        method = 'mysql';
      }

      if (method === 'ad') {
        // Solo Active Directory
        if (!adStatus.available) {
          throw new Error('Active Directory no está disponible actualmente.');
        }
        
        setAuthStep('computer');
        console.log('🖥️ Verificando equipo en dominio...');
        
        setAuthStep('credentials');
        console.log('🔐 Autenticando con Active Directory...');
        
        const authResult = await authService.loginWithAD({
          ...credentials,
          deviceFingerprint,
          location,
          deviceInfo: deviceData
        });

        if (!authResult.success) {
          throw new Error(authResult.error || 'Error de autenticación AD');
        }

        setAuthStep('authorization');
        console.log('👥 Verificando roles y permisos...');

        // Obtener roles si es posible
        let userWithRoles = authResult.user;
        if (authResult.user.id) {
          try {
            const rolesData = await authService.getUserWithRoles(authResult.user.id);
            userWithRoles = { ...authResult.user, ...rolesData };
          } catch (rolesError) {
            console.warn('⚠️ No se pudieron obtener roles:', rolesError.message);
          }
        }

        setAuthStep('success');
        setUser(userWithRoles);
        setLoading(false);

        return {
          success: true,
          user: userWithRoles,
          method: 'ad'
        };

      } else if (method === 'mysql') {
        // Solo MySQL (proceso original mejorado)
        setAuthStep('device');
        
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
        console.log('🔐 Autenticando con base de datos...');

        const authResult = await authService.login({
          ...credentials,
          deviceFingerprint,
          location,
          deviceId: deviceVerification.deviceId,
          useAD: false
        });

        if (!authResult.success) {
          throw new Error(authResult.error || 'Credenciales inválidas');
        }

        // Obtener roles
        let userWithRoles = authResult.user;
        if (authResult.user.id) {
          try {
            const rolesData = await authService.getUserWithRoles(authResult.user.id);
            userWithRoles = { ...authResult.user, ...rolesData };
          } catch (rolesError) {
            console.warn('⚠️ No se pudieron obtener roles:', rolesError.message);
          }
        }

        setAuthStep('success');
        setUser(userWithRoles);
        setLoading(false);

        return {
          success: true,
          user: userWithRoles,
          deviceId: deviceVerification.deviceId,
          method: 'mysql'
        };
      }

    } catch (err) {
      console.error('❌ Error en useAuth.login:', err);
      setError(err.message);
      setLoading(false);
      setAuthStep('idle');
      throw err;
    }
  }, [getCurrentPosition, generateFingerprint, authMethod, adStatus]);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await authService.logout();
      setUser(null);
      setError(null);
      setAuthStep('idle');
      setAuthMethod('auto');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Función para cambiar método de autenticación
  const switchAuthMethod = useCallback((newMethod) => {
    if (['auto', 'ad', 'mysql'].includes(newMethod)) {
      setAuthMethod(newMethod);
      console.log(`🔄 Método de autenticación cambiado a: ${newMethod}`);
    }
  }, []);

  // Función para verificar geocercas manualmente
  const checkGeofence = useCallback(async (lat, lng) => {
    try {
      const result = await authService.checkGeofence(lat, lng);
      return result;
    } catch (error) {
      console.error('Error verificando geocerca:', error);
      return { isInside: false, error: error.message };
    }
  }, []);

  // Función para refrescar estado de AD
  const refreshADStatus = useCallback(async () => {
    try {
      const status = await authService.checkADStatus();
      setAdStatus({ available: status.available, checked: true });
      return status;
    } catch (error) {
      console.error('Error refrescando estado AD:', error);
      setAdStatus({ available: false, checked: true });
      return { available: false, error: error.message };
    }
  }, []);

  const isAuthenticated = !!user;

  console.log('🔍 useAuth state:', { 
    user: user?.username || 'No user', 
    isAuthenticated, 
    loading, 
    authStep,
    authMethod,
    adAvailable: adStatus.available
  });

  return {
    user,
    loading,
    error,
    authStep,
    authMethod,
    adStatus,
    login,
    logout,
    clearError,
    isAuthenticated,
    switchAuthMethod,
    checkGeofence,
    refreshADStatus
  };
};