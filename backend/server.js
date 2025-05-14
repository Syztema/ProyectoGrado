//z?0e>FTA
const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(
  cors({
    origin: ["http://localhost:3000", "https://localhost:3000"],
    credentials: true,
  })
);
app.use(bodyParser.json());

// Configuración mejorada del pool de conexiones
const pool = mysql.createPool({
  host: "193.203.175.121",
  user: "u496942219_moodleud",
  password: "z?0e>FTA",
  database: "u496942219_moodleud",
  port: 3306,
  connectionLimit: 5,
  connectTimeout: 10000,
  acquireTimeout: 10000,
  timeout: 60000,
  waitForConnections: true,
  queueLimit: 0,
  insecureAuth: true,
  debug: false, // Cambiar a true para ver logs detallados de MySQL
});

// Middleware para manejar reconexiones
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

// Función para verificar contraseña Moodle
function checkMoodlePassword(inputPassword, storedHash) {
  try {
    if (!storedHash || !inputPassword) return false;

    // Extraer componentes del hash almacenado
    const parts = storedHash.split("$");
    if (parts.length < 5) return false;

    const algorithm = parts[1];
    const salt = parts[3];
    const realHash = parts[4];

    // Solo implementamos SHA-512 por ahora (parte con $6$)
    if (algorithm === "6") {
      const generatedHash = crypto
        .createHash("sha512")
        .update(inputPassword + salt)
        .digest("hex");
      return generatedHash === realHash;
    }

    return false;
  } catch (err) {
    console.error("Error en checkMoodlePassword:", err);
    return false;
  }
}

// Ruta de login mejorada
app.post("/login", async (req, res) => {
  let connection;
  try {
    const { username, password } = req.body;
    console.log("Datos recibidos:", {
      username,
      password: password.length > 0 ? "***" : "",
    });

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Usuario y contraseña son requeridos",
      });
    }

    connection = await new Promise((resolve, reject) => {
      pool.getConnection((err, conn) => {
        if (err) reject(err);
        else resolve(conn);
      });
    });

    // 1. Primero obtener el usuario con su hash completo
    const [user] = await new Promise((resolve, reject) => {
      connection.query(
        "SELECT id, username, email, password FROM mdl_user WHERE username = ?",
        [username.trim()],
        (err, results) => {
          if (err) reject(err);
          else resolve(results);
        }
      );
    });

    console.log(
      "Usuario encontrado:",
      user
        ? {
            id: user.id,
            username: user.username,
            passwordHash: user.password
              ? user.password.substring(0, 20) + "..."
              : null,
          }
        : null
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Usuario no encontrado",
      });
    }

    // 2. Comparación directa para desarrollo (NO para producción)
    if (password === "z?0e>FTA") {
      // Solo para prueba de desarrollo
      console.warn("ADVERTENCIA: Autenticación de desarrollo activada");
      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });
    }

    // 3. Respuesta negativa si no coincide la contraseña hardcodeada
    return res.status(401).json({
      success: false,
      error: "Credenciales incorrectas",
    });
  } catch (err) {
    console.error("Error completo:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
    });
    res.status(500).json({
      success: false,
      error: "Error en el servidor",
    });
  } finally {
    if (connection) connection.release();
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
