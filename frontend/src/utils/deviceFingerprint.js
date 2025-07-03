// src/utils/deviceFingerprint.js

// Función para generar hash simple
export const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a 32bit integer
  }
  return Math.abs(hash).toString(36);
};

// Obtener información básica del navegador
export const getBrowserInfo = () => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    languages: navigator.languages?.join(',') || '',
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack || 'unknown',
    onLine: navigator.onLine,
    vendor: navigator.vendor || 'unknown',
    product: navigator.product || 'unknown'
  };
};

// Obtener información de pantalla
export const getScreenInfo = () => {
  return {
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    screenColorDepth: window.screen.colorDepth,
    screenPixelDepth: window.screen.pixelDepth,
    pixelRatio: window.devicePixelRatio,
    availableResolution: `${window.screen.availWidth}x${window.screen.availHeight}`,
    orientation: window.screen.orientation?.type || 'unknown'
  };
};

// Obtener información de hardware
export const getHardwareInfo = () => {
  return {
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: navigator.deviceMemory || 0,
    maxTouchPoints: navigator.maxTouchPoints || 0
  };
};

// Obtener información de zona horaria
export const getTimezoneInfo = () => {
  const date = new Date();
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: date.getTimezoneOffset(),
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    dateFormat: new Intl.DateTimeFormat().format(date)
  };
};

// Generar fingerprint de canvas
export const getCanvasFingerprint = () => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Configurar canvas
    canvas.width = 200;
    canvas.height = 50;
    
    // Dibujar contenido único
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    
    ctx.fillStyle = '#069';
    ctx.fillText('Device fingerprint canvas 🔒', 2, 15);
    
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Testing 123!@#$%^&*()', 4, 35);

    return simpleHash(canvas.toDataURL());
  } catch (error) {
    return 'canvas-error';
  }
};

// Generar fingerprint de WebGL
export const getWebGLFingerprint = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return 'no-webgl';
    
    const renderer = gl.getParameter(gl.RENDERER);
    const vendor = gl.getParameter(gl.VENDOR);
    const version = gl.getParameter(gl.VERSION);
    const shadingLanguageVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    let unmaskedRenderer = '';
    let unmaskedVendor = '';
    
    if (debugInfo) {
      unmaskedRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      unmaskedVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    }
    
    const fingerprint = [
      renderer,
      vendor,
      version,
      shadingLanguageVersion,
      unmaskedRenderer,
      unmaskedVendor
    ].join('|');
    
    return simpleHash(fingerprint);
  } catch (error) {
    return 'webgl-error';
  }
};

// Generar fingerprint de audio
export const getAudioFingerprint = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    const oscillator = audioCtx.createOscillator();
    const analyser = audioCtx.createAnalyser();
    const gainNode = audioCtx.createGain();
    const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
    
    const fingerprint = [
      audioCtx.sampleRate,
      audioCtx.destination.channelCount,
      audioCtx.destination.numberOfInputs,
      audioCtx.destination.numberOfOutputs,
      analyser.fftSize,
      analyser.frequencyBinCount
    ].join('|');
    
    // Limpiar recursos
    audioCtx.close();
    
    return simpleHash(fingerprint);
  } catch (error) {
    return 'no-audio';
  }
};

// Obtener información de fuentes disponibles
export const getFontsFingerprint = () => {
  try {
    const testFonts = [
      'Arial', 'Arial Black', 'Arial Narrow', 'Arial Unicode MS',
      'Comic Sans MS', 'Courier', 'Courier New', 'Georgia',
      'Helvetica', 'Impact', 'Lucida Console', 'Lucida Sans Unicode',
      'Microsoft Sans Serif', 'Palatino', 'Tahoma', 'Times',
      'Times New Roman', 'Trebuchet MS', 'Verdana'
    ];
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const availableFonts = [];
    
    const baseFontSize = '72px';
    const testText = 'mmmmmmmmmmlli';
    
    // Medida base con fuente genérica
    ctx.font = `${baseFontSize} monospace`;
    const baseWidth = ctx.measureText(testText).width;
    
    testFonts.forEach(font => {
      ctx.font = `${baseFontSize} ${font}, monospace`;
      const width = ctx.measureText(testText).width;
      
      if (width !== baseWidth) {
        availableFonts.push(font);
      }
    });
    
    return simpleHash(availableFonts.join(','));
  } catch (error) {
    return 'fonts-error';
  }
};

// Obtener plugins del navegador
export const getPluginsFingerprint = () => {
  try {
    if (!navigator.plugins) return 'no-plugins';
    
    const plugins = Array.from(navigator.plugins).map(plugin => {
      return `${plugin.name}:${plugin.version}`;
    }).sort().join(',');
    
    return simpleHash(plugins);
  } catch (error) {
    return 'plugins-error';
  }
};

// Generar fingerprint completo del dispositivo
export const generateDeviceFingerprint = () => {
  const components = {
    browser: getBrowserInfo(),
    screen: getScreenInfo(),
    hardware: getHardwareInfo(),
    timezone: getTimezoneInfo(),
    canvas: getCanvasFingerprint(),
    webgl: getWebGLFingerprint(),
    audio: getAudioFingerprint(),
    fonts: getFontsFingerprint(),
    plugins: getPluginsFingerprint()
  };
  
  // Crear string único combinando toda la información
  const fingerprintString = Object.entries(components).map(([key, value]) => {
    if (typeof value === 'object') {
      return `${key}:${Object.values(value).join('|')}`;
    }
    return `${key}:${value}`;
  }).join('||');
  
  const uniqueFingerprint = simpleHash(fingerprintString);
  
  return {
    fingerprint: uniqueFingerprint,
    components,
    timestamp: Date.now()
  };
};

// Comparar dos fingerprints y calcular similitud
export const compareFingerprints = (fp1, fp2) => {
  if (!fp1.components || !fp2.components) {
    return { similarity: 0, details: {} };
  }
  
  const categories = Object.keys(fp1.components);
  const similarities = {};
  let totalSimilarity = 0;
  
  categories.forEach(category => {
    const val1 = fp1.components[category];
    const val2 = fp2.components[category];
    
    if (typeof val1 === 'object' && typeof val2 === 'object') {
      const keys = new Set([...Object.keys(val1), ...Object.keys(val2)]);
      let matches = 0;
      
      keys.forEach(key => {
        if (val1[key] === val2[key]) {
          matches++;
        }
      });
      
      similarities[category] = matches / keys.size;
    } else {
      similarities[category] = val1 === val2 ? 1 : 0;
    }
    
    totalSimilarity += similarities[category];
  });
  
  return {
    similarity: totalSimilarity / categories.length,
    details: similarities
  };
};

// Verificar si un fingerprint es válido
export const isValidFingerprint = (fingerprint) => {
  return fingerprint && 
         typeof fingerprint === 'string' && 
         fingerprint.length > 0 && 
         fingerprint !== 'undefined' &&
         fingerprint !== 'null';
};