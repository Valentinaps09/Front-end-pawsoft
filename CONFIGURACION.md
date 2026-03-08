# Configuración del Proyecto

## Variables de Entorno

Este proyecto requiere configuración de variables de entorno para funcionar correctamente.

### Paso 1: Configurar Environment

1. Navega a `src/environments/`
2. Copia el archivo `environment.example.ts` y renómbralo a `environment.ts`
3. Abre `environment.ts` y reemplaza los valores de ejemplo con tus credenciales reales:

```typescript
export const environment = {
  production: false,
  apiUrl: `http://${window.location.hostname}:8080`,
  cloudinary: {
    cloudName: 'TU_CLOUD_NAME',      // Tu cloudName de Cloudinary
    uploadPreset: 'TU_UPLOAD_PRESET' // Tu uploadPreset de Cloudinary
  }
};
```

### Paso 2: Obtener Credenciales de Cloudinary

1. Crea una cuenta en [Cloudinary](https://cloudinary.com/)
2. Ve a tu Dashboard
3. Copia tu **Cloud Name**
4. Crea un **Upload Preset**:
   - Ve a Settings → Upload
   - Scroll hasta "Upload presets"
   - Crea un nuevo preset (unsigned)
   - Copia el nombre del preset

### Paso 3: Configurar Backend

Asegúrate de que tu backend esté corriendo en el puerto 8080 o ajusta la URL en `environment.ts`.

## Seguridad

⚠️ **IMPORTANTE**: 
- NUNCA hagas commit del archivo `environment.ts`
- Este archivo está en `.gitignore` para proteger tus credenciales
- Solo comparte el archivo `environment.example.ts` como plantilla

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm start
```

El proyecto se abrirá en `http://localhost:4200`
