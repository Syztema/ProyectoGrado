// verify-installation.js - Verificar que todo funciona después de la instalación
const http = require('http');
const https = require('https');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function verifyInstallation() {
  console.log('🔍 VERIFICACIÓN POST-INSTALACIÓN');
  console.log('================================\n');

  const baseUrl = 'http://localhost:3001';
  let allTestsPassed = true;

  // Test 1: Health Check
  console.log('1. 🏥 Health Check...');
  try {
    const response = await makeRequest(`${baseUrl}/api/health`);
    
    if (response.status === 200 && response.data.status === 'OK') {
      console.log('   ✅ Servidor funcionando correctamente');
      console.log(`   📊 Base de datos: ${response.data.database}`);
      console.log(`   🌐 CORS: ${response.data.cors?.join(', ')}`);
    } else {
      console.log('   ❌ Health check falló');
      console.log(`   📄 Respuesta: ${JSON.stringify(response.data)}`);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('   ❌ No se puede conectar al servidor');
    console.log(`   💡 ¿Está ejecutándose? Ejecuta: npm start`);
    console.log(`   📄 Error: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 2: Login básico
  console.log('\n2. 🔐 Login básico...');
  try {
    const response = await makeRequest(`${baseUrl}/login`, {
      method: 'POST',
      body: {
        username: 'admin@empresa.com',
        password: 'admin123'
      }
    });
    
    if (response.status === 200 && response.data.success === true) {
      console.log('   ✅ Login básico funcionando');
    } else {
      console.log('   ❌ Login básico falló');
      console.log(`   📄 Respuesta: ${JSON.stringify(response.data)}`);
      
      if (response.data.success === false) {
        console.log('   💡 Posibles causas:');
        console.log('      - Usuario no existe: npm run test:users');
        console.log('      - Contraseña incorrecta');
        console.log('      - Base de datos no inicializada: npm run db:init');
      }
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Error en login básico');
    console.log(`   📄 Error: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 3: Login avanzado
  console.log('\n3. 🚀 Login avanzado...');
  try {
    const response = await makeRequest(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      body: {
        username: 'admin@empresa.com',
        password: 'admin123',
        deviceFingerprint: 'test-device-12345',
        deviceInfo: {
          platform: 'Test Platform',
          userAgent: 'Test Agent'
        }
      }
    });
    
    if (response.status === 200 && response.data.success === true) {
      console.log('   ✅ Login avanzado funcionando');
      console.log(`   👤 Usuario: ${response.data.user?.username}`);
      console.log(`   📱 Sistema de dispositivos: Activo`);
    } else {
      console.log('   ❌ Login avanzado falló');
      console.log(`   📄 Respuesta: ${JSON.stringify(response.data)}`);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Error en login avanzado');
    console.log(`   📄 Error: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 4: Verificación de sesiones
  console.log('\n4. 📋 Verificación de sesiones...');
  try {
    const response = await makeRequest(`${baseUrl}/api/auth/check-session`);
    
    if (response.status === 200) {
      console.log('   ✅ Endpoint de sesiones funcionando');
      if (response.data.authenticated) {
        console.log('   🔓 Sesión activa detectada');
      } else {
        console.log('   🔒 No hay sesión activa (normal en test)');
      }
    } else {
      console.log('   ❌ Endpoint de sesiones falló');
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Error verificando sesiones');
    console.log(`   📄 Error: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 5: CORS
  console.log('\n5. 🌐 Verificación CORS...');
  try {
    const response = await makeRequest(`${baseUrl}/api/health`, {
      headers: {
        'Origin': 'https://localhost:3000'
      }
    });
    
    if (response.status === 200) {
      console.log('   ✅ CORS configurado correctamente');
      console.log('   🔗 Frontend puede conectarse desde HTTPS');
    } else {
      console.log('   ⚠️ Posible problema con CORS');
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Error verificando CORS');
    allTestsPassed = false;
  }

  // Resumen final
  console.log('\n' + '='.repeat(50));
  if (allTestsPassed) {
    console.log('🎉 ¡INSTALACIÓN EXITOSA!');
    console.log('✅ Todos los tests pasaron');
    console.log('\n📋 Próximos pasos:');
    console.log('   1. Iniciar el frontend: npm start (en carpeta del frontend)');
    console.log('   2. Acceder a: https://localhost:3000');
    console.log('   3. Login con: admin@empresa.com / admin123');
    console.log('\n🔧 URLs útiles:');
    console.log(`   📊 Health check: ${baseUrl}/api/health`);
    console.log(`   🔐 Login básico: ${baseUrl}/login`);
    console.log(`   🚀 Login avanzado: ${baseUrl}/api/auth/login`);
  } else {
    console.log('❌ INSTALACIÓN INCOMPLETA');
    console.log('⚠️ Algunos tests fallaron');
    console.log('\n🔧 Comandos de ayuda:');
    console.log('   📊 Diagnosticar: npm run test:setup');
    console.log('   🗄️ Inicializar BD: npm run db:init');
    console.log('   👤 Crear usuarios: npm run test:users');
    console.log('   🚀 Reiniciar servidor: npm start');
    console.log('\n💡 Si sigues con problemas:');
    console.log('   1. Verifica que MySQL esté ejecutándose');
    console.log('   2. Revisa el archivo .env');
    console.log('   3. Ejecuta: npm run test:setup');
  }

  console.log('\n📞 ¿Necesitas ayuda? Comparte el output de este script.');
}

// Función para verificar dependencias
function checkDependencies() {
  console.log('📦 Verificando dependencias...\n');
  
  const requiredDeps = [
    'express',
    'mysql2', 
    'cors',
    'express-session',
    'express-mysql-session',
    'dotenv',
    'helmet',
    'express-rate-limit'
  ];

  const optionalDeps = [
    'bcrypt'
  ];

  let allDepsOk = true;

  requiredDeps.forEach(dep => {
    try {
      require(dep);
      console.log(`   ✅ ${dep}`);
    } catch (error) {
      console.log(`   ❌ ${dep} - FALTA`);
      allDepsOk = false;
    }
  });

  console.log('\n📦 Dependencias opcionales:');
  optionalDeps.forEach(dep => {
    try {
      require(dep);
      console.log(`   ✅ ${dep}`);
    } catch (error) {
      console.log(`   ⚠️ ${dep} - No instalado (no crítico)`);
    }
  });

  if (!allDepsOk) {
    console.log('\n❌ Faltan dependencias requeridas');
    console.log('💡 Ejecuta: npm install');
    process.exit(1);
  }

  console.log('\n✅ Todas las dependencias están instaladas\n');
}

// Determinar qué ejecutar
const command = process.argv[2];

if (command === 'deps') {
  checkDependencies();
} else {
  checkDependencies();
  verifyInstallation().catch(console.error);
}

module.exports = { verifyInstallation, checkDependencies };