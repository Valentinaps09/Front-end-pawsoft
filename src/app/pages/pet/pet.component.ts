import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AppSidebarComponent } from 'src/app/share/components/app-sidebar/app-sidebar.component';
import { PetService } from 'src/app/services/pet.service';
import { CreateMedicalProfileInitialRequest } from 'src/app/models/medical-profile.model';

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

function fechaRangoValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const year = new Date(control.value + 'T12:00:00').getFullYear();
  const currentYear = new Date().getFullYear();
  if (year < 1990 || year > currentYear) return { fechaInvalida: true };
  return null;
}

@Component({
  selector: 'app-pet',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AppSidebarComponent],
  templateUrl: './pet.component.html',
  styleUrls: ['./pet.component.scss']
})
export class PetComponent implements OnInit {

  userName = '';
  userRole = '';
  pets: Pet[] = [];

  showFormModal = false;
  editingPet: Pet | null = null;
  saving = false;

  showDeleteModal = false;
  petToDelete: Pet | null = null;
  deleting = false;

  selectedFile: File | null = null;
  photoPreview: string | null = null;
  uploadingPhoto = false;

  // ── Calendario custom ──
  showCalendar = false;
  calYear  = new Date().getFullYear();
  calMonth = new Date().getMonth();
  calDays: number[] = [];

  // ── Información médica inicial ──
  showMedicalSection = false;

  meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  years: number[] = [];

  petForm = this.fb.group({
    name:      ['', Validators.required],
    species:   ['', Validators.required],
    breed:     [''],
    sex:       ['', Validators.required],
    birthDate: ['', fechaRangoValidator],
    // Información médica inicial (opcional)
    bloodType: [''],
    knownAllergies: [''],
    chronicConditions: [''],
    currentMedications: [''],
    additionalNotes: ['']
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly petService: PetService,
    private readonly route: ActivatedRoute
  ) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 1990; y--) this.years.push(y);
  }

  ngOnInit(): void {
    this.userName = localStorage.getItem('email') || 'Usuario';
    this.userRole = localStorage.getItem('rol') || 'ROLE_CLIENTE';
    this.loadPets();
    this.buildCalendar();

    // Si viene con ?action=create desde el dashboard, abre el modal directo
    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'create') {
        this.openCreateModal();
      }
    });
  }

  @HostListener('document:click')
  onDocumentClick() { this.showCalendar = false; }

  toggleCalendar() { this.showCalendar = !this.showCalendar; }

  buildCalendar() {
    const firstDay = new Date(this.calYear, this.calMonth, 1).getDay();
    const daysInMonth = new Date(this.calYear, this.calMonth + 1, 0).getDate();
    this.calDays = [];
    for (let i = 0; i < firstDay; i++) this.calDays.push(0);
    for (let d = 1; d <= daysInMonth; d++) this.calDays.push(d);
  }

  prevMonth() {
    if (this.calYear === 1990 && this.calMonth === 0) return;
    if (this.calMonth === 0) { this.calMonth = 11; this.calYear--; }
    else this.calMonth--;
    this.buildCalendar();
  }

  nextMonth() {
    const now = new Date();
    if (this.calYear === now.getFullYear() && this.calMonth === now.getMonth()) return;
    if (this.calMonth === 11) { this.calMonth = 0; this.calYear++; }
    else this.calMonth++;
    this.buildCalendar();
  }

  // FIX: Number() fuerza tipo number — Angular bindea el select como string
  // lo que causaba que calMonth/calYear quedaran como undefined al cambiar
  onMonthChange(): void {
    this.calMonth = Number(this.calMonth);
    this.buildCalendar();
  }

  onYearChange(): void {
    this.calYear = Number(this.calYear);
    this.buildCalendar();
  }

  selectDay(day: number) {
    if (!day || this.isDisabled(day)) return;
    const mm = String(this.calMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    this.petForm.patchValue({ birthDate: `${this.calYear}-${mm}-${dd}` });
    this.petForm.get('birthDate')?.markAsTouched();
    this.showCalendar = false;
  }

  isSelected(day: number): boolean {
    if (!day) return false;
    const val = this.petForm.value.birthDate;
    if (!val) return false;
    const mm = String(this.calMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return val === `${this.calYear}-${mm}-${dd}`;
  }

  isDisabled(day: number): boolean {
    if (!day) return true;
    return new Date(this.calYear, this.calMonth, day) > new Date();
  }

  isToday(day: number): boolean {
    if (!day) return false;
    const t = new Date();
    return day === t.getDate() && this.calMonth === t.getMonth() && this.calYear === t.getFullYear();
  }

  loadPets(): void {
    this.petService.getMyPets().subscribe({
      next: (data) => { this.pets = data; },
      error: () => {}
    });
  }

  openCreateModal(): void {
    this.editingPet = null;
    this.selectedFile = null;
    this.photoPreview = null;
    this.showCalendar = false;
    this.showMedicalSection = false;
    this.calYear  = new Date().getFullYear();
    this.calMonth = new Date().getMonth();
    this.buildCalendar();
    this.petForm.reset();
    this.showFormModal = true;
  }

  openEditModal(pet: Pet): void {
    // No permitir editar mascotas fallecidas
    if (pet.isDeceased) {
      return;
    }
    
    this.editingPet = pet;
    this.selectedFile = null;
    this.photoPreview = pet.photoUrl || null;
    this.showCalendar = false;
    this.showMedicalSection = false;
    if (pet.birthDate) {
      const [y, m] = pet.birthDate.split('-');
      this.calYear  = +y;
      this.calMonth = +m - 1;
      this.buildCalendar();
    }
    this.petForm.patchValue({
      name: pet.name, 
      species: pet.species, 
      breed: pet.breed,
      sex: pet.sex, 
      birthDate: pet.birthDate,
      // Información médica inicial (si existe)
      bloodType: pet.medicalProfileInitial?.bloodType || '',
      knownAllergies: pet.medicalProfileInitial?.knownAllergies || '',
      chronicConditions: pet.medicalProfileInitial?.chronicConditions || '',
      currentMedications: pet.medicalProfileInitial?.currentMedications || '',
      additionalNotes: pet.medicalProfileInitial?.additionalNotes || ''
    });
    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.editingPet = null;
    this.selectedFile = null;
    this.photoPreview = null;
    this.showCalendar = false;
    this.showMedicalSection = false;
    this.petForm.reset();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('La foto no debe superar 2MB.'); return; }
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => { this.photoPreview = reader.result as string; };
    reader.readAsDataURL(file);
  }

  removePhoto(): void { this.selectedFile = null; this.photoPreview = null; }

  savePet(): void {
    if (this.petForm.invalid) return;
    this.saving = true;
    const guardar = (photoUrl?: string) => {
      // Preparar información médica inicial si hay datos
      let medicalProfileInitial: CreateMedicalProfileInitialRequest | undefined;
      const bloodType = this.petForm.value.bloodType?.trim();
      const knownAllergies = this.petForm.value.knownAllergies?.trim();
      const chronicConditions = this.petForm.value.chronicConditions?.trim();
      const currentMedications = this.petForm.value.currentMedications?.trim();
      const additionalNotes = this.petForm.value.additionalNotes?.trim();

      if (bloodType || knownAllergies || chronicConditions || currentMedications || additionalNotes) {
        medicalProfileInitial = {
          bloodType: bloodType || undefined,
          knownAllergies: knownAllergies || undefined,
          chronicConditions: chronicConditions || undefined,
          currentMedications: currentMedications || undefined,
          additionalNotes: additionalNotes || undefined
        };
      }

      const payload: Pet = {
        name:      this.petForm.value.name!,
        species:   this.petForm.value.species!,
        breed:     this.petForm.value.breed || '',
        sex:       this.petForm.value.sex!,
        birthDate: this.petForm.value.birthDate || '',
        ownerEmail: this.userName,
        photoUrl:  photoUrl ?? this.editingPet?.photoUrl,
        medicalProfileInitial: medicalProfileInitial
      };
      const op = this.editingPet?.id
        ? this.petService.updatePet(this.editingPet.id, payload)
        : this.petService.createPet(payload);
      op.subscribe({
        next: () => { this.loadPets(); this.saving = false; this.closeFormModal(); },
        error: () => { this.saving = false; }
      });
    };
    if (this.selectedFile) {
      this.uploadingPhoto = true;
      this.petService.uploadPhoto(this.selectedFile).subscribe({
        next: (res) => { this.uploadingPhoto = false; guardar(res.secure_url); },
        error: () => { this.uploadingPhoto = false; this.saving = false; }
      });
    } else {
      guardar();
    }
  }

  openDeleteModal(pet: Pet): void { 
    // No permitir eliminar mascotas fallecidas
    if (pet.isDeceased) {
      return;
    }
    this.petToDelete = pet; 
    this.showDeleteModal = true; 
  }
  closeDeleteModal(): void { this.showDeleteModal = false; this.petToDelete = null; }

  confirmDelete(): void {
    if (!this.petToDelete?.id) return;
    this.deleting = true;
    this.petService.deletePet(this.petToDelete.id).subscribe({
      next: () => { this.loadPets(); this.deleting = false; this.closeDeleteModal(); },
      error: () => { this.deleting = false; }
    });
  }

  getEmoji(species: string): string {
    const map: Record<string, string> = { Perro:'🐕', Gato:'🐈', Conejo:'🐰', Hamster:'🐹', Ave:'🦜' };
    return map[species] || '🐾';
  }

  toggleMedicalSection(): void {
    this.showMedicalSection = !this.showMedicalSection;
  }

  formatDate(date: string): string {
    if (!date) return '';
    const [year, month, day] = date.split('-');
    const m = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${parseInt(day)} ${m[parseInt(month) - 1]} ${year}`;
  }
}
