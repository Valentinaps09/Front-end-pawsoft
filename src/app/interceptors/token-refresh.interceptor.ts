import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth';

/**
 * Interceptor HTTP que renueva automáticamente el JWT antes de su expiración.
 * 
 * Estrategia de renovación:
 * 1. Renovación proactiva: Si el JWT expira en menos de 5 minutos, lo renueva antes de hacer la petición
 * 2. Renovación reactiva: Si recibe un 403, intenta renovar el JWT con el refresh token
 * 
 * Si la renovación falla, cierra la sesión y redirige al login.
 */
let isRefreshing = false;

export const tokenRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // No interceptar rutas de autenticación
  if (req.url.includes('/auth/')) {
    return next(req);
  }

  const token = authService.getToken();
  const refreshToken = authService.getRefreshToken();
  
  if (!token || !refreshToken) {
    return next(req);
  }

  // Verificar si el token expira en menos de 5 minutos
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    // Si el token expira en menos de 5 minutos, refrescarlo
    if (exp - now < fiveMinutes && !isRefreshing) {
      isRefreshing = true;
      
      return authService.refreshToken().pipe(
        switchMap((response) => {
          isRefreshing = false;
          authService.guardarSesion(response.token, response.role, response.email, response.refreshToken);
          
          const clonedReq = req.clone({
            setHeaders: { Authorization: `Bearer ${response.token}` }
          });
          return next(clonedReq);
        }),
        catchError((error) => {
          isRefreshing = false;
          localStorage.clear();
          router.navigate(['/login'], { queryParams: { reason: 'session-expired' } });
          return throwError(() => error);
        })
      );
    }
  } catch (e) {
    // Error al decodificar el token
  }

  // Manejar errores 403 (token expirado)
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 403 && !isRefreshing && refreshToken) {
        // Solo intentar refresh si el error viene con un mensaje de token expirado
        // No cerrar sesión por errores de permisos (RBAC)
        const errorMsg = error.error?.message || error.error?.error || '';
        const isTokenExpired = errorMsg.toLowerCase().includes('expired') ||
                               errorMsg.toLowerCase().includes('jwt') ||
                               errorMsg.toLowerCase().includes('token');

        if (!isTokenExpired) {
          // Es un error de permisos (RBAC), no de token — no cerrar sesión
          return throwError(() => error);
        }

        isRefreshing = true;
        
        return authService.refreshToken().pipe(
          switchMap((response) => {
            isRefreshing = false;
            authService.guardarSesion(response.token, response.role, response.email, response.refreshToken);
            
            const clonedReq = req.clone({
              setHeaders: { Authorization: `Bearer ${response.token}` }
            });
            return next(clonedReq);
          }),
          catchError((refreshError) => {
            isRefreshing = false;
            localStorage.clear();
            router.navigate(['/login'], { queryParams: { reason: 'session-expired' } });
            return throwError(() => refreshError);
          })
        );
      }
      
      return throwError(() => error);
    })
  );
};
