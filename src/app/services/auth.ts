import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { InactivityService } from './inactivity.service';

export interface LoginResponse {
  token: string;
  role: string;
  email: string;
  message: string;
  mustChangePassword: boolean;
}

/**
 * Servicio de autenticación del cliente Angular — Pawsoft.
 *
 * Gestiona:
 * - Comunicación con los endpoints REST de autenticación del backend.
 * - Almacenamiento y lectura del token/rol/email en localStorage.
 * - Inicio y cierre del monitoreo de inactividad (InactivityService).
 *
 * Proyecto: Pawsoft — Universidad del Quindío — Software III
 * Autoras: Valentina Porras Salazar · Helen Xiomara Giraldo Libreros
 */
@Injectable({ providedIn: 'root' })
export class AuthService {

  private http              = inject(HttpClient);
  private router            = inject(Router);
  private inactivityService = inject(InactivityService);

  private readonly apiUrl = environment.apiUrl;

  // ── Registro ────────────────────────────────────────────────────────────────

  register(
    name: string,
    email: string,
    password: string,
    phone?: string,
    recaptchaToken?: string,
  ): Observable<unknown> {
    return this.http.post(
      `${this.apiUrl}/auth/register`,
      { name, email, password, phone, recaptchaToken },
    );
  }

  // ── Login (fase 1) ──────────────────────────────────────────────────────────

  login(
    email: string,
    password: string,
    recaptchaToken: string,
  ): Observable<unknown> {
    return this.http.post(
      `${this.apiUrl}/auth/login`,
      { email, password, recaptchaToken },
    );
  }

  // ── Verificación 2FA (fase 2) ───────────────────────────────────────────────

  verify2FA(email: string, code: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/auth/verify-2fa?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`,
      {},
    ).pipe(shareReplay(1));
  }

  // ── Reenvío de código 2FA ───────────────────────────────────────────────────

  resend2FA(email: string): Observable<unknown> {
    return this.http.post(
      `${this.apiUrl}/auth/resend-2fa?email=${encodeURIComponent(email)}`,
      {},
    );
  }

  // ── Reenvío de verificación de cuenta ──────────────────────────────────────

  /**
   * Solicita que el backend reenvíe el correo de verificación de cuenta.
   * Se usa desde la pantalla de "verificación pendiente" en el registro.
   *
   * @param email correo del usuario recién registrado
   */
  resendVerificationEmail(email: string): Observable<unknown> {
    return this.http.post(
      `${this.apiUrl}/auth/resend-verification?email=${encodeURIComponent(email)}`,
      {},
    );
  }

  // ── Recuperación de contraseña ──────────────────────────────────────────────

  requestPasswordReset(email: string): Observable<unknown> {
    return this.http.post(
      `${this.apiUrl}/auth/password-reset/request`,
      { email },
    );
  }

  resetPassword(token: string, newPassword: string): Observable<unknown> {
    return this.http.post(
      `${this.apiUrl}/auth/password-reset/confirm`,
      { token, newPassword },
    );
  }

  // ── Cambio de contraseña en primer acceso ───────────────────────────────────

  changePasswordFirst(email: string, newPassword: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/auth/change-password-first`,
      { email, newPassword },
    );
  }

  // ── Gestión de sesión ───────────────────────────────────────────────────────

  guardarSesion(token: string, rol: string, email: string): void {
    localStorage.setItem('token', token);
    localStorage.setItem('rol', rol);
    localStorage.setItem('email', email.toLowerCase());
    this.inactivityService.startWatching();
  }

  logout(): void {
    this.inactivityService.stopWatching();
    localStorage.clear();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  // ── Getters de sesión ───────────────────────────────────────────────────────

  getToken(): string | null  { return localStorage.getItem('token'); }
  getRol():   string | null  { return localStorage.getItem('rol');   }
  getEmail(): string | null  { return localStorage.getItem('email'); }
}
