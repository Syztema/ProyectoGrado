// src/hooks/useGeolocation.js
import { useState, useCallback } from 'react';

export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getCurrentPosition = useCallback(() => {
    return new Promise((resolve, reject) => {
      setLoading(true);
      setError(null);

      if (!window.navigator.geolocation) {
        const error = 'Geolocalización no es soportada por este navegador.';
        setError(error);
        setLoading(false);
        reject(new Error(error));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      };

      window.navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const locationData = {
            lat: latitude,
            lng: longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          
          setLocation(locationData);
          setLoading(false);
          resolve(locationData);
        },
        (error) => {
          let errorMessage = 'No se pudo obtener la ubicación.';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permisos de ubicación denegados.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Información de ubicación no disponible.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Tiempo de espera agotado para obtener ubicación.';
              break;
            default:
              errorMessage = `Error desconocido: ${error.message}`;
              break;
          }
          
          setError(errorMessage);
          setLoading(false);
          reject(new Error(errorMessage));
        },
        options
      );
    });
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
  }, []);

  return {
    location,
    loading,
    error,
    getCurrentPosition,
    clearLocation
  };
};