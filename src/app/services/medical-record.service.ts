import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RecepAppointmentResponse } from './appointment.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface AtencionActiva {
  appointmentId: number;
  petName: string;
  petSpecies: string;
  petBirthday: string | null;
  petSex: string;
  petPhotoUrl: string | null;
  ownerName: string;
  reason: string;
  appointmentTime: string;
  appointmentDate: string;
}

export interface Medicamento {
  nombre: string;
  dosisValor: string;
  dosisUnidad: string;
  via: string;
}

export interface VacunaControl {
  nombre: string;
  estado: 'aplicada_hoy' | 'vencida' | 'pendiente';
  aplicadaHoy: boolean;
}

export interface RegistroMedico {
  appointmentId: number;
  // Examen físico (interno)
  peso: number | null;
  temperatura: number | null;
  frecuenciaCardiaca: number | null;
  observacionesGenerales: string;
  // Diagnóstico (interno)
  diagnosticoPrincipal: string;
  diagnosticoSecundario: string;
  notasClinicas: string;
  // Tratamiento interno (procedimiento)
  medicamentos: Medicamento[];
  indicaciones: string;
  // Resumen para el cliente
  diagnosticoCliente: string;
  medicamentosRecetados: Medicamento[];
  indicacionesCliente: string;
  // Vacunas y controles
  vacunasAplicadas: VacunaControl[];
  proximoControlFecha: string;
  proximoControlMotivo: string;
}

export interface MedicalRecordResponse {
  id: number;
  appointmentId: number;
  appointmentDate: string;
  appointmentTime: string;
  appointmentReason: string;
  appointmentStatus: string;
  petId: number;
  petName: string;
  petSpecies: string;
  petBreed: string;
  petBirthDate: string;
  petSex: string;
  petPhotoUrl: string | null;
  ownerName: string;
  ownerEmail: string;
  vetName: string;
  peso: number | null;
  temperatura: number | null;
  frecuenciaCardiaca: number | null;
  observacionesGenerales: string;
  diagnosticoPrincipal: string;
  diagnosticoSecundario: string;
  notasClinicas: string;
  medicamentos: string;
  indicaciones: string;
  diagnosticoCliente: string;
  medicamentosRecetados: string;
  indicacionesCliente: string;
  vacunasAplicadas: string;
  proximoControlFecha: string | null;
  proximoControlMotivo: string;
  creadoEn: string;
  actualizadoEn: string | null;
}

// ── Claves de localStorage ────────────────────────────────────────────────────

const KEY_ATENCION = 'pawsoft_atencion_activa';
const draftKey = (id: number) => `medical_draft_${id}`;

// ── Servicio ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class MedicalRecordService {

  private readonly apiUrl = `${environment.apiUrl}/api/vet/medical-records`;

  /** Estado de la atención activa, restaurado desde localStorage al iniciar. */
  private readonly _atencionActiva$ = new BehaviorSubject<AtencionActiva | null>(
    this.restoreAtencion()
  );

  readonly atencionActiva$ = this._atencionActiva$.asObservable();

  constructor(private readonly http: HttpClient) {}

  // ── Estado activo ───────────────────────────────────────────────────────────

  iniciarAtencion(appointment: RecepAppointmentResponse): void {
    const activa: AtencionActiva = {
      appointmentId:   appointment.id,
      petName:         appointment.petName,
      petSpecies:      appointment.petSpecies,
      petBirthday:     appointment.petBirthday,
      petSex:          '',
      petPhotoUrl:     appointment.petPhotoUrl,
      ownerName:       appointment.clientName,
      reason:          appointment.reason,
      appointmentTime: appointment.time,
      appointmentDate: appointment.date,
    };
    localStorage.setItem(KEY_ATENCION, JSON.stringify(activa));
    this._atencionActiva$.next(activa);
  }

  cerrarAtencion(): void {
    localStorage.removeItem(KEY_ATENCION);
    this._atencionActiva$.next(null);
  }

  getAtencionActiva(): AtencionActiva | null {
    return this._atencionActiva$.getValue();
  }

  // ── Borrador ────────────────────────────────────────────────────────────────

  guardarBorrador(registro: Partial<RegistroMedico>): void {
    if (!registro.appointmentId) return;
    localStorage.setItem(draftKey(registro.appointmentId), JSON.stringify(registro));
  }

  obtenerBorrador(appointmentId: number): Partial<RegistroMedico> | null {
    const raw = localStorage.getItem(draftKey(appointmentId));
    return raw ? JSON.parse(raw) : null;
  }

  eliminarBorrador(appointmentId: number): void {
    localStorage.removeItem(draftKey(appointmentId));
  }

  // ── API ─────────────────────────────────────────────────────────────────────

  guardar(registro: RegistroMedico, cerrar: boolean): Observable<MedicalRecordResponse> {
    const payload = {
      appointmentId:          registro.appointmentId,
      peso:                   registro.peso,
      temperatura:            registro.temperatura,
      frecuenciaCardiaca:     registro.frecuenciaCardiaca,
      observacionesGenerales: registro.observacionesGenerales,
      diagnosticoPrincipal:   registro.diagnosticoPrincipal,
      diagnosticoSecundario:  registro.diagnosticoSecundario,
      notasClinicas:          registro.notasClinicas,
      medicamentos:           JSON.stringify(registro.medicamentos),
      indicaciones:           registro.indicaciones,
      vacunasAplicadas:       JSON.stringify(registro.vacunasAplicadas),
      proximoControlFecha:    registro.proximoControlFecha || null,
      proximoControlMotivo:   registro.proximoControlMotivo,
    };
    return this.http.post<MedicalRecordResponse>(
      `${this.apiUrl}?cerrar=${cerrar}`,
      payload,
      { headers: this.headers() }
    );
  }

  obtenerHistorial(): Observable<MedicalRecordResponse[]> {
    return this.http.get<MedicalRecordResponse[]>(this.apiUrl, { headers: this.headers() });
  }

  obtenerPorCita(appointmentId: number): Observable<MedicalRecordResponse> {
    return this.http.get<MedicalRecordResponse>(
      `${this.apiUrl}/appointment/${appointmentId}`,
      { headers: this.headers() }
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private restoreAtencion(): AtencionActiva | null {
    const raw = localStorage.getItem(KEY_ATENCION);
    return raw ? JSON.parse(raw) : null;
  }
}
