import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MedicalProfileService } from 'src/app/services/medical-profile.service';
import { MedicalRecordService, MedicalRecordResponse } from 'src/app/services/medical-record.service';
import { PetMedicalProfileDTO } from 'src/app/models/medical-profile.model';

@Component({
  selector: 'app-medical-profile-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './medical-profile-modal.component.html',
  styleUrls: ['./medical-profile-modal.component.scss']
})
export class MedicalProfileModalComponent implements OnChanges {

  @Input() petId!: number;
  @Input() show = false;
  @Input() readOnly = false;
  @Output() close = new EventEmitter<void>();
  @Output() continue = new EventEmitter<void>();

  profile: PetMedicalProfileDTO | null = null;
  recentAppointments: MedicalRecordResponse[] = [];
  loading = false;
  error = false;

  constructor(
    private readonly medicalProfileService: MedicalProfileService,
    private readonly medicalRecordService: MedicalRecordService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Recargar siempre que show pase a true o cambie el petId
    if (this.show && this.petId) {
      this.profile = null;
      this.recentAppointments = [];
      this.loadProfile();
      this.loadRecentAppointments();
    }
  }

  loadProfile(): void {
    this.loading = true;
    this.error = false;
    this.profile = null;

    this.medicalProfileService.getMedicalProfile(this.petId).subscribe({
      next: (data) => {
        this.profile = data;
        this.loading = false;
      },
      error: () => {
        // No mostrar error — simplemente mostrar perfil vacío
        this.profile = null;
        this.error = false;
        this.loading = false;
      }
    });
  }

  loadRecentAppointments(): void {
    this.medicalRecordService.obtenerHistorialPorMascota(this.petId).subscribe({
      next: (records) => {
        // Ordenar por fecha más reciente y tomar las últimas 2
        this.recentAppointments = records
          .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime())
          .slice(0, 2);
      },
      error: () => {
        this.recentAppointments = [];
      }
    });
  }

  onClose(): void { this.close.emit(); }
  onContinue(): void { this.continue.emit(); }

  getUpdatedByLabel(profile: PetMedicalProfileDTO): string {
    if (!profile.lastUpdatedByName) return '—';
    if (profile.lastUpdatedByRole === 'ROLE_CLIENTE') {
      return `${profile.lastUpdatedByName} (Dueño)`;
    }
    return profile.lastUpdatedByName;
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return '';
    const d = new Date(dateString);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  }

  getSpeciesEmoji(species: string): string {
    const map: Record<string, string> = {
      Perro: '🐕', Gato: '🐈', Conejo: '🐰', Hamster: '🐹', Ave: '🦜'
    };
    return map[species] || '🐾';
  }
}