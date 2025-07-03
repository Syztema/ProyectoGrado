// test-setup.js - Script para diagnosticar problemas rápidamente
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'proyecto'
};

async function runDiagnostics() {
  console.log('🔍 DIAGNÓSTICO DEL SISTEMA');
  console.log('=========================\n');

  // 1. Verificar variables de entorno
  console.log('1. 📋 CONFIGURACIÓN:');
  console.log(`   DB_HOST: ${dbConfig.host}`);
  console.log(`   DB_PORT: ${dbConfig.port}`);
  console.log(`   DB_USER: ${dbConfig.user}`);
  console.log(`   DB_PASSWORD: ${dbConfig.password ? '[CONFIGURADA]' : '[VACÍA]'}`);
  console.log(`   DB_NAME: ${dbConfig.database}`);
  console.log(`   SESSION_SECRET: ${process.env.SESSION_SECRET ? '[CONFIGURADO]' : '[NO CONFIGURADO]'}\n`);

  // 2. Verificar conexión MySQL
  console.log('2. 🔌 CONEXIÓN MYSQL:');
  let connection = null;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('   ✅ Conexión exitosa');

    // 3. Verificar base de datos
    const [databases] = await connection.query('SHOW DATABASES LIKE ?', [dbConfig.database]);
    if (databases.length > 0) {
      console.log(`   ✅ Base de datos '${dbConfig.database}' existe`);
    } else {
      console.log(`   ❌ Base de datos '${dbConfig.database}' NO existe`);
      console.log('   💡 Ejecuta: npm run db:init');
      return;
    }

    // 4. Verificar tablas
    console.log('\n3. 📋 TABLAS:');
    const [tables] = await connection.query('SHOW TABLES');
    const requiredTables = ['users', 'authorized_devices', 'auth_logs', 'system_config', 'sessions'];
    
    for (const table of requiredTables) {
      const exists = tables.find(t => Object.values(t)[0] === table);
      if (exists) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} - FALTA`);
      }
    }

    // 5. Verificar usuarios de prueba
    console.log('\n4. 👥 USUARIOS DE PRUEBA:');
    try {
      const [users] = await connection.execute('SELECT username, LENGTH(password) as pass_length, is_active FROM users');
      
      if (users.length === 0) {
        console.log('   ❌ No hay usuarios en la base de datos');
        console.log('   💡 Ejecuta: npm run db:init');
      } else {
        console.log(`   📊 Total usuarios: ${users.length}`);
        users.forEach(user => {
          console.log(`   ${user.is_active ? '✅' : '❌'} ${user.username} (password: ${user.pass_length} chars)`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error consultando usuarios: ${error.message}`);
    }

    // 6. Verificar configuración del sistema
    console.log('\n5. ⚙️ CONFIGURACIÓN DEL SISTEMA:');
    try {
      const [configs] = await connection.execute('SELECT config_key, config_value FROM system_config');
      
      if (configs.length === 0) {
        console.log('   ❌ No hay configuración del sistema');
      } else {
        configs.forEach(config => {
          console.log(`   📌 ${config.config_key}: ${config.config_value}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error consultando configuración: ${error.message}`);
    }

    // 7. Test de bcrypt
    console.log('\n6. 🔐 TEST DE BCRYPT:');
    try {
      const testPassword = 'test123';
      const hash = await bcrypt.hash(testPassword, 10);
      const isValid = await bcrypt.compare(testPassword, hash);
      console.log(`   ✅ bcrypt funcionando: ${isValid}`);
    } catch (error) {
      console.log(`   ❌ Error con bcrypt: ${error.message}`);
      console.log('   💡 Ejecuta: npm install bcrypt');
    }

    // 8. Test de login simulado
    console.log('\n7. 🧪 TEST DE LOGIN SIMULADO:');
    try {
      const testUser = 'admin@empresa.com';
      const testPass = 'admin123';
      
      const [userRows] = await connection.execute(
        'SELECT username, password FROM users WHERE username = ? AND is_active = TRUE',
        [testUser]
      );
      
      if (userRows.length > 0) {
        const dbUser = userRows[0];
        let passwordValid = false;
        
        if (dbUser.password.startsWith('$2b$')) {
          // Contraseña hasheada
          passwordValid = await bcrypt.compare(testPass, dbUser.password);
          console.log(`   🔐 Test con hash: ${passwordValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
        } else {
          // Contraseña en texto plano
          passwordValid = testPass === dbUser.password;
          console.log(`   📝 Test texto plano: ${passwordValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
        }
        
        if (passwordValid) {
          console.log('   🎉 Login simulado EXITOSO');
        } else {
          console.log('   ❌ Login simulado FALLÓ');
          console.log('   💡 Verifica la contraseña o ejecuta: npm run db:init');
        }
      } else {
        console.log('   ❌ Usuario de prueba no encontrado');
        console.log('   💡 Ejecuta: npm run db:init');
      }
    } catch (error) {
      console.log(`   ❌ Error en test de login: ${error.message}`);
    }

  } catch (error) {
    console.log(`   ❌ Error de conexión: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('   💡 MySQL no está ejecutándose. Inicia MySQL/XAMPP/WAMP');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('   💡 Credenciales MySQL incorrectas. Verifica usuario/contraseña');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log(`   💡 Base de datos '${dbConfig.database}' no existe. Ejecuta: npm run db:init`);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }

  console.log('\n🏁 DIAGNÓSTICO COMPLETADO');
  console.log('\n📞 Si necesitas ayuda, comparte este output completo.');
}

// Función para crear usuarios de prueba rápidamente
async function createTestUsers() {
  console.log('👤 Creando usuarios de prueba...');
  
  let connection = null;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    const adminPassword = await bcrypt.hash('admin123', 10);
    const userPassword = await bcrypt.hash('usuario123', 10);
    
    // Insertar o actualizar usuarios
    await connection.execute(`
      INSERT INTO users (username, password, email, full_name, is_active) 
      VALUES (?, ?, ?, ?, TRUE)
      ON DUPLICATE KEY UPDATE password = VALUES(password), full_name = VALUES(full_name)
    `, ['admin@empresa.com', adminPassword, 'admin@empresa.com', 'Administrador del Sistema']);
    
    await connection.execute(`
      INSERT INTO users (username, password, email, full_name, is_active) 
      VALUES (?, ?, ?, ?, TRUE)
      ON DUPLICATE KEY UPDATE password = VALUES(password), full_name = VALUES(full_name)
    `, ['usuario@empresa.com', userPassword, 'usuario@empresa.com', 'Usuario de Prueba']);
    
    console.log('✅ Usuarios de prueba creados/actualizados:');
    console.log('   👤 admin@empresa.com / admin123');
    console.log('   👤 usuario@empresa.com / usuario123');
    
  } catch (error) {
    console.error('❌ Error creando usuarios:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

// Determinar qué ejecutar
const command = process.argv[2];

if (command === 'users') {
  createTestUsers();
} else {
  runDiagnostics();
}

module.exports = { runDiagnostics, createTestUsers };