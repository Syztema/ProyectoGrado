🚀 Instalación paso a paso:
Paso 1: Limpiar e instalar dependencias
bash# Limpiar módulos anteriores (en caso de tenerlos)
rm -rf node_modules package-lock.json

# Instalar dependencias básicas
npm install
Paso 2: Configurar entorno
bash# Crear archivo de configuración
cp .env.example .env

# Editar .env con tu configuración MySQL
Paso 3: Verificar configuración
bash# Ejecutar diagnóstico
npm run test:setup
Paso 4: Inicializar base de datos
bash# Solo si necesitas crear las tablas de la bd
npm run db:init
Paso 5: Iniciar servidor
bashnpm start
