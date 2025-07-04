#!/usr/bin/env node

// admin-cli.js - CLI Administrativo Integrado con MySQL
const mysql = require('mysql2/promise');
const readline = require('readline');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
require('dotenv').config();

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'proyecto'
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

let connection = null;

const connectDB = async () => {
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos MySQL');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
    return false;
  }
};

const showMenu = () => {
  console.log('\n🔐 ADMINISTRADOR DEL SISTEMA DE ACCESO SEGURO');
  console.log('=============================================');
  console.log('1. 👥 Gestión de Usuarios');
  console.log('2. 📱 Gestión de Dispositivos');
  console.log('3. 📊 Estadísticas y Reportes');
  console.log('4. ⚙️  Configuración del Sistema');
  console.log('5. 🗃️  Logs de Auditoría');
  console.log('6. 🧹 Mantenimiento');
  console.log('0. 🚪 Salir');
  console.log('=============================================');
};

const showUserMenu = () => {
  console.log('\n👥 GESTIÓN DE USUARIOS');
  console.log('====================');
  console.log('1. Listar usuarios');
  console.log('2. Crear usuario');
  console.log('3. Modificar usuario');
  console.log('4. Activar/Desactivar usuario');
  console.log('5. Cambiar contraseña');
  console.log('0. Volver al menú principal');
};

const showDeviceMenu = () => {
  console.log('\n📱 GESTIÓN DE DISPOSITIVOS');
  console.log('==========================');
  console.log('1. Listar dispositivos autorizados');
  console.log('2. Autorizar dispositivo manualmente');
  console.log('3. Revocar dispositivo');
  console.log('4. Buscar dispositivos por usuario');
  console.log('5. Limpiar dispositivos inactivos');
  console.log('0. Volver al menú principal');
};

// ===== GESTIÓN DE USUARIOS =====

const listUsers = async () => {
  try {
    const [rows] = await connection.execute(`
      SELECT id, username, email, full_name, is_active, created_at,
             (SELECT COUNT(*) FROM authorized_devices WHERE username = users.username AND is_active = TRUE) as device_count
      FROM users 
      ORDER BY created_at DESC
    `);

    if (rows.length === 0) {
      console.log('📝 No hay usuarios registrados.');
      return;
    }

    console.log('\n👥 USUARIOS REGISTRADOS:');
    console.log('========================');
    
    rows.forEach((user, index) => {
      console.log(`\n${index + 1}. ID: ${user.id}`);
      console.log(`   Usuario: ${user.username}`);
      console.log(`   Nombre: ${user.full_name || 'No especificado'}`);
      console.log(`   Email: ${user.email || 'No especificado'}`);
      console.log(`   Estado: ${user.is_active ? '✅ Activo' : '❌ Inactivo'}`);
      console.log(`   Dispositivos: ${user.device_count}`);
      console.log(`   Creado: ${new Date(user.created_at).toLocaleString()}`);
      console.log('   ────────────────────────────');
    });
  } catch (error) {
    console.error('❌ Error listando usuarios:', error.message);
  }
};

const createUser = async () => {
  console.log('\n➕ CREAR NUEVO USUARIO');
  console.log('======================');
  
  try {
    const username = await question('Usuario (email): ');
    const password = await question('Contraseña: ');
    const fullName = await question('Nombre completo: ');
    const email = await question('Email (opcional): ');
    
    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await connection.execute(`
      INSERT INTO users (username, password, full_name, email, is_active, created_at)
      VALUES (?, ?, ?, ?, TRUE, NOW())
    `, [username, hashedPassword, fullName, email || username]);
    
    console.log(`✅ Usuario creado exitosamente con ID: ${result.insertId}`);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('❌ El usuario ya existe.');
    } else {
      console.error('❌ Error creando usuario:', error.message);
    }
  }
};

const toggleUserStatus = async () => {
  console.log('\n🔄 ACTIVAR/DESACTIVAR USUARIO');
  console.log('=============================');
  
  const username = await question('Usuario a modificar: ');
  
  try {
    const [users] = await connection.execute(
      'SELECT id, username, is_active FROM users WHERE username = ?',
      [username]
    );
    
    if (users.length === 0) {
      console.log('❌ Usuario no encontrado.');
      return;
    }
    
    const user = users[0];
    const newStatus = !user.is_active;
    
    await connection.execute(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [newStatus, user.id]
    );
    
    console.log(`✅ Usuario ${username} ${newStatus ? 'activado' : 'desactivado'} exitosamente.`);
  } catch (error) {
    console.error('❌ Error modificando usuario:', error.message);
  }
};

// ===== GESTIÓN DE DISPOSITIVOS =====

const listDevices = async () => {
  try {
    const [rows] = await connection.execute(`
      SELECT id, fingerprint, username, user_display_name, 
             device_info, created_at, last_seen, auto_authorized, manually_authorized, is_active
      FROM authorized_devices 
      ORDER BY last_seen DESC
    `);

    if (rows.length === 0) {
      console.log('📝 No hay dispositivos autorizados.');
      return;
    }

    console.log('\n📱 DISPOSITIVOS AUTORIZADOS:');
    console.log('============================');
    
    rows.forEach((device, index) => {
      const deviceInfo = device.device_info ? JSON.parse(device.device_info) : {};
      
      console.log(`\n${index + 1}. ID: ${device.id}`);
      console.log(`   Usuario: ${device.username}`);
      console.log(`   Huella: ${device.fingerprint.substring(0, 16)}...`);
      console.log(`   Plataforma: ${deviceInfo.platform || 'No disponible'}`);
      console.log(`   Estado: ${device.is_active ? '✅ Activo' : '❌ Revocado'}`);
      console.log(`   Autorización: ${device.auto_authorized ? 'Automática' : 'Manual'}`);
      console.log(`   Creado: ${new Date(device.created_at).toLocaleString()}`);
      console.log(`   Última conexión: ${device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Nunca'}`);
      console.log('   ────────────────────────────');
    });
  } catch (error) {
    console.error('❌ Error listando dispositivos:', error.message);
  }
};

const authorizeDevice = async () => {
  console.log('\n➕ AUTORIZAR DISPOSITIVO MANUALMENTE');
  console.log('====================================');
  
  try {
    const fingerprint = await question('Huella digital del dispositivo: ');
    const username = await question('Usuario: ');
    const adminNotes = await question('Notas administrativas (opcional): ');
    
    // Verificar si ya existe
    const [existing] = await connection.execute(
      'SELECT id FROM authorized_devices WHERE fingerprint = ?',
      [fingerprint]
    );
    
    if (existing.length > 0) {
      console.log('❌ Este dispositivo ya está autorizado.');
      return;
    }
    
    const deviceId = crypto.randomUUID();
    
    await connection.execute(`
      INSERT INTO authorized_devices 
      (id, fingerprint, username, authorized_by, admin_notes, manually_authorized, created_at, last_seen, is_active)
      VALUES (?, ?, ?, 'admin-cli', ?, TRUE, NOW(), NOW(), TRUE)
    `, [deviceId, fingerprint, username, adminNotes]);
    
    console.log('✅ Dispositivo autorizado exitosamente!');
    console.log(`   ID: ${deviceId}`);
  } catch (error) {
    console.error('❌ Error autorizando dispositivo:', error.message);
  }
};

const revokeDevice = async () => {
  console.log('\n❌ REVOCAR DISPOSITIVO');
  console.log('======================');
  
  try {
    const [devices] = await connection.execute(`
      SELECT id, fingerprint, username, created_at 
      FROM authorized_devices 
      WHERE is_active = TRUE
      ORDER BY last_seen DESC
      LIMIT 20
    `);
    
    if (devices.length === 0) {
      console.log('📝 No hay dispositivos activos para revocar.');
      return;
    }
    
    console.log('\nDispositivos activos (últimos 20):');
    devices.forEach((device, index) => {
      console.log(`${index + 1}. ${device.username} - ${device.fingerprint.substring(0, 8)}... (${new Date(device.created_at).toLocaleDateString()})`);
    });
    
    const selection = await question('\nIngresa el número del dispositivo a revocar (0 para cancelar): ');
    const deviceIndex = parseInt(selection) - 1;
    
    if (selection === '0') {
      console.log('Operación cancelada.');
      return;
    }
    
    if (deviceIndex < 0 || deviceIndex >= devices.length) {
      console.log('❌ Selección inválida.');
      return;
    }
    
    const deviceToRevoke = devices[deviceIndex];
    console.log(`\n¿Confirmas que quieres revocar el dispositivo de ${deviceToRevoke.username}?`);
    const confirm = await question('Escribe "CONFIRMAR" para proceder: ');
    
    if (confirm === 'CONFIRMAR') {
      await connection.execute(
        'UPDATE authorized_devices SET is_active = FALSE WHERE id = ?',
        [deviceToRevoke.id]
      );
      console.log('✅ Dispositivo revocado exitosamente!');
    } else {
      console.log('Operación cancelada.');
    }
  } catch (error) {
    console.error('❌ Error revocando dispositivo:', error.message);
  }
};

const cleanInactiveDevices = async () => {
  console.log('\n🧹 LIMPIAR DISPOSITIVOS INACTIVOS');
  console.log('=================================');
  
  const days = await question('Días de inactividad para considerar como inactivo (default: 90): ');
  const inactiveDays = parseInt(days) || 90;
  
  try {
    const [inactiveDevices] = await connection.execute(`
      SELECT id, username, fingerprint, last_seen
      FROM authorized_devices 
      WHERE is_active = TRUE 
      AND (last_seen IS NULL OR last_seen < DATE_SUB(NOW(), INTERVAL ? DAY))
    `, [inactiveDays]);
    
    if (inactiveDevices.length === 0) {
      console.log('📝 No se encontraron dispositivos inactivos.');
      return;
    }
    
    console.log(`\nSe encontraron ${inactiveDevices.length} dispositivos inactivos:`);
    inactiveDevices.forEach(device => {
      console.log(`- ${device.username}: ${device.last_seen ? new Date(device.last_seen).toLocaleDateString() : 'Nunca conectado'}`);
    });
    
    const confirm = await question('\n¿Confirmas que quieres revocar estos dispositivos? (sí/no): ');
    
    if (confirm.toLowerCase() === 'sí' || confirm.toLowerCase() === 'si') {
      const deviceIds = inactiveDevices.map(d => d.id);
      
      await connection.execute(
        `UPDATE authorized_devices SET is_active = FALSE WHERE id IN (${deviceIds.map(() => '?').join(',')})`,
        deviceIds
      );
      
      console.log(`✅ Se revocaron ${inactiveDevices.length} dispositivos inactivos.`);
    } else {
      console.log('Operación cancelada.');
    }
  } catch (error) {
    console.error('❌ Error limpiando dispositivos:', error.message);
  }
};

// ===== ESTADÍSTICAS =====

const showStats = async () => {
  console.log('\n📊 ESTADÍSTICAS DEL SISTEMA');
  console.log('===========================');
  
  try {
    // Estadísticas de usuarios
    const [userStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_users,
        COUNT(CASE WHEN is_active = FALSE THEN 1 END) as inactive_users
      FROM users
    `);
    
    // Estadísticas de dispositivos
    const [deviceStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_devices,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_devices,
        COUNT(CASE WHEN auto_authorized = TRUE AND is_active = TRUE THEN 1 END) as auto_authorized,
        COUNT(CASE WHEN manually_authorized = TRUE AND is_active = TRUE THEN 1 END) as manual_authorized,
        COUNT(DISTINCT username) as unique_users_with_devices
      FROM authorized_devices
    `);
    
    // Logins recientes
    const [recentLogins] = await connection.execute(`
      SELECT COUNT(*) as successful_logins
      FROM auth_logs 
      WHERE success = TRUE 
      AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    
    console.log('\n👥 Usuarios:');
    console.log(`   Total: ${userStats[0].total_users}`);
    console.log(`   Activos: ${userStats[0].active_users}`);
    console.log(`   Inactivos: ${userStats[0].inactive_users}`);
    
    console.log('\n📱 Dispositivos:');
    console.log(`   Total autorizados: ${deviceStats[0].total_devices}`);
    console.log(`   Activos: ${deviceStats[0].active_devices}`);
    console.log(`   Auto-autorizados: ${deviceStats[0].auto_authorized}`);
    console.log(`   Autorizados manualmente: ${deviceStats[0].manual_authorized}`);
    console.log(`   Usuarios con dispositivos: ${deviceStats[0].unique_users_with_devices}`);
    
    console.log('\n📊 Actividad:');
    console.log(`   Logins exitosos (últimos 7 días): ${recentLogins[0].successful_logins}`);
    
    if (deviceStats[0].unique_users_with_devices > 0) {
      const avgDevices = (deviceStats[0].active_devices / deviceStats[0].unique_users_with_devices).toFixed(1);
      console.log(`   Promedio de dispositivos por usuario: ${avgDevices}`);
    }
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error.message);
  }
};

// ===== MENÚ PRINCIPAL =====

const handleUserMenu = async () => {
  while (true) {
    showUserMenu();
    const choice = await question('\nSelecciona una opción: ');
    
    switch (choice) {
      case '1':
        await listUsers();
        break;
      case '2':
        await createUser();
        break;
      case '3':
        console.log('Función en desarrollo...');
        break;
      case '4':
        await toggleUserStatus();
        break;
      case '5':
        console.log('Función en desarrollo...');
        break;
      case '0':
        return;
      default:
        console.log('❌ Opción inválida.');
    }
    
    if (choice !== '0') {
      await question('\nPresiona Enter para continuar...');
    }
  }
};

const handleDeviceMenu = async () => {
  while (true) {
    showDeviceMenu();
    const choice = await question('\nSelecciona una opción: ');
    
    switch (choice) {
      case '1':
        await listDevices();
        break;
      case '2':
        await authorizeDevice();
        break;
      case '3':
        await revokeDevice();
        break;
      case '4':
        console.log('Función en desarrollo...');
        break;
      case '5':
        await cleanInactiveDevices();
        break;
      case '0':
        return;
      default:
        console.log('❌ Opción inválida.');
    }
    
    if (choice !== '0') {
      await question('\nPresiona Enter para continuar...');
    }
  }
};

const main = async () => {
  console.log('🚀 Iniciando CLI administrativo...\n');
  
  if (!(await connectDB())) {
    console.log('❌ No se pudo conectar a la base de datos. Saliendo...');
    process.exit(1);
  }
  
  while (true) {
    showMenu();
    const choice = await question('\nSelecciona una opción: ');
    
    switch (choice) {
      case '1':
        await handleUserMenu();
        break;
      case '2':
        await handleDeviceMenu();
        break;
      case '3':
        await showStats();
        break;
      case '4':
        console.log('⚙️ Configuración del sistema - En desarrollo...');
        break;
      case '5':
        console.log('🗃️ Logs de auditoría - En desarrollo...');
        break;
      case '6':
        console.log('🧹 Mantenimiento - En desarrollo...');
        break;
      case '0':
        console.log('👋 ¡Hasta luego!');
        await connection.end();
        rl.close();
        process.exit(0);
        break;
      default:
        console.log('❌ Opción inválida. Intenta de nuevo.');
    }
    
    if (choice !== '0' && !['1', '2'].includes(choice)) {
      await question('\nPresiona Enter para continuar...');
    }
  }
};

// Manejar errores y señales
process.on('unhandledRejection', async (error) => {
  console.error('❌ Error no manejado:', error);
  if (connection) await connection.end();
  rl.close();
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('\n👋 Saliendo...');
  if (connection) await connection.end();
  rl.close();
  process.exit(0);
});

main().catch(async (error) => {
  console.error('❌ Error fatal:', error);
  if (connection) await connection.end();
  rl.close();
  process.exit(1);
});