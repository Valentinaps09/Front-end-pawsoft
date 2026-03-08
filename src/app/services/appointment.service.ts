import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AppointmentRequest {
  petId: number;
  date: string;
  time: string;
  reason: string;
  vetId: number;
}

export interface AppointmentResponse {
  id: string;
  petName: string;
  petEmoji?: string;
  petPhotoUrl?: string;
  dateFormatted?: string;
  date?: string;
  time: string;
  reason: string;
  vetName: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

export interface RecepAppointmentResponse {
  id: number;
  date: string;
  time: string;
  reason: string;
  status: 'UPCOMING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  cancelReason: string | null;
  clientId: number;
  clientName: string;
  clientEmail: string;
  petId: number;
  petName: string;
  petSpecies: string;
  petPhotoUrl: string | null;
  petBreed: string | null;
  petBirthday: string | null;
  vetId: number;
  vetName: string;
  vetPhotoUrl: string | null;
  notes: string | null;
}

@Injectable({ providedIn: 'root' })
export class AppointmentService {

  private readonly baseUrl = `${environment.apiUrl}/api/cliente/appointments`;
  private readonly vetUrl  = `${environment.apiUrl}/api/vet/appointments`;

  constructor(private readonly http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getMyAppointments(): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(this.baseUrl, { headers: this.headers() });
  }

  // Cliente usa /api/cliente/appointments/slots
  getOccupiedSlots(vetId: number, date: string): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.baseUrl}/slots?vetId=${vetId}&date=${date}`,
      { headers: this.headers() }
    );
  }

  // Recepcionista usa /api/recepcionista/appointments/slots
  getOccupiedSlotsRecep(vetId: number, date: string): Observable<string[]> {
    return this.http.get<string[]>(
      `${environment.apiUrl}/api/recepcionista/appointments/slots?vetId=${vetId}&date=${date}`,
      { headers: this.headers() }
    );
  }

  createAppointment(data: AppointmentRequest): Observable<AppointmentResponse> {
    return this.http.post<AppointmentResponse>(this.baseUrl, data, { headers: this.headers() });
  }

  cancelAppointment(id: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/cancel`, {}, { headers: this.headers() });
  }

  getVetAppointments(): Observable<RecepAppointmentResponse[]> {
    return this.http.get<RecepAppointmentResponse[]>(this.vetUrl, { headers: this.headers() });
  }
}
