import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HospitalizationDTO } from './hospitalization.service';

/**
 * Servicio para que el administrador consulte hospitalizaciones (solo lectura).
 *
 * Proyecto: Pawsoft
 * Universidad del Quindío — Ingeniería de Sistemas y Computación — Software III
 * Autoras: Valentina Porras Salazar · Helen Xiomara Giraldo Libreros
 * Profesor: Raúl Yulbraynner Rivera Gálvez
 */
@Injectable({ providedIn: 'root' })
export class AdminHospitalizationService {

  private readonly baseUrl = `${environment.apiUrl}/api/admin/hospitalizations`;

  constructor(private readonly http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  /** Obtiene todas las hospitalizaciones del sistema */
  getAll(): Observable<HospitalizationDTO[]> {
    return this.http.get<HospitalizationDTO[]>(this.baseUrl, { headers: this.headers() });
  }

  /** Obtiene el detalle de una hospitalización */
  getById(id: number): Observable<HospitalizationDTO> {
    return this.http.get<HospitalizationDTO>(`${this.baseUrl}/${id}`, { headers: this.headers() });
  }
}
