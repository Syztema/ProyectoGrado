// src/hooks/useLocationValidation.js
import { useState, useCallback, useEffect } from 'react';
import { isWithinArea } from '../utils/geoCheck';
import { useGeolocation } from './useGeolocation';

export const useLocationValidation = (options = {}) => {
  const {
    autoValidate = false,
    onLocationChange = null,
    onValidationChange = null,
    validateOnMount = false
  } = options;

  const { location, getCurrentPosition, loading, error } = useGeolocation();
  const [isValid, setIsValid] = useState(null);
  const [validationHistory, setValidationHistory] = useState([]);
  const [lastValidation, setLastValidation] = useState(null);

  // Función para validar una ubicación específica
  const validateLocation = useCallback((lat, lng) => {
    const valid = isWithinArea(lat, lng);
    const timestamp = new Date().toISOString();
    
    const validationResult = {
      lat,
      lng,
      isValid: valid,
      timestamp,
      accuracy: null
    };

    setIsValid(valid);
    setLastValidation(validationResult);
    
    // Agregar al historial (mantener solo los últimos 10)
    setValidationHistory(prev => {
      const newHistory = [validationResult, ...prev];
      return newHistory.slice(0, 10);
    });

    // Callback de cambio de validación
    if (onValidationChange) {
      onValidationChange(validationResult);
    }

    return validationResult;
  }, [onValidationChange]);

  // Función para validar la ubicación actual
  const validateCurrentLocation = useCallback(async () => {
    try {
      const currentLocation = await getCurrentPosition();
      const result = validateLocation(currentLocation.lat, currentLocation.lng);
      
      // Agregar precisión al resultado
      result.accuracy = currentLocation.accuracy;
      
      return result;
    } catch (err) {
      throw new Error(`Error obteniendo ubicación: ${err.message}`);
    }
  }, [getCurrentPosition, validateLocation]);

  // Función para obtener estadísticas de ubicación
  const getLocationStats = useCallback(() => {
    if (validationHistory.length === 0) {
      return null;
    }

    const validCount = validationHistory.filter(v => v.isValid).length;
    const totalCount = validationHistory.length;
    const validPercentage = (validCount / totalCount) * 100;

    return {
      totalValidations: totalCount,
      validValidations: validCount,
      invalidValidations: totalCount - validCount,
      validPercentage: Math.round(validPercentage),
      lastValidation: validationHistory[0],
      firstValidation: validationHistory[validationHistory.length - 1]
    };
  }, [validationHistory]);

  // Función para limpiar el historial
  const clearHistory = useCallback(() => {
    setValidationHistory([]);
    setLastValidation(null);
    setIsValid(null);
  }, []);

  // Efecto para validación automática cuando cambia la ubicación
  useEffect(() => {
    if (location && autoValidate) {
      validateLocation(location.lat, location.lng);
    }
  }, [location, autoValidate, validateLocation]);

  // Efecto para validación en el montaje
  useEffect(() => {
    if (validateOnMount && !location) {
      validateCurrentLocation().catch(console.error);
    }
  }, [validateOnMount, location, validateCurrentLocation]);

  // Callback cuando cambia la ubicación
  useEffect(() => {
    if (location && onLocationChange) {
      onLocationChange(location);
    }
  }, [location, onLocationChange]);

  return {
    // Estado de ubicación
    location,
    loading,
    error,
    
    // Estado de validación
    isValid,
    lastValidation,
    validationHistory,
    
    // Funciones
    validateCurrentLocation,
    validateLocation,
    getCurrentPosition,
    
    // Utilidades
    getLocationStats,
    clearHistory,
    
    // Estado computado
    hasValidationHistory: validationHistory.length > 0,
    isCurrentlyValid: isValid === true,
    isCurrentlyInvalid: isValid === false,
    hasNeverValidated: isValid === null
  };
};