// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Configuración global para desarrollo
if (process.env.NODE_ENV === 'development') {
  // Habilitar logging detallado en desarrollo
  window.DEBUG = process.env.REACT_APP_DEBUG_MODE === 'true';
}

// Función para manejar errores no capturados
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // En producción, podrías enviar esto a un servicio de logging
  if (process.env.NODE_ENV === 'production') {
    // Ejemplo: enviar a servicio de monitoreo
    // errorReportingService.reportError(event.reason);
  }
});

// Función para manejar errores de JavaScript
window.addEventListener('error', (event) => {
  console.error('JavaScript error:', event.error);
  
  if (process.env.NODE_ENV === 'production') {
    // Ejemplo: enviar a servicio de monitoreo
    // errorReportingService.reportError(event.error);
  }
});

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Reportar métricas de rendimiento web
// Puedes enviar estos datos a un servicio de analytics
reportWebVitals((metric) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Web Vital:', metric);
  }
  
  // En producción, enviar a servicio de analytics
  // analytics.sendMetric(metric);
});