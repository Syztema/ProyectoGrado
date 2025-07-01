# 🚀 Instalación paso a paso:
<b>Paso 1:<b> Limpiar e instalar dependencias<br>
Limpiar módulos anteriores (en caso de tenerlos)<br>
rm -rf node_modules package-lock.json

# Instalar dependencias básicas
npm install <br>
Paso 2: Configurar entorno <br><br>
Crear archivo de configuración<br>
cp .env.example .env

# Editar .env con tu configuración MySQL
Paso 3: Verificar configuración<br>
npm run test:setup<br><br>
Paso 4: Inicializar base de datos<br>
Solo si necesitas crear las tablas de la bd<br>
npm run db:init<br><br>
Paso 5: Iniciar servidor
npm start
