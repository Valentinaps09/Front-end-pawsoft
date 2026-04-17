import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Interfaz para notas de evolución en hospitalizaciones
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
export interface HospitalizationNote {
  id: number;
  hospitalizationId: number;
  vetId: number;
  vetName: string;
  note: string;
  createdAt: string;
}

/**
 * Interfaz para datos de hospitalización
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
export interface HospitalizationDTO {
  id: number;
  petId: number;
  petName: string;
  petSpecies?: string;
  ownerEmail?: string;
  vetId: number;
  vetName: string;
  appointmentId: number | null;
  status: 'ACTIVE' | 'DISCHARGED' | 'DECEASED';
  admissionDate: string;
  dischargeDate: string | null;
  reason: string;
  initialObservations: string | null;
  hourlyRate: number;
  causeOfDeath: string | null;
  createdAt: string;
  totalHours: number | null;
  totalCost: number | null;
  notes: HospitalizationNote[];
}

/**
 * Interfaz para solicitud de creación de hospitalización
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
export interface CreateHospitalizationRequest {
  petId: number;
  appointmentId?: number | null;
  reason: string;
  initialObservations?: string;
  hourlyRate: number;
}

/**
 * Interfaz para resultado de búsqueda de mascotas
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
export interface PetResult {
  id: number;
  name: string;
  species: string;
  breed: string | null;
  birthDate: string | null;
  ownerEmail: string;
  photoUrl: string | null;
}

/**
 * Servicio para gestionar hospitalizaciones de mascotas.
 * 
 * Responsabilidades:
 * - Crear y gestionar registros de hospitalización
 * - Registrar notas de evolución durante la hospitalización
 * - Dar de alta o registrar fallecimiento de mascotas
 * - Buscar mascotas para crear hospitalizaciones
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
@Injectable({ providedIn: 'root' })
export class HospitalizationService {

  private readonly baseUrl = `${environment.apiUrl}/api/vet/hospitalizations`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Obtiene headers con token de autenticación
   * @returns HttpHeaders con Authorization
   */
  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  /**
   * Obtiene todas las hospitalizaciones activas
   * @returns Observable con lista de hospitalizaciones activas
   */
  getActive(): Observable<HospitalizationDTO[]> {
    return this.http.get<HospitalizationDTO[]>(`${this.baseUrl}/active`, { headers: this.headers() });
  }

  /**
   * Obtiene todas las hospitalizaciones (activas, dadas de alta y fallecidas)
   * @returns Observable con lista de todas las hospitalizaciones
   */
  getAll(): Observable<HospitalizationDTO[]> {
    return this.http.get<HospitalizationDTO[]>(this.baseUrl, { headers: this.headers() });
  }

  /**
   * Obtiene una hospitalización por ID
   * @param id ID de la hospitalización
   * @returns Observable con datos de la hospitalización
   */
  getById(id: number): Observable<HospitalizationDTO> {
    return this.http.get<HospitalizationDTO>(`${this.baseUrl}/${id}`, { headers: this.headers() });
  }

  /**
   * Crea una nueva hospitalización
   * @param data Datos de la nueva hospitalización
   * @returns Observable con la hospitalización creada
   */
  create(data: CreateHospitalizationRequest): Observable<HospitalizationDTO> {
    return this.http.post<HospitalizationDTO>(this.baseUrl, data, { headers: this.headers() });
  }

  /**
   * Da de alta una mascota de la hospitalización
   * @param id ID de la hospitalización
   * @returns Observable con la hospitalización actualizada
   */
  discharge(id: number): Observable<HospitalizationDTO> {
    return this.http.put<HospitalizationDTO>(`${this.baseUrl}/${id}/discharge`, {}, { headers: this.headers() });
  }

  /**
   * Registra el fallecimiento de una mascota en hospitalización
   * @param id ID de la hospitalización
   * @param causeOfDeath Causa del fallecimiento
   * @returns Observable con la hospitalización actualizada
   */
  recordDeceased(id: number, causeOfDeath: string): Observable<HospitalizationDTO> {
    return this.http.put<HospitalizationDTO>(`${this.baseUrl}/${id}/deceased`, { causeOfDeath }, { headers: this.headers() });
  }

  /**
   * Agrega una nota de evolución a la hospitalización
   * @param id ID de la hospitalización
   * @param note Contenido de la nota
   * @returns Observable con la nota creada
   */
  addNote(id: number, note: string): Observable<HospitalizationNote> {
    return this.http.post<HospitalizationNote>(`${this.baseUrl}/${id}/notes`, { note }, { headers: this.headers() });
  }

  /**
   * Busca mascotas por nombre
   * @param name Nombre de la mascota a buscar
   * @returns Observable con lista de mascotas encontradas
   */
  searchPets(name: string): Observable<PetResult[]> {
    return this.http.get<PetResult[]>(
      `${environment.apiUrl}/api/vet/appointments/pets/search?name=${encodeURIComponent(name)}`,
      { headers: this.headers() }
    );
  }
}
