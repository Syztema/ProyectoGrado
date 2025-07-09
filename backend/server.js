// server.js
const express = require("express");
const mysql = require("mysql2/promise");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const { exec } = require("child_process");
const { spawn } = require("child_process"); // Añade esto al inicio del archivo
const path = require("path");
require("dotenv").config();

// Importar bcrypt con manejo de errores
let bcrypt;
try {
  bcrypt = require("bcrypt");
} catch (error) {
  console.warn("⚠️ bcrypt no disponible, usando contraseñas en texto plano");
  // Fallback simple para bcrypt
  bcrypt = {
    hash: async (password) => password,
    compare: async (password, hash) => password === hash,
  };
}

const app = express();
const PORT = process.env.PORT || 3001;

// ===== CONFIGURACIÓN =====

// Configuración de base de datos MySQL
const dbConfig = {
  host: process.env.DB_HOST || "DEFAULT",
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "DEFAULT",
  password: process.env.DB_PASSWORD || "DEFAULT",
  database: process.env.DB_NAME || "DEFAULT",
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
};

// Pool de conexiones MySQL
let pool;
try {
  pool = mysql.createPool(dbConfig);
  console.log("✅ Pool de conexiones MySQL creado");
} catch (error) {
  console.error("❌ Error creando pool de MySQL:", error);
  process.exit(1);
}

// ===== MIDDLEWARE =====
const authMiddleware = (req, res, next) => {
  // Verifica si el usuario está autenticado
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "No autenticado" });
  }
  req.userId = req.session.userId;
  next();
};

// Seguridad básica
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de requests por IP
  message: { error: "Demasiadas solicitudes, intenta más tarde" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// CORS configuración
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:3000", "https://localhost:3000"];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sin origin (mobile apps, etc.)
      if (!origin) return callback(null, true);

      if (corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`❌ CORS bloqueado para origen: ${origin}`);
        callback(new Error("No permitido por la política CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "X-Requested-With",
    ],
    optionsSuccessStatus: 200,
  })
);

app.use(bodyParser.json());

// Middleware de debug para desarrollo
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(
      `🌐 ${req.method} ${req.path} - Origin: ${
        req.get("Origin") || "No origin"
      }`
    );
    next();
  });
}

// Store de sesiones en MySQL
let sessionStore;
try {
  sessionStore = new MySQLStore(dbConfig);
  console.log("✅ Store de sesiones configurado");
} catch (error) {
  console.error("❌ Error configurando store de sesiones:", error);
}

// Configuración de sesiones
app.use(
  session({
    key: "secure_access_session",
    secret: process.env.SESSION_SECRET || "cambiar-en-produccion",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Cambiar a true en producción con HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      sameSite: "lax",
    },
  })
);

// ===== FUNCIONES AUXILIARES =====

const generateDeviceHash = (fingerprint, userInfo) => {
  const combined = `${fingerprint}-${userInfo.username}-${
    userInfo.deviceInfo?.platform || "unknown"
  }`;
  return crypto.createHash("sha256").update(combined).digest("hex");
};

const logAuthAttempt = async (
  username,
  deviceFingerprint,
  location,
  authMethod,
  authStep,
  success,
  errorMessage = null,
  req
) => {
  try {
    if (!pool) return;

    await pool.execute(
      `
      INSERT INTO auth_logs (username, device_fingerprint, location_info, auth_method, auth_step, success, error_message, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        username || "unknown",
        deviceFingerprint || null,
        location ? JSON.stringify(location) : null,
        authMethod || "mysql",
        authStep,
        success,
        errorMessage,
        req.ip || req.connection?.remoteAddress || "unknown",
        req.get("User-Agent") || "unknown",
      ]
    );
  } catch (error) {
    console.error("❌ Error logging auth attempt:", error.message);
    // No lanzar error para no interrumpir el flujo principal
  }
};

const getSystemConfig = async (key) => {
  try {
    if (!pool) {
      // Valores por defecto si no hay conexión
      const defaults = {
        auth_method: "mysql",
        max_devices_per_user: "3",
        auto_authorize_devices: "true",
        device_inactivity_days: "90",
      };
      return defaults[key] || null;
    }

    const [rows] = await pool.execute(
      "SELECT config_value FROM system_config WHERE config_key = ?",
      [key]
    );
    const value = rows.length > 0 ? rows[0].config_value : null;
    return value;
  } catch (error) {
    console.error(`❌ Error getting system config ${key}:`, error.message);

    // Valores por defecto en caso de error
    const defaults = {
      auth_method: "mysql",
      max_devices_per_user: "3",
      auto_authorize_devices: "true",
      device_inactivity_days: "90",
    };

    return defaults[key] || null;
  }
};

const scriptPath = path.join(__dirname, "./scripts/passwordValidator.py");
// Función para verificar contraseña Moodle
function validatePasswordWithPython(password, storedHash, callback) {
  const scriptPath = path.join(__dirname, "./scripts/passwordValidator.py");

  try {
    const input = JSON.stringify({
      password: password,
      stored_hash: storedHash, // Nota: cambié a stored_hash para coincidir con Python
    });

    const pythonProcess = spawn("python", [scriptPath]);

    let stdoutData = "";
    let stderrData = "";

    pythonProcess.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(
          `Python script exited with code ${code}. Error: ${stderrData}`
        );
        return callback(false);
      }

      console.log(`Python script output: ${stdoutData.trim()}`);
      callback(stdoutData.trim() === "OK");
    });

    pythonProcess.stdin.write(input);
    pythonProcess.stdin.end();
  } catch (err) {
    console.error("Error spawning Python process:", err);
    callback(false);
  }
}

// Función para verificar si un punto está dentro de un polígono
function isPointInPolygon(point, polygon) {
  const x = point[0];
  const y = point[1];
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

// Middleware para verificar autenticación
const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(401).json({ error: "No autenticado" });
  }
};

// ===== ENDPOINTS =====

// Health check
app.get("/api/health", async (req, res) => {
  try {
    if (pool) {
      const connection = await pool.getConnection();
      connection.release();
    }

    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      database: pool ? "Connected" : "Disconnected",
      cors: corsOrigins,
      version: "1.0.0",
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Endpoint de login simple (compatible con tu versión original)
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  console.log("🔐 Login con Python validator:", {
    username,
    hasPassword: !!password,
  });

  try {
    if (!username || !password) {
      return res.json({ success: false, error: "Faltan credenciales" });
    }

    const [rows] = await pool.execute(
      "SELECT * FROM mdl_user WHERE username = ? AND lastlogin >= UNIX_TIMESTAMP() - ?",
      [username, 90 * 24 * 60 * 60]
    );

    if (rows.length > 0) {
      const user = rows[0];

      console.log("Usuario encontrado:", {
        id: user.id,
        username: user.username,
        passwordHash: user.password
          ? user.password.substring(0, 20) + "..."
          : null,
      });

      validatePasswordWithPython(password, user.password, async (isValid) => {
        if (isValid) {
          console.log("✅ Contraseña válida con Python");
          // Generar token de autenticación si quieres mantener esa lógica
          const authToken = crypto.randomBytes(32).toString("hex");

          // Guardar el token en la base de datos (opcional, según tu lógica)
          await pool.execute(
            "UPDATE mdl_user SET auth_token = ? WHERE id = ?",
            [authToken, user.id]
          );

          /* ESTA PARTE IRIA PARA EL BOTON
          const redirectUrl = new URL(
            "https://moodleud.zieete.com.co/login/index.php"
          );
          redirectUrl.searchParams.append("auth_token", authToken);
          redirectUrl.searchParams.append("username", username.trim());
          redirectUrl.searchParams.append("redirect", "/my/");*/

          return res.json({ success: true });
        }
        console.log("❌ Contraseña incorrecta según Python");
        res.json({ success: false });
      });
    } else {
      console.log("❌ Usuario no encontrado");
      res.json({ success: false });
    }
  } catch (error) {
    console.error("❌ Error en login simple:", error);
    res.status(500).json({ success: false, error: "Error del servidor" });
  }
});

// Login avanzado con verificación de dispositivo
app.post("/api/auth/login", async (req, res) => {
  const {
    username,
    password,
    deviceFingerprint,
    location,
    deviceInfo,
    auth_token,
  } = req.body;

  console.log("🔐 Login avanzado:", {
    username,
    hasPassword: !!password,
    hasDevice: !!deviceFingerprint,
  });

  try {
    // Validar datos básicos
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Usuario y contraseña son requeridos" });
    }

    // 1. Log de ubicación si se proporciona
    if (location) {
      console.log("📍 Ubicación:", { lat: location.lat, lng: location.lng });
      await logAuthAttempt(
        username,
        deviceFingerprint,
        location,
        "mysql",
        "location",
        true,
        null,
        req
      );
    }

    // 2. Verificar dispositivo si se proporciona
    if (deviceFingerprint) {
      console.log("📱 Verificando dispositivo...");

      try {
        const deviceHash = generateDeviceHash(deviceFingerprint, {
          username,
          deviceInfo,
        });

        const [deviceRows] = await pool.execute(
          "SELECT * FROM authorized_devices WHERE (fingerprint = ? OR device_hash = ?) AND username = ? AND is_active = TRUE",
          [deviceFingerprint, deviceHash, username]
        );

        if (deviceRows.length === 0) {
          console.log(
            "🔍 Dispositivo no encontrado, verificando auto-autorización..."
          );

          const maxDevices =
            parseInt(await getSystemConfig("max_devices_per_user")) || 3;
          const autoAuthorize =
            (await getSystemConfig("auto_authorize_devices")) === "true";

          const [userDeviceCount] = await pool.execute(
            "SELECT COUNT(*) as count FROM authorized_devices WHERE username = ? AND is_active = TRUE",
            [username]
          );

          if (autoAuthorize && userDeviceCount[0].count < maxDevices) {
            console.log("✅ Auto-autorizando dispositivo...");
            const deviceId = crypto.randomUUID();

            await pool.execute(
              `
              INSERT INTO authorized_devices 
              (id, fingerprint, device_hash, username, device_info, location_info, auto_authorized, created_at, last_seen, is_active)
              VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW(), NOW(), TRUE)
            `,
              [
                deviceId,
                deviceFingerprint,
                deviceHash,
                username,
                JSON.stringify(deviceInfo || {}),
                JSON.stringify(location || {}),
              ]
            );

            console.log(`✅ Dispositivo auto-autorizado: ${deviceId}`);
          } else {
            console.log("❌ Dispositivo no autorizado");
            await logAuthAttempt(
              username,
              deviceFingerprint,
              location,
              "mysql",
              "device",
              false,
              "Dispositivo no autorizado",
              req
            );
            return res.status(403).json({
              error: "Dispositivo no autorizado",
              requiresManualApproval: true,
              deviceFingerprint,
            });
          }
        } else {
          console.log("✅ Dispositivo autorizado encontrado");
          await pool.execute(
            "UPDATE authorized_devices SET last_seen = NOW(), device_info = ?, location_info = ? WHERE id = ?",
            [
              JSON.stringify(deviceInfo || {}),
              JSON.stringify(location || {}),
              deviceRows[0].id,
            ]
          );
        }
      } catch (deviceError) {
        console.error("❌ Error verificando dispositivo:", deviceError);
        // Continuar sin bloquear por error de dispositivo
      }
    }

    // 3. Verificar credenciales de usuario
    console.log("🔑 Verificando credenciales...");

    const [rows] = await pool.execute(
      "SELECT * FROM mdl_user WHERE username = ? AND lastlogin >= UNIX_TIMESTAMP() - ?",
      [username, 90 * 24 * 60 * 60]
    );

    if (rows.length === 0) {
      console.log("❌ Usuario no encontrado");
      await logAuthAttempt(
        username,
        deviceFingerprint,
        location,
        "mysql",
        "credentials",
        false,
        "Usuario no encontrado",
        req
      );
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const dbUser = rows[0];
    const isValid = await new Promise((resolve) => {
      validatePasswordWithPython(password, dbUser.password, (result) => {
        resolve(result);
      });
    });

    if (!isValid) {
      console.log("❌ Contraseña incorrecta");
      await logAuthAttempt(
        username,
        deviceFingerprint,
        location,
        "mysql",
        "credentials",
        false,
        "Contraseña incorrecta",
        req
      );
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    console.log("✅ Contraseña válida con Python");

    // Obtener roles del usuario
    const [roles] = await pool.execute(
      `
      SELECT r.id as roleid, r.shortname 
      FROM mdl_role_assignments ra
      JOIN mdl_role r ON ra.roleid = r.id
      WHERE ra.userid = ?
    `,
      [dbUser.id]
    );

    // Determinar si es profesor/estudiante
    const isTeacherOrStudent = roles.some((r) => [4, 5].includes(r.roleid));
    const redirectTo = isTeacherOrStudent ? "moodle" : "home";
    console.log(`🎯 Roles del usuario: ${JSON.stringify(roles)}`);
    console.log(`🎯 Redirección: ${redirectTo}`); // Nuevo log

    // ✅ Generar nuevo token
    const authToken = crypto.randomBytes(32).toString("hex");
    await pool.execute("UPDATE mdl_user SET auth_token = ? WHERE id = ?", [
      authToken,
      dbUser.id,
    ]);

    // 4. Crear sesión
    console.log("✅ Creando sesión...");
    console.log("Con un Token: " + authToken);
    const full_name = dbUser.firstname + " " + dbUser.lastname;
    const user = {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      displayName: full_name,
      source: "mysql",
      auth_token: authToken,
      roles: roles,
      isTeacherOrStudent,
    };

    req.session.user = user;
    req.session.deviceFingerprint = deviceFingerprint;

    // Guardar sesión explícitamente
    req.session.save((err) => {
      if (err) {
        console.error("❌ Error guardando sesión:", err);
      } else {
        console.log("✅ Sesión guardada");
      }
    });

    await logAuthAttempt(
      username,
      deviceFingerprint,
      location,
      "mysql",
      "credentials",
      true,
      null,
      req
    );

    console.log("🎉 Login exitoso para:", username);
    res.json({
      success: true,
      user: user,
      redirectTo,
      message: "Login exitoso",
    });
  } catch (error) {
    console.error("💥 Error en login avanzado:", error);
    await logAuthAttempt(
      username || "unknown",
      deviceFingerprint,
      location,
      "mysql",
      "credentials",
      false,
      error.message,
      req
    ).catch(() => {});
    res.status(500).json({
      error: "Error interno del servidor",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Verificar dispositivo
app.post("/api/auth/verify-device", async (req, res) => {
  const { deviceFingerprint, deviceInfo } = req.body;

  try {
    if (!deviceFingerprint) {
      return res
        .status(400)
        .json({ error: "Fingerprint de dispositivo requerido" });
    }

    const [rows] = await pool.execute(
      "SELECT * FROM authorized_devices WHERE fingerprint = ? AND is_active = TRUE",
      [deviceFingerprint]
    );

    if (rows.length > 0) {
      await pool.execute(
        "UPDATE authorized_devices SET last_seen = NOW(), device_info = ? WHERE fingerprint = ?",
        [JSON.stringify(deviceInfo || {}), deviceFingerprint]
      );

      res.json({
        authorized: true,
        deviceId: rows[0].id,
        message: "Dispositivo autorizado",
      });
    } else {
      res.json({
        authorized: false,
        requiresManualApproval: true,
        message: "Dispositivo requiere autorización",
      });
    }
  } catch (error) {
    console.error("❌ Error verificando dispositivo:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Verificar sesión
app.get("/api/auth/check-session", (req, res) => {
  if (req.session && req.session.user) {
    res.json({
      authenticated: true,
      user: req.session.user,
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("❌ Error cerrando sesión:", err);
      return res.status(500).json({ error: "Error cerrando sesión" });
    }
    res.json({ success: true, message: "Sesión cerrada exitosamente" });
  });
});

// ===== ADMIN API ROUTES =====
// Agregar estas rutas DESPUÉS de las rutas de auth existentes en server.js

// Middleware para verificar si el usuario es admin
const requireAdmin = async (req, res, next) => {
  try {
    // Verificar si el usuario tiene permisos de admin
    const [rows] = await pool.execute(
      "SELECT * FROM mdl_user WHERE username = ? AND lastlogin >= UNIX_TIMESTAMP() - ?",
      ["cstrianal", 90 * 24 * 60 * 60]
    );

    if (rows.length === 0) {
      return res.status(403).json({ error: "Usuario no encontrado" });
    }

    const user = rows[0];
    // Por ahora, cualquier usuario autenticado puede acceder a admin
    req.adminUser = user;
    next();
  } catch (error) {
    console.error("❌ Error verificando admin:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ===== ESTADÍSTICAS =====
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    console.log("📊 Solicitando estadísticas...");

    // Estadísticas de usuarios
    const [userStats] = await pool.execute(`
      SELECT 
        COUNT(*) AS total_users,
        COUNT(CASE WHEN lastlogin >= (UNIX_TIMESTAMP() - 90 * 24 * 60 * 60) THEN 1 END) AS active_users,
        COUNT(CASE WHEN lastlogin < (UNIX_TIMESTAMP() - 90 * 24 * 60 * 60) OR lastlogin IS NULL THEN 1 END) AS inactive_users
      FROM mdl_user
    `);

    // Estadísticas de dispositivos
    const [deviceStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_devices,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_devices,
        COUNT(CASE WHEN auto_authorized = TRUE AND is_active = TRUE THEN 1 END) as auto_authorized,
        COUNT(CASE WHEN manually_authorized = TRUE AND is_active = TRUE THEN 1 END) as manual_authorized,
        COUNT(DISTINCT username) as unique_users_with_devices
      FROM authorized_devices
    `);

    // Logins recientes
    const [recentLogins] = await pool.execute(`
      SELECT COUNT(*) as recent_logins
      FROM auth_logs 
      WHERE success = TRUE 
      AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    // Calcular promedio de dispositivos por usuario
    const avgDevices =
      deviceStats[0].unique_users_with_devices > 0
        ? (
            deviceStats[0].active_devices /
            deviceStats[0].unique_users_with_devices
          ).toFixed(1)
        : 0;

    const stats = {
      totalUsers: userStats[0].total_users,
      activeUsers: userStats[0].active_users,
      inactiveUsers: userStats[0].inactive_users,
      totalDevices: deviceStats[0].total_devices,
      activeDevices: deviceStats[0].active_devices,
      autoAuthorized: deviceStats[0].auto_authorized,
      manualAuthorized: deviceStats[0].manual_authorized,
      uniqueUsersWithDevices: deviceStats[0].unique_users_with_devices,
      recentLogins: recentLogins[0].recent_logins,
      avgDevices: parseFloat(avgDevices),
    };

    console.log("✅ Estadísticas enviadas:", stats);
    res.json(stats);
  } catch (error) {
    console.error("❌ Error obteniendo estadísticas:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ===== GESTIÓN DE USUARIOS =====
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    console.log("👥 Solicitando usuarios...");

    const [rows] = await pool.execute(`
      SELECT 
        u.id, u.username, u.email, u.firstname, u.lastname, u.lastlogin, u.timecreated, u.suspended,
        COUNT(ad.id) as device_count
      FROM mdl_user u
      LEFT JOIN authorized_devices ad ON u.username = ad.username AND ad.is_active = TRUE
      GROUP BY u.id, u.username, u.email, u.firstname, u.lastname, u.lastlogin, u.timecreated
      ORDER BY u.timecreated DESC
    `);

    console.log(`✅ ${rows.length} usuarios encontrados`);
    res.json(rows);
  } catch (error) {
    console.error("❌ Error listando usuarios:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ===== GESTIÓN DE DISPOSITIVOS =====
app.get("/api/admin/devices", requireAdmin, async (req, res) => {
  try {
    console.log("📱 Solicitando dispositivos...");

    const [rows] = await pool.execute(`
      SELECT 
        id, fingerprint, username, user_display_name, 
        device_info, created_at, last_seen, auto_authorized, 
        manually_authorized, is_active, authorized_by, admin_notes
      FROM authorized_devices 
      ORDER BY last_seen DESC
    `);

    // Parsear device_info JSON
    const devices = rows.map((device) => ({
      ...device,
      device_info: device.device_info ? JSON.parse(device.device_info) : {},
    }));

    console.log(`✅ ${devices.length} dispositivos encontrados`);
    res.json(devices);
  } catch (error) {
    console.error("❌ Error listando dispositivos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Crear usuario
app.post("/api/admin/users", requireAdmin, async (req, res) => {
  const { username, password, full_name, email } = req.body;

  try {
    console.log("➕ Creando usuario:", username);

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Usuario y contraseña son requeridos" });
    }

    // Verificar si el usuario ya existe
    const [existing] = await pool.execute(
      "SELECT id FROM mdl_user WHERE username = ?",
      [username]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: "El usuario ya existe" });
    }

    // Encriptar contraseña
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, 10);
    } catch (error) {
      console.warn("⚠️ Error con bcrypt, usando texto plano");
      hashedPassword = password;
    }

    // Crear usuario
    const [result] = await pool.execute(
      `
      INSERT INTO mdl_user (username, password, full_name, email, is_active, created_at)
      VALUES (?, ?, ?, ?, TRUE, NOW())
    `,
      [username, hashedPassword, full_name, email || username]
    );

    console.log("✅ Usuario creado con ID:", result.insertId);
    res.json({
      success: true,
      userId: result.insertId,
      message: "Usuario creado exitosamente",
    });
  } catch (error) {
    console.error("❌ Error creando usuario:", error);
    if (error.code === "ER_DUP_ENTRY") {
      res.status(409).json({ error: "El usuario ya existe" });
    } else {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
});

// Activar/Desactivar usuario
app.post("/api/admin/users/:userId/toggle", requireAdmin, async (req, res) => {
  const { userId } = req.params;

  try {
    console.log("🔄 Cambiando estado del usuario:", userId);

    // Obtener estado actual
    const [user] = await pool.execute(
      "SELECT id, username, is_active FROM users WHERE id = ?",
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const currentUser = user[0];
    const newStatus = !currentUser.is_active;

    // Actualizar estado
    await pool.execute("UPDATE users SET is_active = ? WHERE id = ?", [
      newStatus,
      userId,
    ]);

    // Si se desactiva el usuario, revocar sus dispositivos
    if (!newStatus) {
      await pool.execute(
        "UPDATE authorized_devices SET is_active = FALSE WHERE username = ?",
        [currentUser.username]
      );
    }

    console.log(
      `✅ Usuario ${currentUser.username} ${
        newStatus ? "activado" : "desactivado"
      }`
    );
    res.json({
      success: true,
      message: `Usuario ${newStatus ? "activado" : "desactivado"} exitosamente`,
    });
  } catch (error) {
    console.error("❌ Error actualizando usuario:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Autorizar dispositivo manualmente
app.post("/api/admin/devices/authorize", requireAdmin, async (req, res) => {
  const { fingerprint, username, admin_notes } = req.body;

  try {
    console.log("📱 Autorizando dispositivo para:", username);

    if (!fingerprint || !username) {
      return res
        .status(400)
        .json({ error: "Fingerprint y username son requeridos" });
    }

    // Verificar si ya existe
    const [existing] = await pool.execute(
      "SELECT id FROM authorized_devices WHERE fingerprint = ?",
      [fingerprint]
    );

    if (existing.length > 0) {
      return res
        .status(409)
        .json({ error: "Este dispositivo ya está autorizado" });
    }

    // Verificar que el usuario existe
    const [user] = await pool.execute(
      "SELECT username FROM users WHERE username = ? AND is_active = TRUE",
      [username]
    );

    if (user.length === 0) {
      return res
        .status(404)
        .json({ error: "Usuario no encontrado o inactivo" });
    }

    const deviceId = crypto.randomUUID();

    await pool.execute(
      `
      INSERT INTO authorized_devices 
      (id, fingerprint, username, authorized_by, admin_notes, manually_authorized, created_at, last_seen, is_active)
      VALUES (?, ?, ?, ?, ?, TRUE, NOW(), NOW(), TRUE)
    `,
      [deviceId, fingerprint, username, req.session.user.username, admin_notes]
    );

    console.log("✅ Dispositivo autorizado:", deviceId);
    res.json({
      success: true,
      deviceId,
      message: "Dispositivo autorizado exitosamente",
    });
  } catch (error) {
    console.error("❌ Error autorizando dispositivo:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Revocar dispositivo
app.post(
  "/api/admin/devices/:deviceId/revoke",
  requireAdmin,
  async (req, res) => {
    const { deviceId } = req.params;

    try {
      console.log("❌ Revocando dispositivo:", deviceId);

      // Verificar que el dispositivo existe
      const [device] = await pool.execute(
        "SELECT id, username FROM authorized_devices WHERE id = ?",
        [deviceId]
      );

      if (device.length === 0) {
        return res.status(404).json({ error: "Dispositivo no encontrado" });
      }

      // Revocar dispositivo
      await pool.execute(
        "UPDATE authorized_devices SET is_active = FALSE WHERE id = ?",
        [deviceId]
      );

      console.log("✅ Dispositivo revocado");
      res.json({
        success: true,
        message: "Dispositivo revocado exitosamente",
      });
    } catch (error) {
      console.error("❌ Error revocando dispositivo:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
);

// Limpiar dispositivos inactivos
app.post("/api/admin/devices/cleanup", requireAdmin, async (req, res) => {
  const { days = 90 } = req.body;

  try {
    console.log(`🧹 Limpiando dispositivos inactivos por ${days} días`);

    // Encontrar dispositivos inactivos
    const [inactiveDevices] = await pool.execute(
      `
      SELECT id, username, fingerprint, last_seen
      FROM authorized_devices 
      WHERE is_active = TRUE 
      AND (last_seen IS NULL OR last_seen < DATE_SUB(NOW(), INTERVAL ? DAY))
    `,
      [days]
    );

    if (inactiveDevices.length === 0) {
      return res.json({
        success: true,
        message: "No se encontraron dispositivos inactivos",
        devicesRevoked: 0,
      });
    }

    // Revocar dispositivos inactivos
    const deviceIds = inactiveDevices.map((d) => d.id);
    await pool.execute(
      `UPDATE authorized_devices SET is_active = FALSE WHERE id IN (${deviceIds
        .map(() => "?")
        .join(",")})`,
      deviceIds
    );

    console.log(`✅ ${inactiveDevices.length} dispositivos revocados`);
    res.json({
      success: true,
      message: `Se revocaron ${inactiveDevices.length} dispositivos inactivos`,
      devicesRevoked: inactiveDevices.length,
      devices: inactiveDevices,
    });
  } catch (error) {
    console.error("❌ Error limpiando dispositivos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ===== LOGS DE AUDITORÍA =====
app.get("/api/admin/logs", requireAdmin, async (req, res) => {
  const { page = 1, limit = 50, username, success } = req.query;
  const offset = (page - 1) * limit;

  try {
    console.log("📋 Solicitando logs, página:", page);

    let whereClause = "";
    const params = [];

    if (username) {
      whereClause += " WHERE username LIKE ?";
      params.push(`%${username}%`);
    }

    if (success !== undefined) {
      whereClause += (whereClause ? " AND" : " WHERE") + " success = ?";
      params.push(success === "true");
    }

    const [rows] = await pool.execute(
      `
      SELECT 
        id, username, device_fingerprint, location_info, auth_method, 
        auth_step, success, error_message, ip_address, user_agent, created_at
      FROM auth_logs 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `,
      [...params, parseInt(limit), offset]
    );

    // Contar total de registros
    const [countResult] = await pool.execute(
      `
      SELECT COUNT(*) as total FROM auth_logs ${whereClause}
    `,
      params
    );

    const totalPages = Math.ceil(countResult[0].total / limit);

    console.log(
      `✅ ${rows.length} logs encontrados, página ${page} de ${totalPages}`
    );
    res.json({
      logs: rows,
      total: countResult[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: totalPages,
    });
  } catch (error) {
    console.error("❌ Error obteniendo logs:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Endpoint para sincronizar sesión del frontend con el backend
app.post("/api/auth/sync-session", async (req, res) => {
  const { username, displayName, email } = req.body;

  try {
    console.log("🔄 Sincronizando sesión para:", username);

    if (!username) {
      return res.status(400).json({ error: "Username es requerido" });
    }

    // Verificar que el usuario existe en la base de datos
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE username = ? AND is_active = TRUE",
      [username]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const dbUser = rows[0];

    // Crear sesión en el backend
    const user = {
      username: dbUser.username,
      email: dbUser.email,
      displayName: dbUser.full_name,
      source: "sync",
    };

    req.session.user = user;

    // Guardar sesión explícitamente
    req.session.save((err) => {
      if (err) {
        console.error("❌ Error guardando sesión:", err);
        return res.status(500).json({ error: "Error guardando sesión" });
      }

      console.log("✅ Sesión sincronizada exitosamente");
      res.json({
        success: true,
        user: user,
        message: "Sesión sincronizada exitosamente",
      });
    });
  } catch (error) {
    console.error("❌ Error sincronizando sesión:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

console.log("✅ Rutas de administración configuradas");

// Obtener todas las configuraciones
app.get("/api/admin/config", requireAdmin, async (req, res) => {
  try {
    console.log("⚙️ Solicitando configuraciones del sistema...");

    const [rows] = await pool.execute(`
      SELECT config_key, config_value, description 
      FROM system_config 
      ORDER BY config_key
    `);

    // Convertir a objeto para fácil acceso
    const config = {};
    rows.forEach((row) => {
      config[row.config_key] = {
        value: row.config_value,
        description: row.description,
      };
    });

    console.log(`✅ ${rows.length} configuraciones encontradas`);
    res.json(config);
  } catch (error) {
    console.error("❌ Error obteniendo configuraciones:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Actualizar una configuración específica
app.post("/api/admin/config/:key", requireAdmin, async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  try {
    console.log(`⚙️ Actualizando configuración: ${key} = ${value}`);

    if (value === undefined || value === null) {
      return res.status(400).json({ error: "El valor es requerido" });
    }

    // Validaciones específicas por tipo de configuración
    const validations = {
      auth_method: (val) => ["mysql", "ad", "mixed"].includes(val),
      auto_authorize_devices: (val) => ["true", "false"].includes(val),
      maintenance_mode: (val) => ["true", "false"].includes(val),
      max_devices_per_user: (val) =>
        !isNaN(val) && parseInt(val) >= 1 && parseInt(val) <= 20,
      device_inactivity_days: (val) =>
        !isNaN(val) && parseInt(val) >= 1 && parseInt(val) <= 365,
      max_login_attempts: (val) =>
        !isNaN(val) && parseInt(val) >= 1 && parseInt(val) <= 20,
      session_timeout: (val) =>
        !isNaN(val) && parseInt(val) >= 60000 && parseInt(val) <= 86400000 * 7,
    };

    if (validations[key] && !validations[key](value)) {
      return res.status(400).json({
        error: `Valor inválido para ${key}. Verifica los límites permitidos.`,
      });
    }

    // Actualizar la configuración
    const [result] = await pool.execute(
      `
      UPDATE system_config 
      SET config_value = ?, updated_at = NOW() 
      WHERE config_key = ?
    `,
      [value, key]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }

    console.log(`✅ Configuración ${key} actualizada exitosamente`);
    res.json({
      success: true,
      message: `Configuración ${key} actualizada exitosamente`,
      key: key,
      value: value,
    });
  } catch (error) {
    console.error(`❌ Error actualizando configuración ${key}:`, error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Restablecer configuración a valores por defecto
app.post("/api/admin/config/reset", requireAdmin, async (req, res) => {
  try {
    console.log("🔄 Restableciendo configuraciones a valores por defecto...");

    const defaultConfigs = [
      ["auth_method", "mysql"],
      ["max_devices_per_user", "3"],
      ["auto_authorize_devices", "true"],
      ["device_inactivity_days", "90"],
      ["maintenance_mode", "false"],
      ["max_login_attempts", "5"],
      ["session_timeout", "86400000"],
    ];

    for (const [key, value] of defaultConfigs) {
      await pool.execute(
        `
        UPDATE system_config 
        SET config_value = ?, updated_at = NOW() 
        WHERE config_key = ?
      `,
        [value, key]
      );
    }

    console.log("✅ Configuraciones restablecidas");
    res.json({
      success: true,
      message: "Configuraciones restablecidas a valores por defecto",
    });
  } catch (error) {
    console.error("❌ Error restableciendo configuraciones:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Obtener configuración específica
app.get("/api/admin/config/:key", requireAdmin, async (req, res) => {
  const { key } = req.params;

  try {
    const [rows] = await pool.execute(
      "SELECT config_key, config_value, description FROM system_config WHERE config_key = ?",
      [key]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(`❌ Error obteniendo configuración ${key}:`, error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

console.log("✅ Rutas de configuración del sistema agregadas");

// ===== GEOCERCAS API =====

// Crear una nueva geocerca
app.post("/api/geofences", async (req, res) => {
  try {
    const { name, coordinates, created_by } = req.body;

    // Usar el ID enviado desde el cliente, o usar un ID por defecto si no se envía
    const userId = created_by || req.session?.user?.id || 2;

    console.log("📍 Creando geocerca:", { name, userId });

    // Validación básica
    if (!name || !coordinates || !Array.isArray(coordinates)) {
      return res.status(400).json({ error: "Datos de geocerca inválidos" });
    }

    // Insertar la geocerca en la base de datos
    const [result] = await pool.execute(
      "INSERT INTO geofences (name, coordinates, created_by) VALUES (?, ?, ?)",
      [name, JSON.stringify(coordinates), userId]
    );

    console.log(
      "✅ Geocerca creada con ID:",
      result.insertId,
      "por usuario ID:",
      userId
    );

    res.status(201).json({
      id: result.insertId,
      name,
      coordinates,
      created_by: userId,
      created_at: new Date(),
    });
  } catch (error) {
    console.error("❌ Error al crear geocerca:", error);
    res.status(500).json({ error: "Error al crear la geocerca" });
  }
});

// Obtener todas las geocercas
app.get("/api/geofences", async (req, res) => {
  try {
    console.log("📍 Obteniendo geocercas");

    const [rows] = await pool.execute(`
      SELECT 
        g.id, g.name, g.coordinates, g.created_at, 
        u.username as created_by_username,
        u.firstname, u.lastname
      FROM geofences g
      JOIN mdl_user u ON g.created_by = u.id
      ORDER BY g.created_at DESC
    `);

    // Parsear las coordenadas JSON
    const geofences = rows.map((row) => ({
      ...row,
      coordinates: JSON.parse(row.coordinates),
      created_by_name: `${row.firstname || ""} ${row.lastname || ""}`.trim(),
    }));

    console.log(`✅ ${geofences.length} geocercas encontradas`);

    res.json(geofences);
  } catch (error) {
    console.error("❌ Error al obtener geocercas:", error);
    res.status(500).json({ error: "Error al obtener las geocercas" });
  }
});

// Verificar si una ubicación está dentro de alguna geocerca
app.post("/api/geofences/check", async (req, res) => {
  try {
    const { lat, lng } = req.body;

    // Validación de coordenadas
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      isNaN(lat) ||
      isNaN(lng)
    ) {
      return res.status(400).json({
        success: false,
        error: "Coordenadas inválidas",
        isInside: false,
        geofences: [],
      });
    }

    console.log(`📍 Verificando ubicación: ${lat}, ${lng}`);

    // Obtener geocercas
    const [rows] = await pool.execute(
      "SELECT id, name, coordinates FROM geofences"
    );

    const matchingGeofences = [];
    for (const row of rows) {
      try {
        const coordinates = JSON.parse(row.coordinates);

        if (!Array.isArray(coordinates)) {
          console.error(
            "Formato de coordenadas inválido para geocerca:",
            row.id
          );
          continue;
        }

        // Verificar punto en polígono
        if (isPointInPolygon([lng, lat], coordinates)) {
          matchingGeofences.push({
            id: row.id,
            name: row.name,
          });
        }
      } catch (error) {
        console.error(`Error procesando geocerca ${row.id}:`, error);
        continue;
      }
    }

    console.log(
      `✅ Ubicación verificada. Dentro de ${matchingGeofences.length} geocercas`
    );

    res.json({
      success: true,
      isInside: matchingGeofences.length > 0,
      geofences: matchingGeofences,
      coordinatesChecked: { lat, lng },
    });
  } catch (error) {
    console.error("❌ Error al verificar ubicación:", error);
    res.status(500).json({
      success: false,
      error: "Error interno al verificar ubicación",
      isInside: false,
      geofences: [],
    });
  }
});

// Eliminar una geocerca
app.delete("/api/geofences/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`📍 Eliminando geocerca con ID: ${id}`);

    // Verificar si la geocerca existe
    const [rows] = await pool.execute("SELECT * FROM geofences WHERE id = ?", [
      id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Geocerca no encontrada" });
    }

    // Eliminar la geocerca
    await pool.execute("DELETE FROM geofences WHERE id = ?", [id]);

    console.log(`✅ Geocerca eliminada: ${id}`);

    res.json({ success: true, message: "Geocerca eliminada correctamente" });
  } catch (error) {
    console.error(`❌ Error al eliminar geocerca ${req.params.id}:`, error);
    res.status(500).json({ error: "Error al eliminar la geocerca" });
  }
});

console.log("✅ API de Geocercas configurada");

//APIS DE ROLES
app.get("/api/users/:userId/roles", async (req, res) => {
  try {
    const { userId } = req.params;

    const [roles] = await pool.execute(
      `
      SELECT r.id as roleid, r.shortname 
      FROM mdl_role_assignments ra
      JOIN mdl_role r ON ra.roleid = r.id
      WHERE ra.userid = ?
    `,
      [userId]
    );

    res.json(roles);
  } catch (error) {
    console.error("Error obteniendo roles:", error);
    res.status(500).json({ error: "Error al obtener roles" });
  }
});
console.log("✅ API de Roles configurada");

// ===== INICIALIZACIÓN =====

const startServer = async () => {
  console.log("🚀 Iniciando servidor...");

  try {
    // Verificar conexión a la base de datos
    if (pool) {
      console.log("🔌 Verificando conexión a la base de datos...");
      const connection = await pool.getConnection();
      console.log("✅ Conexión a MySQL exitosa");
      connection.release();
    }
  } catch (error) {
    console.error("❌ Error conectando a la base de datos:", error);
    console.error(
      "⚠️ El servidor iniciará pero sin funcionalidad de base de datos"
    );
  }

  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(
      `🗄️ Base de datos: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`
    );
    console.log(`🌐 CORS habilitado para: ${corsOrigins.join(", ")}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);

    if (process.env.NODE_ENV === "development") {
      console.log(`🔧 Modo desarrollo activado`);
    }
  });
};

// Manejo de errores no capturados
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Cerrar conexiones al terminar
process.on("SIGINT", async () => {
  console.log("\n👋 Cerrando servidor...");
  try {
    if (pool) {
      await pool.end();
      console.log("✅ Conexiones de BD cerradas");
    }
    process.exit(0);
  } catch (error) {
    console.error("❌ Error cerrando conexiones:", error);
    process.exit(1);
  }
});

startServer().catch(console.error);

module.exports = app;
