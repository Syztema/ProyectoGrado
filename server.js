// server.js - Backend Limpio y Funcional
const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

// Importar bcrypt con manejo de errores
let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch (error) {
  console.warn('⚠️ bcrypt no disponible, usando contraseñas en texto plano');
  // Fallback simple para bcrypt
  bcrypt = {
    hash: async (password) => password,
    compare: async (password, hash) => password === hash
  };
}

const app = express();
const PORT = process.env.PORT || 3001;

// ===== CONFIGURACIÓN =====

// Configuración de base de datos MySQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'proyecto',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Pool de conexiones MySQL
let pool;
try {
  pool = mysql.createPool(dbConfig);
  console.log('✅ Pool de conexiones MySQL creado');
} catch (error) {
  console.error('❌ Error creando pool de MySQL:', error);
  process.exit(1);
}

// ===== MIDDLEWARE =====

// Seguridad básica
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de requests por IP
  message: { error: 'Demasiadas solicitudes, intenta más tarde' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuración
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3000', 'https://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS bloqueado para origen: ${origin}`);
      callback(new Error('No permitido por la política CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

app.use(bodyParser.json());

// Middleware de debug para desarrollo
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`🌐 ${req.method} ${req.path} - Origin: ${req.get('Origin') || 'No origin'}`);
    next();
  });
}

// Store de sesiones en MySQL
let sessionStore;
try {
  sessionStore = new MySQLStore(dbConfig);
  console.log('✅ Store de sesiones configurado');
} catch (error) {
  console.error('❌ Error configurando store de sesiones:', error);
}

// Configuración de sesiones
app.use(session({
  key: 'secure_access_session',
  secret: process.env.SESSION_SECRET || 'cambiar-en-produccion',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Cambiar a true en producción con HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: 'lax'
  }
}));

// ===== FUNCIONES AUXILIARES =====

const generateDeviceHash = (fingerprint, userInfo) => {
  const combined = `${fingerprint}-${userInfo.username}-${userInfo.deviceInfo?.platform || 'unknown'}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
};

const logAuthAttempt = async (username, deviceFingerprint, location, authMethod, authStep, success, errorMessage = null, req) => {
  try {
    if (!pool) return;
    
    await pool.execute(`
      INSERT INTO auth_logs (username, device_fingerprint, location_info, auth_method, auth_step, success, error_message, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      username || 'unknown',
      deviceFingerprint || null,
      location ? JSON.stringify(location) : null,
      authMethod || 'mysql',
      authStep,
      success,
      errorMessage,
      req.ip || req.connection?.remoteAddress || 'unknown',
      req.get('User-Agent') || 'unknown'
    ]);
  } catch (error) {
    console.error('❌ Error logging auth attempt:', error.message);
    // No lanzar error para no interrumpir el flujo principal
  }
};

const getSystemConfig = async (key) => {
  try {
    if (!pool) {
      // Valores por defecto si no hay conexión
      const defaults = {
        'auth_method': 'mysql',
        'max_devices_per_user': '3',
        'auto_authorize_devices': 'true',
        'device_inactivity_days': '90'
      };
      return defaults[key] || null;
    }

    const [rows] = await pool.execute(
      'SELECT config_value FROM system_config WHERE config_key = ?',
      [key]
    );
    const value = rows.length > 0 ? rows[0].config_value : null;
    return value;
  } catch (error) {
    console.error(`❌ Error getting system config ${key}:`, error.message);
    
    // Valores por defecto en caso de error
    const defaults = {
      'auth_method': 'mysql',
      'max_devices_per_user': '3',
      'auto_authorize_devices': 'true',
      'device_inactivity_days': '90'
    };
    
    return defaults[key] || null;
  }
};

// Middleware para verificar autenticación
const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(401).json({ error: 'No autenticado' });
  }
};

// ===== ENDPOINTS =====

// Health check
app.get('/api/health', async (req, res) => {
  try {
    if (pool) {
      const connection = await pool.getConnection();
      connection.release();
    }
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: pool ? 'Connected' : 'Disconnected',
      cors: corsOrigins,
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint de login simple (compatible con tu versión original)
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  console.log('🔐 Login simple:', { username, hasPassword: !!password });
  
  try {
    if (!username || !password) {
      return res.json({ success: false, error: 'Faltan credenciales' });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
      [username]
    );
    
    if (rows.length > 0) {
      const user = rows[0];
      let isValidPassword = false;
      
      try {
        if (user.password.startsWith('$2b$')) {
          isValidPassword = await bcrypt.compare(password, user.password);
        } else {
          isValidPassword = password === user.password;
        }
      } catch (error) {
        console.error('Error verificando contraseña:', error);
        isValidPassword = password === user.password;
      }
      
      if (isValidPassword) {
        console.log('✅ Login simple exitoso');
        res.json({ success: true });
      } else {
        console.log('❌ Contraseña incorrecta');
        res.json({ success: false });
      }
    } else {
      console.log('❌ Usuario no encontrado');
      res.json({ success: false });
    }
  } catch (error) {
    console.error('❌ Error en login simple:', error);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// Login avanzado con verificación de dispositivo
app.post('/api/auth/login', async (req, res) => {
  const { username, password, deviceFingerprint, location, deviceInfo } = req.body;
  
  console.log('🔐 Login avanzado:', { username, hasPassword: !!password, hasDevice: !!deviceFingerprint });
  
  try {
    // Validar datos básicos
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    // 1. Log de ubicación si se proporciona
    if (location) {
      console.log('📍 Ubicación:', { lat: location.lat, lng: location.lng });
      await logAuthAttempt(username, deviceFingerprint, location, 'mysql', 'location', true, null, req);
    }

    // 2. Verificar dispositivo si se proporciona
    if (deviceFingerprint) {
      console.log('📱 Verificando dispositivo...');
      
      try {
        const deviceHash = generateDeviceHash(deviceFingerprint, { username, deviceInfo });
        
        const [deviceRows] = await pool.execute(
          'SELECT * FROM authorized_devices WHERE (fingerprint = ? OR device_hash = ?) AND username = ? AND is_active = TRUE',
          [deviceFingerprint, deviceHash, username]
        );

        if (deviceRows.length === 0) {
          console.log('🔍 Dispositivo no encontrado, verificando auto-autorización...');
          
          const maxDevices = parseInt(await getSystemConfig('max_devices_per_user')) || 3;
          const autoAuthorize = (await getSystemConfig('auto_authorize_devices')) === 'true';
          
          const [userDeviceCount] = await pool.execute(
            'SELECT COUNT(*) as count FROM authorized_devices WHERE username = ? AND is_active = TRUE',
            [username]
          );

          if (autoAuthorize && userDeviceCount[0].count < maxDevices) {
            console.log('✅ Auto-autorizando dispositivo...');
            const deviceId = crypto.randomUUID();
            
            await pool.execute(`
              INSERT INTO authorized_devices 
              (id, fingerprint, device_hash, username, device_info, location_info, auto_authorized, created_at, last_seen, is_active)
              VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW(), NOW(), TRUE)
            `, [
              deviceId,
              deviceFingerprint,
              deviceHash,
              username,
              JSON.stringify(deviceInfo || {}),
              JSON.stringify(location || {})
            ]);
            
            console.log(`✅ Dispositivo auto-autorizado: ${deviceId}`);
          } else {
            console.log('❌ Dispositivo no autorizado');
            await logAuthAttempt(username, deviceFingerprint, location, 'mysql', 'device', false, 'Dispositivo no autorizado', req);
            return res.status(403).json({ 
              error: 'Dispositivo no autorizado',
              requiresManualApproval: true,
              deviceFingerprint 
            });
          }
        } else {
          console.log('✅ Dispositivo autorizado encontrado');
          await pool.execute(
            'UPDATE authorized_devices SET last_seen = NOW(), device_info = ?, location_info = ? WHERE id = ?',
            [JSON.stringify(deviceInfo || {}), JSON.stringify(location || {}), deviceRows[0].id]
          );
        }
      } catch (deviceError) {
        console.error('❌ Error verificando dispositivo:', deviceError);
        // Continuar sin bloquear por error de dispositivo
      }
    }

    // 3. Verificar credenciales de usuario
    console.log('🔑 Verificando credenciales...');
    
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
      [username]
    );
    
    if (rows.length === 0) {
      console.log('❌ Usuario no encontrado');
      await logAuthAttempt(username, deviceFingerprint, location, 'mysql', 'credentials', false, 'Usuario no encontrado', req);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const dbUser = rows[0];
    let isValidPassword = false;
    
    try {
      if (dbUser.password.startsWith('$2b$')) {
        console.log('🔐 Verificando con bcrypt...');
        isValidPassword = await bcrypt.compare(password, dbUser.password);
      } else {
        console.log('📝 Verificando texto plano...');
        isValidPassword = password === dbUser.password;
      }
    } catch (bcryptError) {
      console.error('❌ Error en bcrypt:', bcryptError);
      isValidPassword = password === dbUser.password;
    }
    
    if (!isValidPassword) {
      console.log('❌ Contraseña incorrecta');
      await logAuthAttempt(username, deviceFingerprint, location, 'mysql', 'credentials', false, 'Contraseña incorrecta', req);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 4. Crear sesión
    console.log('✅ Creando sesión...');
    const user = {
      username: dbUser.username,
      email: dbUser.email,
      displayName: dbUser.full_name,
      source: 'mysql'
    };

    req.session.user = user;
    req.session.deviceFingerprint = deviceFingerprint;
    
    // Guardar sesión explícitamente
    req.session.save((err) => {
      if (err) {
        console.error('❌ Error guardando sesión:', err);
      } else {
        console.log('✅ Sesión guardada');
      }
    });
    
    await logAuthAttempt(username, deviceFingerprint, location, 'mysql', 'credentials', true, null, req);

    console.log('🎉 Login exitoso para:', username);
    res.json({
      success: true,
      user: user,
      message: 'Login exitoso'
    });

  } catch (error) {
    console.error('💥 Error en login avanzado:', error);
    await logAuthAttempt(username || 'unknown', deviceFingerprint, location, 'mysql', 'credentials', false, error.message, req).catch(() => {});
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Verificar dispositivo
app.post('/api/auth/verify-device', async (req, res) => {
  const { deviceFingerprint, deviceInfo } = req.body;
  
  try {
    if (!deviceFingerprint) {
      return res.status(400).json({ error: 'Fingerprint de dispositivo requerido' });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM authorized_devices WHERE fingerprint = ? AND is_active = TRUE',
      [deviceFingerprint]
    );

    if (rows.length > 0) {
      await pool.execute(
        'UPDATE authorized_devices SET last_seen = NOW(), device_info = ? WHERE fingerprint = ?',
        [JSON.stringify(deviceInfo || {}), deviceFingerprint]
      );

      res.json({
        authorized: true,
        deviceId: rows[0].id,
        message: 'Dispositivo autorizado'
      });
    } else {
      res.json({
        authorized: false,
        requiresManualApproval: true,
        message: 'Dispositivo requiere autorización'
      });
    }
  } catch (error) {
    console.error('❌ Error verificando dispositivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Verificar sesión
app.get('/api/auth/check-session', (req, res) => {
  if (req.session && req.session.user) {
    res.json({
      authenticated: true,
      user: req.session.user
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Error cerrando sesión:', err);
      return res.status(500).json({ error: 'Error cerrando sesión' });
    }
    res.json({ success: true, message: 'Sesión cerrada exitosamente' });
  });
});

// ===== INICIALIZACIÓN =====

const startServer = async () => {
  console.log('🚀 Iniciando servidor...');
  
  try {
    // Verificar conexión a la base de datos
    if (pool) {
      console.log('🔌 Verificando conexión a la base de datos...');
      const connection = await pool.getConnection();
      console.log('✅ Conexión a MySQL exitosa');
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    console.error('⚠️ El servidor iniciará pero sin funcionalidad de base de datos');
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🗄️ Base de datos: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);
    console.log(`🌐 CORS habilitado para: ${corsOrigins.join(', ')}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔧 Modo desarrollo activado`);
    }
  });
};

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Cerrar conexiones al terminar
process.on('SIGINT', async () => {
  console.log('\n👋 Cerrando servidor...');
  try {
    if (pool) {
      await pool.end();
      console.log('✅ Conexiones de BD cerradas');
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cerrando conexiones:', error);
    process.exit(1);
  }
});

startServer().catch(console.error);

module.exports = app;