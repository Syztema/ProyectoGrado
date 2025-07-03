// scripts/init-database-fixed.js - Script arreglado para inicializar la base de datos
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'proyecto'
};

const initializeDatabase = async () => {
  let connection = null;
  
  try {
    console.log('🔌 Conectando a la base de datos...');
    
    // Primero conectar sin especificar base de datos
    const connectionConfig = { ...dbConfig };
    delete connectionConfig.database;
    
    connection = await mysql.createConnection(connectionConfig);
    console.log('✅ Conectado a MySQL');

    // Crear base de datos si no existe usando query() 
    console.log(`📁 Creando base de datos '${dbConfig.database}' si no existe...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    
    // Cerrar conexión y reconectar a la base de datos específica
    await connection.end();
    connection = await mysql.createConnection(dbConfig);
    console.log(`✅ Conectado a la base de datos '${dbConfig.database}'`);

    // Crear tabla de usuarios
    console.log('📋 Creando tabla de usuarios...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        full_name VARCHAR(150),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Crear tabla de dispositivos autorizados
    console.log('📱 Creando tabla de dispositivos autorizados...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS authorized_devices (
        id VARCHAR(36) PRIMARY KEY,
        fingerprint VARCHAR(255) UNIQUE NOT NULL,
        device_hash VARCHAR(255),
        username VARCHAR(100) NOT NULL,
        user_display_name VARCHAR(150),
        device_info JSON,
        location_info JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        auto_authorized BOOLEAN DEFAULT FALSE,
        manually_authorized BOOLEAN DEFAULT FALSE,
        authorized_by VARCHAR(100),
        admin_notes TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        INDEX idx_username (username),
        INDEX idx_fingerprint (fingerprint),
        INDEX idx_last_seen (last_seen),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Crear tabla de logs de autenticación
    console.log('📊 Creando tabla de logs de autenticación...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS auth_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100),
        device_fingerprint VARCHAR(255),
        location_info JSON,
        auth_method ENUM('mysql', 'ad', 'mixed') DEFAULT 'mysql',
        auth_step ENUM('location', 'device', 'credentials') NOT NULL,
        success BOOLEAN NOT NULL,
        error_message TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_created_at (created_at),
        INDEX idx_success (success),
        INDEX idx_auth_method (auth_method)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Crear tabla de configuración del sistema
    console.log('⚙️ Creando tabla de configuración del sistema...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS system_config (
        config_key VARCHAR(100) PRIMARY KEY,
        config_value TEXT,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Crear tabla de sesiones (para express-mysql-session)
    console.log('🔐 Creando tabla de sesiones...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
        expires INT(11) UNSIGNED NOT NULL,
        data MEDIUMTEXT COLLATE utf8mb4_bin,
        PRIMARY KEY (session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Insertar configuración por defecto
    console.log('🔧 Insertando configuración por defecto...');
    const configs = [
      ['auth_method', 'mysql', 'Método de autenticación: mysql, ad, or mixed'],
      ['max_devices_per_user', '3', 'Máximo de dispositivos por usuario'],
      ['auto_authorize_devices', 'true', 'Auto-autorizar nuevos dispositivos'],
      ['device_inactivity_days', '90', 'Días de inactividad antes de revocar dispositivo'],
      ['allowed_polygon', '[]', 'Coordenadas del polígono de área permitida (JSON)'],
      ['system_version', '1.0.0', 'Versión del sistema'],
      ['maintenance_mode', 'false', 'Modo de mantenimiento'],
      ['max_login_attempts', '5', 'Máximo de intentos de login'],
      ['session_timeout', '86400000', 'Timeout de sesión en milisegundos']
    ];

    for (const [key, value, description] of configs) {
      await connection.execute(`
        INSERT INTO system_config (config_key, config_value, description) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE description = VALUES(description)
      `, [key, value, description]);
    }

    // Crear usuario administrador por defecto
    console.log('👤 Creando usuarios de ejemplo...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const userPassword = await bcrypt.hash('usuario123', 10);
    
    // Verificar si los usuarios ya existen
    const [existingUsers] = await connection.execute(
      'SELECT username FROM users WHERE username IN (?, ?)',
      ['admin@empresa.com', 'usuario@empresa.com']
    );

    const existingUsernames = existingUsers.map(user => user.username);

    if (!existingUsernames.includes('admin@empresa.com')) {
      await connection.execute(`
        INSERT INTO users (username, password, email, full_name, is_active) 
        VALUES (?, ?, ?, ?, TRUE)
      `, ['admin@empresa.com', adminPassword, 'admin@empresa.com', 'Administrador del Sistema']);
      console.log('✅ Usuario administrador creado');
    } else {
      console.log('ℹ️ Usuario administrador ya existe');
    }

    if (!existingUsernames.includes('usuario@empresa.com')) {
      await connection.execute(`
        INSERT INTO users (username, password, email, full_name, is_active) 
        VALUES (?, ?, ?, ?, TRUE)
      `, ['usuario@empresa.com', userPassword, 'usuario@empresa.com', 'Usuario de Prueba']);
      console.log('✅ Usuario de prueba creado');
    } else {
      console.log('ℹ️ Usuario de prueba ya existe');
    }

    // Crear algunos dispositivos de ejemplo
    console.log('📱 Creando dispositivos de ejemplo...');
    const exampleDevices = [
      {
        id: crypto.randomUUID(),
        fingerprint: 'admin-device-' + crypto.randomBytes(8).toString('hex'),
        username: 'admin@empresa.com',
        device_info: JSON.stringify({
          platform: 'Win32',
          screenResolution: '1920x1080',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          timezone: 'America/Bogota'
        }),
        auto_authorized: true
      },
      {
        id: crypto.randomUUID(),
        fingerprint: 'user-device-' + crypto.randomBytes(8).toString('hex'),
        username: 'usuario@empresa.com',
        device_info: JSON.stringify({
          platform: 'MacIntel',
          screenResolution: '1440x900',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          timezone: 'America/Bogota'
        }),
        auto_authorized: true
      }
    ];

    for (const device of exampleDevices) {
      // Verificar si el dispositivo ya existe
      const [existingDevice] = await connection.execute(
        'SELECT id FROM authorized_devices WHERE fingerprint = ?',
        [device.fingerprint]
      );

      if (existingDevice.length === 0) {
        await connection.execute(`
          INSERT INTO authorized_devices 
          (id, fingerprint, username, device_info, auto_authorized, created_at, last_seen, is_active)
          VALUES (?, ?, ?, ?, ?, NOW(), NOW(), TRUE)
        `, [device.id, device.fingerprint, device.username, device.device_info, device.auto_authorized]);
      }
    }

    // Crear algunos logs de ejemplo
    console.log('📊 Creando logs de ejemplo...');
    const exampleLogs = [
      {
        username: 'admin@empresa.com',
        auth_method: 'mysql',
        auth_step: 'credentials',
        success: true,
        ip: '127.0.0.1'
      },
      {
        username: 'usuario@empresa.com',
        auth_method: 'mysql',
        auth_step: 'credentials',
        success: true,
        ip: '127.0.0.1'
      },
      {
        username: 'test@empresa.com',
        auth_method: 'mysql',
        auth_step: 'device',
        success: false,
        error_message: 'Dispositivo no autorizado',
        ip: '127.0.0.1'
      }
    ];

    for (const log of exampleLogs) {
      await connection.execute(`
        INSERT INTO auth_logs (username, auth_method, auth_step, success, error_message, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW() - INTERVAL FLOOR(RAND() * 7) DAY)
      `, [log.username, log.auth_method, log.auth_step, log.success, log.error_message || null, log.ip]);
    }

    console.log('\n🎉 ¡Base de datos inicializada exitosamente!');
    console.log('\n📋 INFORMACIÓN DE ACCESO:');
    console.log('========================');
    console.log('👤 Usuario Administrador:');
    console.log('   Email: admin@empresa.com');
    console.log('   Contraseña: admin123');
    console.log('');
    console.log('👤 Usuario de Prueba:');
    console.log('   Email: usuario@empresa.com');
    console.log('   Contraseña: usuario123');
    console.log('');
    console.log('🔧 Para administrar el sistema:');
    console.log('   npm run admin');
    console.log('');
    console.log('🚀 Para iniciar el servidor:');
    console.log('   npm start');
    console.log('');
    console.log('📊 Tablas creadas:');
    console.log('   ✅ users');
    console.log('   ✅ authorized_devices'); 
    console.log('   ✅ auth_logs');
    console.log('   ✅ system_config');
    console.log('   ✅ sessions');

  } catch (error) {
    console.error('❌ Error inicializando la base de datos:', error);
    
    // Información adicional para debug
    if (error.code) {
      console.error(`Código de error: ${error.code}`);
    }
    if (error.sql) {
      console.error(`SQL que causó el error: ${error.sql}`);
    }
    
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
};

// Función para verificar el estado de la base de datos
const checkDatabase = async () => {
  let connection = null;
  
  try {
    console.log('🔍 Verificando estado de la base de datos...');
    connection = await mysql.createConnection(dbConfig);
    
    // Verificar tablas existentes
    const [tables] = await connection.query('SHOW TABLES');
    console.log('\n📋 Tablas encontradas:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`   ✅ ${tableName}`);
    });

    // Verificar usuarios
    const [users] = await connection.execute('SELECT username, is_active FROM users');
    console.log('\n👥 Usuarios encontrados:');
    users.forEach(user => {
      console.log(`   ${user.is_active ? '✅' : '❌'} ${user.username}`);
    });

    // Verificar dispositivos
    const [devices] = await connection.execute('SELECT COUNT(*) as count FROM authorized_devices WHERE is_active = TRUE');
    console.log(`\n📱 Dispositivos autorizados activos: ${devices[0].count}`);

    // Verificar configuración
    const [configs] = await connection.execute('SELECT COUNT(*) as count FROM system_config');
    console.log(`⚙️ Configuraciones del sistema: ${configs[0].count}`);

  } catch (error) {
    console.error('❌ Error verificando la base de datos:', error);
  } finally {
    if (connection) await connection.end();
  }
};

// Función para limpiar la base de datos (cuidado!)
const cleanDatabase = async () => {
  let connection = null;
  
  try {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('⚠️ ADVERTENCIA: Esto eliminará TODOS los datos!');
    const response = await new Promise((resolve) => {
      rl.question('¿Estás seguro? Escribe "CONFIRMAR" para continuar: ', (answer) => {
        rl.close();
        resolve(answer);
      });
    });
    
    if (response !== 'CONFIRMAR') {
      console.log('Operación cancelada.');
      return;
    }

    connection = await mysql.createConnection(dbConfig);
    
    console.log('🧹 Limpiando base de datos...');
    
    // Desactivar verificación de claves foráneas temporalmente
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Eliminar todas las tablas
    const tables = ['auth_logs', 'authorized_devices', 'sessions', 'system_config', 'users'];
    for (const table of tables) {
      await connection.query(`DROP TABLE IF EXISTS ${table}`);
      console.log(`✅ Tabla ${table} eliminada`);
    }
    
    // Reactivar verificación de claves foráneas
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('✅ Base de datos limpiada exitosamente');
    
  } catch (error) {
    console.error('❌ Error limpiando la base de datos:', error);
  } finally {
    if (connection) await connection.end();
  }
};

// Determinar qué operación realizar
const operation = process.argv[2];

if (operation === 'clean') {
  cleanDatabase();
} else if (operation === 'check') {
  checkDatabase();
} else {
  initializeDatabase();
}

module.exports = { initializeDatabase, cleanDatabase, checkDatabase };