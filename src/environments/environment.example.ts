// INSTRUCCIONES:
// 1. Copia este archivo como 'environment.ts' en el mismo directorio
// 2. Reemplaza los valores de ejemplo con tus credenciales reales
// 3. NUNCA hagas commit del archivo environment.ts (está en .gitignore)

export const environment = {
  production: false,
  apiUrl: `http://${window.location.hostname}:8080`,
  cloudinary: {
    cloudName: 'TU_CLOUD_NAME_AQUI',      // Reemplaza con tu cloudName de Cloudinary
    uploadPreset: 'TU_UPLOAD_PRESET_AQUI' // Reemplaza con tu uploadPreset de Cloudinary
  }
};
