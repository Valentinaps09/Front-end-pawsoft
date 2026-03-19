import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth';

/**
 * roleGuard — Pawsoft
 *
 * Verifica que el usuario autenticado tenga el rol requerido por la ruta.
 *
 * Si el rol no coincide → redirige al dashboard propio del usuario.
 * NO redirige a /login porque el usuario SÍ tiene sesión activa —
 * simplemente no tiene permiso para esa ruta específica.
 *
 * Proyecto: Pawsoft — Universidad del Quindío — Software III
 * Autoras: Valentina Porras Salazar · Helen Xiomara Giraldo Libreros
 */
export const roleGuard = (route: ActivatedRouteSnapshot): boolean => {
  const router      = inject(Router);
  const authService = inject(AuthService);

  const allowedRoles: string[] = route.data?.['roles'] ?? [];

  try {
    const token = authService.getToken();

    // Sin token → sí va a login (no hay sesión)
    if (!token) {
      router.navigate(['/login'], { replaceUrl: true });
      return false;
    }

    const base64  = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    const userRole: string = payload['role'] ?? '';

    // Rol correcto → permite el acceso
    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    // Rol incorrecto → redirige al dashboard propio (NO a /login)
    router.navigate([getDashboardByRole(userRole)], { replaceUrl: true });
    return false;

  } catch (e) {
    // Token corrupto → limpia sesión y va a login
    console.error('roleGuard: error al decodificar el token', e);
    authService.logout();
    return false;
  }
};

/**
 * Devuelve la ruta del dashboard correspondiente al rol del usuario.
 * Si el rol es desconocido, va al dashboard de cliente como fallback.
 */
function getDashboardByRole(role: string): string {
  switch (role) {
    case 'ROLE_ADMIN':         return '/dashboard-admin';
    case 'ROLE_RECEPCIONISTA': return '/dashboard-rec';
    case 'ROLE_VETERINARIO':   return '/dashboard-vet';
    default:                   return '/dashboard-cliente';
  }
}
