// src/hooks/useDeviceFingerprint.js
import { useState, useEffect, useCallback } from 'react';

export const useDeviceFingerprint = () => {
  const [fingerprint, setFingerprint] = useState('');
  const [deviceInfo, setDeviceInfo] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Función para generar hash simple
  const simpleHash = useCallback((str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit integer
    }
    return Math.abs(hash).toString(36);
  }, []);

  // Función para obtener fingerprint del canvas
  const getCanvasFingerprint = useCallback(() => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint canvas', 2, 2);
      return simpleHash(canvas.toDataURL());
    } catch (error) {
      return 'canvas-error';
    }
  }, [simpleHash]);

  // Función para obtener información WebGL
  const getWebGLInfo = useCallback(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'no-webgl';
      
      const renderer = gl.getParameter(gl.RENDERER);
      const vendor = gl.getParameter(gl.VENDOR);
      return simpleHash(renderer + vendor);
    } catch (error) {
      return 'webgl-error';
    }
  }, [simpleHash]);

  // Función para obtener audio fingerprint
  const getAudioFingerprint = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      return simpleHash(audioCtx.sampleRate.toString() + audioCtx.destination.channelCount.toString());
    } catch (error) {
      return 'no-audio';
    }
  }, [simpleHash]);

  // Generar huella digital completa
  const generateFingerprint = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      const info = {
        // Información básica del navegador
        userAgent: window.navigator.userAgent,
        platform: window.navigator.platform,
        language: window.navigator.language,
        languages: window.navigator.languages?.join(',') || '',
        
        // Información de pantalla
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        screenColorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio,
        
        // Información de hardware
        hardwareConcurrency: window.navigator.hardwareConcurrency || 0,
        deviceMemory: window.navigator.deviceMemory || 0,
        
        // Zona horaria
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
        
        // Fingerprints adicionales
        canvasFingerprint: getCanvasFingerprint(),
        webglFingerprint: getWebGLInfo(),
        audioFingerprint: getAudioFingerprint(),
        
        // Características del navegador
        cookieEnabled: window.navigator.cookieEnabled,
        doNotTrack: window.navigator.doNotTrack || 'unknown'
      };

      // Crear string único combinando toda la información
      const fingerprintString = Object.values(info).join('|');
      const uniqueFingerprint = simpleHash(fingerprintString);
      
      setDeviceInfo(info);
      setFingerprint(uniqueFingerprint);
      setLoading(false);
      
      return {
        fingerprint: uniqueFingerprint,
        deviceInfo: info
      };
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [simpleHash, getCanvasFingerprint, getWebGLInfo, getAudioFingerprint]);

  // Generar fingerprint automáticamente al montar el hook
  useEffect(() => {
    generateFingerprint();
  }, [generateFingerprint]);

  return {
    fingerprint,
    deviceInfo,
    loading,
    error,
    generateFingerprint
  };
};