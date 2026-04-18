import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { RecepAppointmentResponse } from './appointment.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface AtencionActiva {
  appointmentId: number;
  petId: number;
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
  frecuencia?: string;  // Para medicamentos recetados
  duracion?: string;    // Para medicamentos recetados
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
  frecuenciaRespiratoria: number | null;
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
  // Archivos adjuntos
  fotosAdjuntas: string[];
  // Costos
  costoMedicamentos: number;
  costoTotal: number;
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
  petIsDeceased: boolean; // Indica si la mascota está fallecida
  ownerName: string;
  ownerEmail: string;
  vetName: string;
  peso: number | null;
  temperatura: number | null;
  frecuenciaCardiaca: number | null;
  frecuenciaRespiratoria: number | null;
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
  fotosAdjuntas: string;
  creadoEn: string;
  actualizadoEn: string | null;
  costoMedicamentos: number | null;
  costoTotal: number | null;
  precioServicioBase: number | null;
}

// ── Claves de localStorage ────────────────────────────────────────────────────

const KEY_ATENCION = 'pawsoft_atencion_activa';
const draftKey = (id: number) => `medical_draft_${id}`;

// ── Servicio ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class MedicalRecordService {

  private readonly apiUrl = `${environment.apiUrl}/api/vet/medical-records`;

  /** Estado de la atención activa, restaurado desde localStorage al iniciar. */
  private readonly _atencionActiva$ = new BehaviorSubject<AtencionActiva | null>(null);

  readonly atencionActiva$ = this._atencionActiva$.asObservable();

  constructor(private readonly http: HttpClient) {
    // Restaurar estado de manera robusta
    this.initializeState();
  }

  // ── Estado activo ───────────────────────────────────────────────────────────

  /**
   * Inicializa el estado de manera robusta, con retry logic
   */
  private initializeState(): void {
    try {
      const restored = this.restoreAtencion();
      this._atencionActiva$.next(restored);
      
      // Validar que el estado se propagó correctamente
      setTimeout(() => {
        if (restored && !this._atencionActiva$.getValue()) {
          console.warn('Estado no se propagó correctamente, reintentando...');
          this._atencionActiva$.next(restored);
        }
      }, 100);
    } catch (error) {
      console.error('Error al inicializar estado de atención:', error);
      this._atencionActiva$.next(null);
    }
  }

  /**
   * Sincroniza el estado desde localStorage cuando sea necesario
   */
  syncStateFromStorage(): void {
    const restored = this.restoreAtencion();
    const current = this._atencionActiva$.getValue();
    
    // Solo actualizar si hay diferencias
    if (JSON.stringify(restored) !== JSON.stringify(current)) {
      this._atencionActiva$.next(restored);
    }
  }

  iniciarAtencion(appointment: RecepAppointmentResponse): void {
    const activa: AtencionActiva = {
      appointmentId:   appointment.id,
      petId:           appointment.petId,
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

    // Limpiar borradores de otras citas que no sean la actual
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('medical_draft_') && key !== draftKey(appointment.id)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

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
    // Convertir strings a números y normalizar formato
    const parseNumber = (val: any): number | null => {
      if (val === null || val === undefined || val === '') return null;
      const str = String(val).replace(',', '.').trim();
      const num = parseFloat(str);
      return isNaN(num) ? null : num;
    };

    const payload = {
      appointmentId:          registro.appointmentId,
      peso:                   parseNumber(registro.peso),
      temperatura:            parseNumber(registro.temperatura),
      frecuenciaCardiaca:     parseNumber(registro.frecuenciaCardiaca),
      frecuenciaRespiratoria: parseNumber(registro.frecuenciaRespiratoria),
      observacionesGenerales: registro.observacionesGenerales?.trim() || null,
      diagnosticoPrincipal:   registro.diagnosticoPrincipal?.trim() || null,
      diagnosticoSecundario:  registro.diagnosticoSecundario?.trim() || null,
      notasClinicas:          registro.notasClinicas?.trim() || null,
      medicamentos:           JSON.stringify(registro.medicamentos),
      indicaciones:           registro.indicaciones?.trim() || null,
      diagnosticoCliente:     registro.diagnosticoCliente?.trim() || null,
      medicamentosRecetados:  JSON.stringify(registro.medicamentosRecetados),
      indicacionesCliente:    registro.indicacionesCliente?.trim() || null,
      vacunasAplicadas:       JSON.stringify(registro.vacunasAplicadas),
      proximoControlFecha:    registro.proximoControlFecha?.trim() || null,
      proximoControlMotivo:   registro.proximoControlMotivo?.trim() || null,
      fotosAdjuntas:          JSON.stringify(registro.fotosAdjuntas || []),
      costoMedicamentos:      registro.costoMedicamentos ?? 0,
      costoTotal:             registro.costoTotal ?? 0,
    };
    return this.http.post<MedicalRecordResponse>(
      `${this.apiUrl}?cerrar=${cerrar}`,
      payload,
      { headers: this.headers() }
    );
  }

  obtenerHistorial(): Observable<MedicalRecordResponse[]> {
    return this.http.get<MedicalRecordResponse[]>(`${this.apiUrl}/all`, { headers: this.headers() });
  }

  obtenerHistorialPorMascota(petId: number): Observable<MedicalRecordResponse[]> {
    return this.http.get<MedicalRecordResponse[]>(`${this.apiUrl}/pet/${petId}`, { headers: this.headers() });
  }

  obtenerPorCita(appointmentId: number): Observable<MedicalRecordResponse> {
    return this.http.get<MedicalRecordResponse>(
      `${this.apiUrl}/appointment/${appointmentId}`,
      { headers: this.headers() }
    );
  }

  obtenerResumenCliente(appointmentId: number): Observable<MedicalRecordResponse> {
    return this.http.get<MedicalRecordResponse>(
      `${environment.apiUrl}/api/cliente/medical-records/appointment/${appointmentId}`,
      { headers: this.headers() }
    );
  }

  obtenerRegistrosCliente(): Observable<MedicalRecordResponse[]> {
    return this.http.get<MedicalRecordResponse[]>(
      `${environment.apiUrl}/api/cliente/medical-records`,
      { headers: this.headers() }
    );
  }

  obtenerCatalogoMedicamentos(): Observable<{ id: number; name: string; price: number; unit: string }[]> {
    return this.http.get<{ id: number; name: string; price: number; unit: string }[]>(
      `${environment.apiUrl}/api/vet/medical-records/medications`,
      { headers: this.headers() }
    );
  }

  obtenerPrecioServicio(serviceType: string): Observable<number> {
    return this.http.get<{ serviceType: string; price: number }>(
      `${environment.apiUrl}/api/recepcionista/payments/price?serviceType=${encodeURIComponent(serviceType)}`,
      { headers: this.headers() }
    ).pipe(
      map((res: any) => res?.price ?? 0),
      catchError(() => of(0))
    );
  }

  uploadPhoto(file: File): Observable<{ secure_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', environment.cloudinary.uploadPreset);

    // Para PDFs, intentar subirlos como 'auto' en lugar de 'raw'
    // Esto evita el problema de "untrusted customer" en cuentas nuevas
    let resourceType: string;
    if (file.type === 'application/pdf') {
      resourceType = 'auto'; // Cloudinary detecta automáticamente el tipo
      formData.append('resource_type', 'auto');
    } else {
      resourceType = 'image';
    }

    return this.http.post<{ secure_url: string }>(
      `https://api.cloudinary.com/v1_1/${environment.cloudinary.cloudName}/${resourceType}/upload`,
      formData
    ).pipe(
      catchError((error) => {
        console.error('Error subiendo archivo a Cloudinary:', error);
        // Si falla, mostrar mensaje más claro
        if (error.error?.error?.message?.includes('untrusted')) {
          throw new Error('Tu cuenta de Cloudinary necesita verificación. Por favor verifica tu email y agrega un método de pago en cloudinary.com');
        }
        throw error;
      })
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private restoreAtencion(): AtencionActiva | null {
    try {
      const raw = localStorage.getItem(KEY_ATENCION);
      if (!raw) return null;
      
      const parsed = JSON.parse(raw);
      
      // Validar que el objeto tiene las propiedades necesarias
      if (parsed && typeof parsed === 'object' && parsed.appointmentId) {
        return parsed as AtencionActiva;
      }
      
      return null;
    } catch (error) {
      console.error('Error al restaurar atención desde localStorage:', error);
      // Limpiar localStorage corrupto
      localStorage.removeItem(KEY_ATENCION);
      return null;
    }
  }
}
