
export const environment = {
  production: false,
  apiUrl: `http://${window.location.hostname}:8080`,
  cloudinary: {
    cloudName: 'TU_CLOUD_NAME',
    uploadPreset: 'TU_UPLOAD_PRESET'
  }
};
