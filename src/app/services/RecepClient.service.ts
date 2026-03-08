import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RecepClient {
  id:        number;
  name:      string;
  email:     string;
  role:      string;
  enabled:   boolean;
  photoUrl?: string;
  phone?:    string;
}

export interface RecepPet {
  id:         number;
  name:       string;
  species:    string;
  breed:      string;
  sex:        string;
  birthDate:  string;
  photoUrl?:  string;
  ownerEmail: string;
}

// ── Sin campo password — se genera en el backend y se envía por correo
export interface CreateClientRequest {
  name:   string;
  email:  string;
  phone?: string;
}

export interface UpdateClientRequest {
  nombre:    string;
  email?:    string;
  telefono?: string;
}

export interface RecepPetRequest {
  name:       string;
  species:    string;
  breed:      string;
  sex:        string;
  birthDate:  string;
  photoUrl?:  string;
  ownerEmail: string;
}

@Injectable({ providedIn: 'root' })
export class RecepClientService {

  private readonly base = `${environment.apiUrl}/api/recepcionista`;

  constructor(private readonly http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getClients(): Observable<RecepClient[]> {
    return this.http.get<RecepClient[]>(
      `${this.base}/clients`,
      { headers: this.headers() }
    );
  }

  createClient(req: CreateClientRequest): Observable<RecepClient> {
    return this.http.post<RecepClient>(
      `${this.base}/clients`,
      req,
      { headers: this.headers() }
    );
  }

  updateClient(id: number, req: UpdateClientRequest): Observable<RecepClient> {
    return this.http.put<RecepClient>(
      `${this.base}/clients/${id}`,
      req,
      { headers: this.headers() }
    );
  }

  toggleClient(id: number): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/clients/${id}/toggle`,
      {},
      { headers: this.headers() }
    );
  }

  // ── NUEVO: eliminar cliente
  deleteClient(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/clients/${id}`,
      { headers: this.headers() }
    );
  }

  getPetsByClient(email: string): Observable<RecepPet[]> {
    return this.http.get<RecepPet[]>(
      `${this.base}/clients/${encodeURIComponent(email)}/pets`,
      { headers: this.headers() }
    );
  }

  createPet(req: RecepPetRequest): Observable<RecepPet> {
    return this.http.post<RecepPet>(
      `${this.base}/pets`,
      req,
      { headers: this.headers() }
    );
  }

  updatePet(id: number, req: RecepPetRequest): Observable<RecepPet> {
    return this.http.put<RecepPet>(
      `${this.base}/pets/${id}`,
      req,
      { headers: this.headers() }
    );
  }

  deletePet(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/pets/${id}`,
      { headers: this.headers() }
    );
  }
}
