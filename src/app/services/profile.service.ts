import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ProfileUpdateRequest {
  email:       string;
  phone:       string;
  newPassword?: string;
}

export interface VerifyAndSaveRequest {
  code:        string;
  email:       string;
  phone:       string;
  currentPassword?: string;
  newPassword?: string;
}

export interface ValidatePasswordRequest {
  currentPassword: string;
}

export interface ValidatePasswordResponse {
  valid: boolean;
  message?: string;
}

export interface ProfileResponse {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {

  private readonly base = `${environment.apiUrl}/api/profile`;

  constructor(private readonly http: HttpClient) {}

  /** Valida la contraseña actual del usuario */
  validateCurrentPassword(payload: ValidatePasswordRequest): Observable<ValidatePasswordResponse> {
    return this.http.post<ValidatePasswordResponse>(`${this.base}/validate-password`, payload);
  }

  /** Envía un código 2FA al correo actual del usuario autenticado */
  requestVerification(): Observable<ProfileResponse> {
    return this.http.post<ProfileResponse>(`${this.base}/request-verification`, {});
  }

  /** Valida el código y aplica los cambios de perfil */
  verifyAndSave(payload: VerifyAndSaveRequest): Observable<ProfileResponse> {
    return this.http.post<ProfileResponse>(`${this.base}/verify-and-save`, payload);
  }

  /** Obtiene los datos actuales del perfil */
  getProfile(): Observable<{ name: string; email: string; phone: string }> {
    return this.http.get<{ name: string; email: string; phone: string }>(`${this.base}/me`);
  }
}
