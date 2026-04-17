import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Interfaz para la respuesta de ajustes de pagos
 * 
 * Proyecto: Pawsoft
 * Universidad del Quindío
 * Materia: Software III
 * 
 * Autoras:
 * - Valentina Porras Salazar
 * - Helen Xiomara Giraldo Libreros
 * 
 * Profesor:
 * Raúl Yulbraynner Rivera Gálvez
 */
export interface PaymentAdjustmentResponse {
  id: number;
  originalAmount: number;
  adjustedAmount: number;
  difference: number;
  reason: string;
  adjustedBy: string;
  adjustedByName: string;
  adjustedAt: string;
}

/**
 * Servicio para gestionar auditoría de ajustes de pagos.
 * 
 * Responsabilidades:
 * - Obtener historial de ajustes de pagos realizados por administradores
 * - Proporcionar información de auditoría para el panel administrativo
 * 
 * Proyecto: Pawsoft
 * Universidad del Quindío
 * Materia: Software III
 * 
 * Autoras:
 * - Valentina Porras Salazar
 * - Helen Xiomara Giraldo Libreros
 * 
 * Profesor:
 * Raúl Yulbraynner Rivera Gálvez
 */
@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private apiUrl = `${environment.apiUrl}/api/admin/payments`;

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getAllAdjustments(): Observable<PaymentAdjustmentResponse[]> {
    return this.http.get<PaymentAdjustmentResponse[]>(`${this.apiUrl}/adjustments`, { headers: this.headers() });
  }
}
