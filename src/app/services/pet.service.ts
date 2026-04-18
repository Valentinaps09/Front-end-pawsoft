import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateMedicalProfileInitialRequest } from '../models/medical-profile.model';

export interface Pet {
  id?: number;
  name: string;
  species: string;
  breed: string;
  birthDate: string;
  sex: string;
  ownerEmail?: string;
  photoUrl?: string;
  isDeceased?: boolean;      // Indica si la mascota está fallecida
  isHospitalized?: boolean;  // Indica si la mascota está hospitalizada
  medicalProfileInitial?: CreateMedicalProfileInitialRequest;
}

@Injectable({ providedIn: 'root' })
export class PetService {

  private readonly apiUrl = `${environment.apiUrl}/api/cliente/pets`;

  private readonly cloudName = environment.cloudinary.cloudName;
  private readonly uploadPreset = environment.cloudinary.uploadPreset;

  constructor(private readonly http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getMyPets(): Observable<Pet[]> {
    return this.http.get<Pet[]>(this.apiUrl, { headers: this.headers() });
  }

  createPet(pet: Pet): Observable<Pet> {
    return this.http.post<Pet>(this.apiUrl, pet, { headers: this.headers() });
  }

  updatePet(id: number, pet: Pet): Observable<Pet> {
    return this.http.put<Pet>(`${this.apiUrl}/${id}`, pet, { headers: this.headers() });
  }

  deletePet(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.headers() });
  }

  /**
   * Sube la foto directo a Cloudinary sin pasar por el backend.
   * Retorna la URL segura de la imagen subida.
   */
  uploadPhoto(file: File): Observable<{ secure_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder', 'pawsoft/pets');

    return this.http.post<{ secure_url: string }>(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      formData
    );
  }
}
