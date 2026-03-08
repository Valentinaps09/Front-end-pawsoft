// INSTRUCCIONES PARA PRODUCCIÓN:
// 1. Copia este archivo como 'environment.prod.ts' en el mismo directorio
// 2. Reemplaza los valores de ejemplo con tus credenciales de producción
// 3. Ajusta la apiUrl según tu servidor de producción
// 4. NUNCA hagas commit del archivo environment.prod.ts (está en .gitignore)

export const environment = {
  production: true,
  apiUrl: 'https://tu-dominio-backend.com',  // URL de tu backend en producción
  cloudinary: {
    cloudName: 'TU_CLOUD_NAME_AQUI',      // Tu cloudName de Cloudinary
    uploadPreset: 'TU_UPLOAD_PRESET_AQUI' // Tu uploadPreset de Cloudinary
  }
};
