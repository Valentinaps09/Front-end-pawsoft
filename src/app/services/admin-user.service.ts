import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  photoUrl?: string;
  enabled: boolean;
}

export interface StaffCreateRequest {
  nombre: string;
  email: string;
  role: string;
  photoUrl?: string;
}

export interface AdminClient {
  id: string;
  name: string;
  email: string;
  role: string;
  enabled: boolean;
  photoUrl?: string;
}

export interface AdminPet {
  id: string;
  name: string;
  species: string;
  breed: string;
  sex: string;
  birthDate: string;
  photoUrl?: string;
  ownerName: string;
  ownerEmail: string;
  isDeceased?: boolean;      // Indica si la mascota está fallecida
  isHospitalized?: boolean;  // Indica si la mascota está hospitalizada
}

@Injectable({ providedIn: 'root' })
export class AdminUserService {

  private readonly apiUrl      = `${environment.apiUrl}/api/admin/users`;
  private readonly cloudName   = environment.cloudinary.cloudName;
  private readonly uploadPreset = environment.cloudinary.uploadPreset;

  constructor(private readonly http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getAll(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(this.apiUrl, { headers: this.headers() });
  }

  getVeterinarians(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(
      `${environment.apiUrl}/api/admin/public/veterinarians`,
      { headers: this.headers() }
    );
  }

  getStaffUsers(): Observable<AdminUser[]> {
    return this.getAll();
  }

  create(req: StaffCreateRequest): Observable<AdminUser> {
    return this.http.post<AdminUser>(this.apiUrl, req, { headers: this.headers() });
  }

  update(id: string, req: StaffCreateRequest): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.apiUrl}/${id}`, req, { headers: this.headers() });
  }

  toggleStatus(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/toggle`, {}, { headers: this.headers() });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.headers() });
  }

  uploadPhoto(file: File): Observable<{ secure_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder', 'pawsoft/staff');

    return this.http.post<{ secure_url: string }>(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      formData
    );
  }

  getClients(): Observable<AdminClient[]> {
    return this.http.get<AdminClient[]>(
      `${environment.apiUrl}/api/admin/clients`,
      { headers: this.headers() }
    );
  }

  getAllPets(): Observable<AdminPet[]> {
    return this.http.get<AdminPet[]>(
      `${environment.apiUrl}/api/admin/pets`,
      { headers: this.headers() }
    );
  }

  getVets(): Observable<AdminUser[]> {
    return this.getVeterinarians();
  }

  getPetsByOwnerEmail(email: string): Observable<AdminPet[]> {
    return this.http.get<AdminPet[]>(
      `${environment.apiUrl}/api/admin/pets?ownerEmail=${encodeURIComponent(email)}`,
      { headers: this.headers() }
    );
  }
}
