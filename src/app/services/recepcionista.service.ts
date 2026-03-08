import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type AppointmentStatus =
  'UPCOMING' | 'CONFIRMED' | 'NO_SHOW' | 'CANCELLED' | 'COMPLETED';

export interface RecepAppointment {
  id: number;
  date: string;       // 'YYYY-MM-DD'
  time: string;       // 'HH:mm'
  reason: string;
  status: AppointmentStatus;
  cancelReason?: string;
  clientId: number;
  clientName: string;
  clientEmail: string;
  petId: number;
  petName: string;
  petSpecies: string;
  petPhotoUrl?: string;
  vetId: number;
  vetName: string;
  vetPhotoUrl?: string;
  notes?: string;
}

export interface RecepCreateRequest {
  clientEmail: string;
  petId: number;
  vetId: number;
  date: string;
  time: string;
  reason: string;
  notes?: string;
}

export interface RecepUpdateRequest {
  date: string;
  time: string;
  vetId: number;
  reason?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class RecepcionistaService {

  private readonly base = 'http://localhost:8080/api/recepcionista/appointments';

  constructor(private readonly http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  /** Lista todas las citas */
  getAll(): Observable<RecepAppointment[]> {
    return this.http.get<RecepAppointment[]>(this.base, { headers: this.headers() });
  }

  /** Crea una cita desde el panel del recepcionista */
  create(req: RecepCreateRequest): Observable<RecepAppointment> {
    return this.http.post<RecepAppointment>(this.base, req, { headers: this.headers() });
  }

  /** Edita una cita existente */
  update(id: number, req: RecepUpdateRequest): Observable<RecepAppointment> {
    return this.http.put<RecepAppointment>(`${this.base}/${id}`, req, { headers: this.headers() });
  }

  /** Confirma una cita (UPCOMING → CONFIRMED) */
  confirm(id: number): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/confirm`, {}, { headers: this.headers() });
  }

  /** Marca inasistencia (CONFIRMED → NO_SHOW) */
  noShow(id: number): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/no-show`, {}, { headers: this.headers() });
  }

  /** Cancela una cita con motivo opcional */
  cancel(id: number, cancelReason?: string): Observable<void> {
    return this.http.put<void>(
      `${this.base}/${id}/cancel`,
      { cancelReason: cancelReason || null },
      { headers: this.headers() }
    );
  }
}
