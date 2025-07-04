// src/utils/constants.js
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Auto-detectar protocolo si no se especifica
export const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Si el frontend está en HTTPS, intentar HTTPS primero
  if (window.location.protocol === 'https:') {
    return 'https://localhost:3001';
  }
  
  return 'http://localhost:3001';
};

export const AUTH_STEPS = {
  IDLE: 'idle',
  LOCATION: 'location', 
  DEVICE: 'device',
  CREDENTIALS: 'credentials',
  SUCCESS: 'success'
};

export const AUTH_STEP_MESSAGES = {
  [AUTH_STEPS.LOCATION]: 'Verificando ubicación...',
  [AUTH_STEPS.DEVICE]: 'Verificando dispositivo...',
  [AUTH_STEPS.CREDENTIALS]: 'Autenticando credenciales...',
  [AUTH_STEPS.SUCCESS]: 'Acceso autorizado'
};

export const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000
};

export const MAP_CONFIG = {
  DEFAULT_ZOOM: 17,
  TILE_LAYER_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  TILE_LAYER_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
};

export const DEVICE_VERIFICATION_STATUS = {
  AUTHORIZED: 'authorized',
  PENDING: 'pending',
  DENIED: 'denied',
  REQUIRES_APPROVAL: 'requires_approval'
};

export const ERROR_MESSAGES = {
  LOCATION_DENIED: 'Permisos de ubicación denegados.',
  LOCATION_UNAVAILABLE: 'Información de ubicación no disponible.',
  LOCATION_TIMEOUT: 'Tiempo de espera agotado para obtener ubicación.',
  OUTSIDE_AREA: 'Estás fuera del área permitida para iniciar sesión.',
  DEVICE_NOT_AUTHORIZED: 'Dispositivo no autorizado para acceder al sistema.',
  DEVICE_REQUIRES_APPROVAL: 'Este dispositivo requiere autorización manual.',
  INVALID_CREDENTIALS: 'Usuario o contraseña incorrectos.',
  NETWORK_ERROR: 'Error de conexión. Verifica tu conexión a internet.',
  UNKNOWN_ERROR: 'Ha ocurrido un error inesperado.'
};

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Inicio de sesión exitoso',
  LOGOUT_SUCCESS: 'Sesión cerrada exitosamente',
  DEVICE_AUTHORIZED: 'Dispositivo autorizado exitosamente'
};