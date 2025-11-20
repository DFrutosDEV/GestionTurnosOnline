# Guía de Configuración - Sistema de Gestión de Turnos

## 📋 Requisitos Previos

1. **Node.js 18+** instalado
2. **Cuenta de Google** con acceso a Google Cloud Console
3. **Google Calendar API** habilitada

## 🔧 Configuración de Google Calendar API

### Paso 1: Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google Calendar API** para tu proyecto

### Paso 2: Crear Service Account

1. Ve a **IAM & Admin > Service Accounts**
2. Clic en **Create Service Account**
3. Completa el formulario:
   - **Service account name**: `turnos-calendar`
   - **Service account ID**: Se genera automáticamente
   - **Description**: `Service account para gestión de turnos`
4. Clic en **Create and Continue**
5. Opcional: Asigna roles si es necesario
6. Clic en **Done**

### Paso 3: Generar Credenciales

1. En la lista de Service Accounts, encuentra el que acabas de crear
2. Clic en el email del service account
3. Ve a la pestaña **Keys**
4. Clic en **Add Key > Create new key**
5. Selecciona **JSON** como formato
6. Descarga el archivo JSON

### Paso 4: Obtener Calendar ID

1. Ve a [Google Calendar](https://calendar.google.com/)
2. En el menú lateral, encuentra **Settings > Settings for my calendars**
3. Selecciona el calendario que quieres usar (o crea uno nuevo)
4. En **Calendar ID**, copia el ID (tiene formato `xxxxx@group.calendar.google.com` o `xxxxx@gmail.com`)

### Paso 5: Compartir Calendario con Service Account

1. En la configuración del calendario, ve a **Share with specific people**
2. Clic en **Add people**
3. Ingresa el **email del service account** (está en el archivo JSON descargado, campo `client_email`)
4. Selecciona permiso **Make changes to events**
5. Clic en **Send**

### Paso 6: Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Google Calendar API Configuration
GOOGLE_CLIENT_EMAIL=tu-service-account-email@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...tu-private-key...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=tu-calendar-id@group.calendar.google.com

# Email destino para los eventos
DEFAULT_CALENDAR_EMAIL=tu-email@gmail.com

# Credenciales de login (hardcoded - cambiar en producción)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

**Nota importante sobre GOOGLE_PRIVATE_KEY:**
- Copia el valor del campo `private_key` del archivo JSON descargado
- Mantén los caracteres `\n` tal como están en el JSON original
- Todo el contenido debe estar entre comillas dobles

Ejemplo:
```env
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

## 🚀 Instalación y Ejecución

1. **Instalar dependencias:**
```bash
npm install
```

2. **Ejecutar en desarrollo:**
```bash
npm run dev
```

3. **Abrir en el navegador:**
```
http://localhost:3000
```

## 📦 Deploy en Vercel

### Paso 1: Preparar el Proyecto

1. Asegúrate de tener todos los cambios en Git
2. Sube el código a GitHub

### Paso 2: Configurar en Vercel

1. Ve a [Vercel](https://vercel.com/)
2. Importa tu repositorio de GitHub
3. En **Environment Variables**, agrega todas las variables de `.env.local`:
   - `GOOGLE_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (¡cuidado con los saltos de línea!)
   - `GOOGLE_CALENDAR_ID`
   - `DEFAULT_CALENDAR_EMAIL`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`

4. Clic en **Deploy**

### Importante para Vercel:

Cuando configures `GOOGLE_PRIVATE_KEY` en Vercel:
- Copia el valor completo incluyendo los `\n`
- En el dashboard de Vercel, puedes pegarlo directamente
- Si tienes problemas, puedes reemplazar `\n` por saltos de línea reales

## 🔐 Credenciales de Login

Por defecto:
- **Usuario**: `admin`
- **Contraseña**: `admin123`

**⚠️ IMPORTANTE**: Cambia estas credenciales en producción modificando las variables de entorno `ADMIN_USERNAME` y `ADMIN_PASSWORD`.

## ✅ Verificación

Una vez configurado:

1. **Prueba el formulario de reserva:**
   - Accede a la página principal
   - Completa el formulario
   - Verifica que se cree el evento en Google Calendar

2. **Prueba el panel de administración:**
   - Haz clic en "Iniciar Sesión"
   - Ingresa las credenciales
   - Modifica la configuración y guarda

3. **Verifica en Google Calendar:**
   - Ve a tu calendario en Google
   - Deberías ver los eventos creados
   - Si configuraste `DEFAULT_CALENDAR_EMAIL`, deberías recibir invitaciones

## 🐛 Solución de Problemas

### Error: "Invalid credentials"
- Verifica que `GOOGLE_CLIENT_EMAIL` sea correcto
- Asegúrate de que el calendario esté compartido con el service account

### Error: "Calendar not found"
- Verifica que `GOOGLE_CALENDAR_ID` sea correcto
- Asegúrate de usar el formato completo: `xxxxx@group.calendar.google.com`

### Error: "Unauthorized"
- Verifica que la Google Calendar API esté habilitada en tu proyecto
- Asegúrate de que el service account tenga los permisos correctos

### Los eventos no se crean
- Verifica los logs en la consola del servidor
- Asegúrate de que el calendario esté compartido con el service account
- Verifica que las variables de entorno estén configuradas correctamente

