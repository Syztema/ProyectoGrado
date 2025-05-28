//z?0e>FTA
const express = require("express");
const mysql = require("mysql2/promise");
const bodyParser = require("body-parser");
const cors = require("cors");
const crypto = require("crypto");
const bcrypt = require('bcryptjs');


const app = express();
// Configuración CORS simplificada
app.use(
  cors({
    origin: ["http://localhost:3000", "https://localhost:3000"],
    credentials: true,
  })
);
app.use(bodyParser.json());

app.use(
  cors({
    origin: ["http://localhost:3000", "https://moodleud.zieete.com.co/"],
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
  })
);


// Configuración mejorada del pool de conexiones
const pool = mysql.createPool({
  host: "193.203.175.121",
  user: "u496942219_moodleud",
  password: "z?0e>FTA",
  database: "u496942219_moodleud",
  port: 3306,
  connectionLimit: 5,  
  waitForConnections: true,
  queueLimit: 0,  
});

// Middleware para manejar reconexiones
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

async function validateMoodlePassword(user, inputPassword) {
    console.log('\n=== VALIDACIÓN DE CONTRASEÑA MOODLE ===');
    console.log('Usuario:', user.username);
    console.log('Hash almacenado:', user.password);
    
    // 1. Verificar contraseña no cacheada
    if (user.password === 'not cached') {
        console.log('❌ Contraseña no cacheada en Moodle');
        return false;
    }

    // 2. Determinar tipo de hash
    if (user.password.startsWith('$2y$')) {
        // Hash legacy (bcrypt)
        console.log('Validando hash legacy (bcrypt)');
        const isValid = await bcrypt.compare(inputPassword, user.password);
        console.log('Resultado:', isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO');
        return isValid;
    } 
    else if (user.password.startsWith('$6$')) {
        // Hash SHA-512 de Moodle
        console.log('Validando hash SHA-512 (formato Moodle)');
        const isValid = validateSha512MoodleHash(inputPassword, user.password);
        console.log('Resultado:', isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO');
        return isValid;
    }
    else {
        // Hash moderno (password_hash de PHP)
        console.log('Validando hash moderno (password_hash)');
        const phpass = require('node-phpass').PasswordHash;
        const hasher = new phpass();
        const isValid = hasher.checkPassword(inputPassword, user.password);
        console.log('Resultado:', isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO');
        return isValid;
    }
}

function validateSha512MoodleHash(password, storedHash) {
    const parts = storedHash.split('$').filter(Boolean);
    console.log('Partes del hash:', parts);
    
    if (parts.length < 4 || parts[0] !== '6') {
        console.log('❌ Formato de hash SHA-512 inválido');
        return false;
    }

    const roundsInfo = parts[1];
    const salt = parts[2];
    const realHash = parts[3];

    if (!roundsInfo.startsWith('rounds=')) {
        console.log('❌ Formato de rounds inválido');
        return false;
    }

    const rounds = parseInt(roundsInfo.split('=')[1]);
    console.log(`Configuración: rounds=${rounds}, salt=${salt}`);

    // Proceso de hashing igual que Moodle
    let hash = crypto.createHash('sha512')
                   .update(salt + password, 'binary')
                   .digest('hex');

    for (let i = 1; i < rounds; i++) {
        hash = crypto.createHash('sha512')
                   .update(hash + password, 'binary')
                   .digest('hex');
    }

    console.log('Hash generado:', hash.substring(0, 30) + '...');
    console.log('Hash esperado:', realHash.substring(0, 30) + '...');

    return hash === realHash;
}

// Ruta de login mejorada
app.post("/loginPruebassss", async (req, res) => {
  let connection;
  try {
    console.log("Iniciando proceso de login..."); // Log inicial
    const { username, password } = req.body;

    if (!username || !password) {
      console.log("Credenciales incompletas recibidas");
      return res.status(400).json({
        success: false,
        error: "Usuario y contraseña son requeridos",
      });
    }

    console.log(`Intentando login para usuario: ${username}`);

    // Obtener conexión de la pool
    connection = await new Promise((resolve, reject) => {
      console.log("Solicitando conexión de la pool...");
      pool.getConnection((err, conn) => {
        if (err) {
          console.error("Error al obtener conexión:", err);
          reject(err);
        } else {
          console.log("Conexión obtenida exitosamente");
          resolve(conn);
        }
      });
    });

    // Buscar usuario en la base de datos
    console.log("Buscando usuario en la base de datos...");
    const [user] = await new Promise((resolve, reject) => {
      connection.query(
        "SELECT id, username, email, password FROM mdl_user WHERE username = ?",
        [username.trim()],
        (err, results) => {
          if (err) {
            console.error("Error en consulta SQL:", err);
            reject(err);
          } else {
            console.log(`Resultados de consulta: ${JSON.stringify(results)}`);
            resolve(results);
          }
        }
      );
    });

    if (!user) {
      console.log("Usuario no encontrado en la base de datos");
      return res.status(401).json({
        success: false,
        error: "Usuario no encontrado",
      });
    }

    console.log(`Usuario encontrado: ID ${user.id}, ${user.username}`);

    /*if (password === "z?0e>FTA") { // Solo para desarrollo!
      // 1. Generar token seguro
      const authToken = crypto.randomBytes(32).toString('hex');
      
      // 2. Actualizar usuario en la base de datos
      await connection.query(
        "UPDATE mdl_user SET auth_token = ? WHERE username = ?",
        [authToken, username.trim()]
      );

      // 3. Redirección con parámetros de autenticación
      const redirectUrl = new URL("https://moodleud.zieete.com.co/login/index.php");
      redirectUrl.searchParams.append('auth_token', authToken);
      redirectUrl.searchParams.append('username', username.trim());
      redirectUrl.searchParams.append('redirect', '/my/');
      
      return res.json({
        success: true,
        redirect: redirectUrl.toString()
      });
    }*/

    if (user) {
      // Verificar contraseña usando el hash almacenado en Moodle
      const passwordMatch = checkMoodlePassword(password, user.password);

      if (passwordMatch) {
        // 1. Generar token seguro
        const authToken = crypto.randomBytes(32).toString("hex");

        // 2. Actualizar usuario en la base de datos
        await connection.query(
          "UPDATE mdl_user SET auth_token = ? WHERE username = ?",
          [authToken, username.trim()]
        );

        // 3. Redirección con parámetros de autenticación
        const redirectUrl = new URL(
          "https://moodleud.zieete.com.co/login/index.php"
        );
        redirectUrl.searchParams.append("auth_token", authToken);
        redirectUrl.searchParams.append("username", username.trim());
        redirectUrl.searchParams.append("redirect", "/my/");

        return res.json({
          success: true,
          redirect: redirectUrl.toString(),
        });
      } else {
        return res.status(401).json({
          success: false,
          error: "Credenciales incorrectas",
        });
      }
    }

    console.log("Contraseña no coincide con la de desarrollo");
    return res.status(401).json({
      success: false,
      error: "Credenciales incorrectas",
    });
  } catch (err) {
    console.error("Error completo en el servidor:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
    });
    res.status(500).json({
      success: false,
      error: "Error en el servidor",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  } finally {
    if (connection) {
      console.log("Liberando conexión a la pool");
      connection.release();
    }
  }
});

app.post("/login", async (req, res) => {
  let connection;
  try {
    const { username, password } = req.body;
    console.log("Intento de login para:", username);

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Usuario y contraseña son requeridos"
      });
    }

    // Obtener conexión
    connection = await pool.getConnection();
    console.log("Conexión a BD establecida");

    // Buscar usuario
    const [rows] = await connection.query(
      "SELECT id, username, password FROM mdl_user WHERE username = ? AND auth = 'customnode'",
      [username]
    );

    if (rows.length === 0) {
      console.log("Usuario no encontrado");
      return res.status(401).json({
        success: false,
        error: "Credenciales incorrectas"
      });
    }

    const user = rows[0];
    console.log("Usuario encontrado:", user.username);

    // Validar contraseña
    const isValid = await validateMoodlePassword(user, password);
    
    if (!isValid) {
      console.log("Contraseña no coincide");
      return res.status(401).json({
        success: false,
        error: "Credenciales incorrectas"
      });
    }

    // Generar token y redirección (opcional)
    const authToken = crypto.randomBytes(32).toString("hex");
    await connection.query(
      "UPDATE mdl_user SET auth_token = ? WHERE username = ?",
      [authToken, username]
    );

    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username
      },
      token: authToken // Opcional: devolver el token
    });

  } catch (err) {
    console.error("Error en login:", {
      message: err.message,
      stack: err.stack
    });
    return res.status(500).json({
      success: false,
      error: "Error en el servidor",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    if (connection) {
      console.log("Liberando conexión");
      connection.release();
    }
  }
});

app.get("/verify-token", async (req, res) => {
  const { token } = req.query;

  try {
    const [session] = await pool.query(
      "SELECT user_id FROM user_sessions WHERE token = ? AND expires_at > NOW()",
      [token]
    );

    res.json({
      valid: !!session,
      userId: session?.user_id,
    });
  } catch (err) {
    console.error("Error verifying token:", err);
    res.status(500).json({ valid: false });
  }
});

// Manejadores de errores globales
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // Opcional: reiniciar el servidor después de un error crítico
  // setTimeout(() => process.exit(1), 1000);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);
});

// Manejar cierre limpio
process.on("SIGTERM", () => {
  pool.end(() => {
    console.log("Pool de conexiones cerrado");
    process.exit(0);
  });
});
