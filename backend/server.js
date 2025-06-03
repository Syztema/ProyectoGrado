//z?0e>FTA
const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");
const crypto = require("crypto");
const { exec } = require("child_process");
const path = require("path");

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

const scriptPath = path.join(__dirname, "check_password.py");
// Función para verificar contraseña Moodle
function validatePasswordWithPython(password, storedHash, callback) {
  const scriptPath = path.join(__dirname, "check_password.py");
  const command = `python ${scriptPath} "${password}" "${storedHash}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error ejecutando script de Python: ${error}`);
      callback(false);
      return;
    }

    if (stderr) {
      console.error(`Error en script de Python: ${stderr}`);
      callback(false);
      return;
    }

    console.log(`Resultado del script de Python: ${stdout.trim()}`);
    callback(stdout.trim() === "OK");
  });
}

// Ruta de login mejorada
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("Datos recibidos:", { username, password });

    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Usuario y contraseña son requeridos" });
    }

    console.log(`Intentando login para usuario: ${username}`);

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

    // Usar script Python para validar la contraseña
    validatePasswordWithPython(password, user.password, async (isValid) => {
      if (isValid) {
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
      }

      return res
        .status(401)
        .json({ success: false, error: "Credenciales incorrectas" });
    });
  } catch (err) {
    console.error("Error completo en el servidor:", {
      message: err.message,
      stack: err.stack,
    });
    return res
      .status(500)
      .json({ success: false, error: "Error en el servidor" });
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
