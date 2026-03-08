import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ServicePriceItem {
  id:          number;
  serviceType: string;
  displayName: string;
  price:       number;
  description: string;
  active:      boolean;
}

export interface ServicePriceRequest {
  serviceType: string;
  displayName: string;
  price:       number;
  description: string;
  active:      boolean;
}

/**
 * Servicio Angular para la gestión de precios/servicios desde el panel Admin.
 * Usa los endpoints de AdminPaymentController:
 *   GET    /api/admin/payments/prices
 *   POST   /api/admin/payments/prices
 *   DELETE /api/admin/payments/prices/{id}
 *
 * Proyecto: Pawsoft — Software III
 */
@Injectable({ providedIn: 'root' })
export class AdminPaymentService {

  private readonly base = `${environment.apiUrl}/api/admin/payments`;

  constructor(private readonly http: HttpClient) {}

  /** Lista todos los precios configurados (activos e inactivos). */
  getAllPrices(): Observable<ServicePriceItem[]> {
    return this.http.get<ServicePriceItem[]>(`${this.base}/prices`);
  }

  /**
   * Crea o actualiza un precio de servicio.
   * El backend decide crear o actualizar según si ya existe el serviceType.
   */
  upsertPrice(req: ServicePriceRequest): Observable<ServicePriceItem> {
    return this.http.post<ServicePriceItem>(`${this.base}/prices`, req);
  }

  /** Elimina un precio por ID. */
  deletePrice(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/prices/${id}`);
  }
}
