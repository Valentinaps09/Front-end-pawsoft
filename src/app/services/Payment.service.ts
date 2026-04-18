import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/* ══════════════════════════════════════════════════════════
   INTERFACES — reflejan los DTOs del backend
══════════════════════════════════════════════════════════ */

export interface ServicePrice {
  id:          number;
  serviceType: string;
  displayName: string;
  price:       number;
  description: string;
  active:      boolean;
}

export interface PaymentAdjustmentDetail {
  id:              number;
  originalAmount:  number;
  adjustedAmount:  number;
  difference:      number;
  reason:          string;
  adjustedBy:      string;
  adjustedByName:  string;
  adjustedAt:      string;
}

export interface PaymentResponse {
  id:              number;
  appointmentId:   number;
  clientName:      string;
  clientEmail:     string;
  petName:         string;
  vetName:         string;
  appointmentDate: string;
  appointmentTime: string;
  concept:         string;
  baseAmount:      number;
  amount:          number;
  status:          'PENDING' | 'PAID';
  paymentDate:     string | null;
  receivedBy:      string;
  receivedByName?: string;
  notes:           string | null;
  createdAt:       string;
  adjustments?:    PaymentAdjustmentDetail[];
}

export interface PaymentRequest {
  appointmentId:   number;
  clientName:      string;
  clientEmail:     string;
  petName:         string;
  vetName:         string;
  appointmentDate: string;
  appointmentTime: string;
  concept:         string;
  baseAmount:      number;
  amount:          number;
  notes?:          string;
}

export interface ServicePriceRequest {
  serviceType:  string;
  displayName:  string;
  price:        number;
  description?: string;
  active:       boolean;
}

export interface PaymentStats {
  totalPaid:                    number;
  totalPending:                 number;
  revenueToday:                 number;
  revenueThisWeek:              number;
  revenueThisMonth:             number;
  revenueAllTime:               number;
  revenueByConceptThisMonth:    Record<string, number>;
  recentPayments:               PaymentResponse[];
}

/* ══════════════════════════════════════════════════════════
   SERVICIO
══════════════════════════════════════════════════════════ */

@Injectable({ providedIn: 'root' })
export class PaymentService {

  private readonly clienteBase = `${environment.apiUrl}/api/cliente/payments`;
  private readonly recepBase   = `${environment.apiUrl}/api/recepcionista/payments`;
  private readonly adminBase   = `${environment.apiUrl}/api/admin/payments`;

  constructor(private readonly http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ── Cliente ─────────────────────────────────────────────────────────────────

  /**
   * Historial de pagos del cliente autenticado.
   * Llama: GET /api/cliente/payments/my
   *
   * El backend extrae el email del JWT — no hace falta pasarlo como parámetro.
   */
  getMyPayments(): Observable<PaymentResponse[]> {
    return this.http.get<PaymentResponse[]>(
      `${this.clienteBase}/my`,
      { headers: this.headers() }
    );
  }

  /**
   * Lista de servicios activos con precio base (para mostrar precio referencial).
   * Llama: GET /api/cliente/payments/prices
   *
   * Es solo lectura — no expone lógica de admin ni recepcionista.
   */
  getActivePricesCliente(): Observable<ServicePrice[]> {
    return this.http.get<ServicePrice[]>(
      `${this.clienteBase}/prices`,
      { headers: this.headers() }
    );
  }

  // ── Recepcionista ────────────────────────────────────────────────────────────

  /** Lista servicios activos con precio base */
  getActivePrices(): Observable<ServicePrice[]> {
    return this.http.get<ServicePrice[]>(
      `${this.recepBase}/prices`,
      { headers: this.headers() }
    );
  }

  /** Precio base de un servicio concreto */
  getPriceByService(serviceType: string): Observable<ServicePrice> {
    return this.http.get<ServicePrice>(
      `${this.recepBase}/price`,
      { headers: this.headers(), params: { serviceType } }
    );
  }

  /** Registra un pago (PENDING) */
  createPayment(req: PaymentRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(
      this.recepBase,
      req,
      { headers: this.headers() }
    );
  }

  /** Confirma el cobro en efectivo → PAID */
  markAsPaid(paymentId: number): Observable<PaymentResponse> {
    return this.http.put<PaymentResponse>(
      `${this.recepBase}/${paymentId}/pay`,
      {},
      { headers: this.headers() }
    );
  }

  /** Consulta el pago de una cita */
  getByAppointment(appointmentId: number): Observable<PaymentResponse> {
    return this.http.get<PaymentResponse>(
      `${this.recepBase}/appointment/${appointmentId}`,
      { headers: this.headers() }
    );
  }

  /** Lista todos los pagos (vista recepcionista) */
  getAllPayments(): Observable<PaymentResponse[]> {
    return this.http.get<PaymentResponse[]>(
      this.recepBase,
      { headers: this.headers() }
    );
  }

  // ── Admin ────────────────────────────────────────────────────────────────────

  /** Estadísticas financieras completas */
  getStats(): Observable<PaymentStats> {
    return this.http.get<PaymentStats>(
      `${this.adminBase}/stats`,
      { headers: this.headers() }
    );
  }

  /** Historial de pagos de un cliente específico (por email) */
  getByClient(email: string): Observable<PaymentResponse[]> {
    return this.http.get<PaymentResponse[]>(
      `${this.adminBase}/client/${encodeURIComponent(email)}`,
      { headers: this.headers() }
    );
  }

  /** Revierte un pago PAID → PENDING */
  revertToPending(paymentId: number): Observable<PaymentResponse> {
    return this.http.put<PaymentResponse>(
      `${this.adminBase}/${paymentId}/revert`,
      {},
      { headers: this.headers() }
    );
  }

  /** Ajusta el monto de un pago */
  adjustPayment(paymentId: number, adjustment: { adjustedAmount: number; reason: string }): Observable<PaymentResponse> {
    return this.http.put<PaymentResponse>(
      `${this.adminBase}/${paymentId}/adjust`,
      adjustment,
      { headers: this.headers() }
    );
  }

  /** Lista todos los precios configurados (admin) */
  getAllPrices(): Observable<ServicePrice[]> {
    return this.http.get<ServicePrice[]>(
      `${this.adminBase}/prices`,
      { headers: this.headers() }
    );
  }

  /** Crea o actualiza un precio de servicio */
  upsertPrice(req: ServicePriceRequest): Observable<ServicePrice> {
    return this.http.post<ServicePrice>(
      `${this.adminBase}/prices`,
      req,
      { headers: this.headers() }
    );
  }

  /** Elimina un precio de servicio */
  deletePrice(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.adminBase}/prices/${id}`,
      { headers: this.headers() }
    );
  }
}
