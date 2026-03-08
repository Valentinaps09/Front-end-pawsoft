import { inject } from '@angular/core';
import { Router } from '@angular/router';

/**
 * authGuard — Pawsoft
 *
 * Protege rutas que requieren autenticación.
 * Verifica si el token existe en localStorage.
 *
 * El bloqueo del botón "atrás" lo maneja AppComponent con el listener
 * de popstate — este guard es la segunda línea de defensa para accesos
 * directos por URL.
 */
export const authGuard = (): boolean => {
  const router = inject(Router);
  const token  = localStorage.getItem('token');

  if (!token) {
    const navigation = router.getCurrentNavigation();
    const reason     = navigation?.extras?.state?.['reason'];

    router.navigate(['/login'], {
      replaceUrl: true,
      ...(reason ? { state: { reason } } : {}),
    });

    return false;
  }

  return true;
};
