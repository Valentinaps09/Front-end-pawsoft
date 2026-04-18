import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppSidebarComponent } from 'src/app/share/components/app-sidebar/app-sidebar.component';
import { AppointmentService, RecepAppointmentResponse } from 'src/app/services/appointment.service';
import { MedicalRecordService } from 'src/app/services/medical-record.service';
import { MedicalProfileModalComponent } from './medical-profile-modal/medical-profile-modal.component';

interface Appointment {
  id: string;
  petId: number;
  petName: string;
  petEmoji: string;
  petSpecies: string;
  petPhotoUrl: string | null;
  petBreed: string;
  petAge: string;
  ownerName: string;
  clientName: string;
  clientEmail: string;
  date: string;
  time: string;
  reason: string;
  notes: string | null;
  status: 'UPCOMING' | 'CONFIRMED' | 'IN_PROGRESS' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
}

interface StatCard {
  icon: string;
  label: string;
  value: number | string;
}

@Component({
  selector: 'app-dashboard-vet',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent, DatePipe, MedicalProfileModalComponent],
  templateUrl: './dashboard-vet.component.html',
  styleUrls: ['./dashboard-vet.component.scss']
})
export class DashboardVetComponent implements OnInit {

  userName = '';
  userRole = 'ROLE_VETERINARIO';

  activeTab: 'hoy' | 'proximas' = 'hoy';
  todayFormatted = '';
  private todayStr = '';

  todayAppointments: Appointment[] = [];
  filteredTodayAppointments: Appointment[] = [];
  searchToday = '';
  statusFilterToday = '';

  upcomingAppointments: Appointment[] = [];
  filteredUpcomingAppointments: Appointment[] = [];
  searchUpcoming = '';

  todayStats: StatCard[] = [];
  upcomingStats: StatCard[] = [];

  isLoading = false;
  errorMsg = '';

  // Modal resumen clínico (ver paciente)
  showMedicalProfileModal = false;
  selectedPetId: number | null = null;
  selectedAppointmentId: string | null = null;
  selectedAppointment: Appointment | null = null;

  constructor(
    private readonly router: Router,
    private readonly appointmentService: AppointmentService,
    private readonly medicalRecordService: MedicalRecordService
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.buildTodayDate();
    this.loadAppointments();
  }

  loadUserData(): void {
    this.userName = localStorage.getItem('email') || 'Veterinario';
    this.userRole = localStorage.getItem('rol') || 'ROLE_VETERINARIO';
  }

  buildTodayDate(): void {
    const now = new Date();
    // Usar la misma lógica que funciona en recepcionista
    this.todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    };
    this.todayFormatted = now.toLocaleDateString('es-CO', options);
    this.todayFormatted = this.todayFormatted.charAt(0).toUpperCase() + this.todayFormatted.slice(1);
  }

  loadAppointments(): void {
    this.isLoading = true;
    this.errorMsg = '';

    this.appointmentService.getVetAppointments().subscribe({
      next: (data: RecepAppointmentResponse[]) => {
        const mapped = data.map((a: RecepAppointmentResponse) => this.mapToLocal(a));

        // Filtrar citas de hoy: fecha exactamente igual a hoy (misma lógica que recepcionista)
        this.todayAppointments = mapped.filter((a: Appointment) => {
          return a.date === this.todayStr && (a.status === 'UPCOMING' || a.status === 'CONFIRMED');
        });

        // Filtrar próximas citas: fecha mayor a hoy
        this.upcomingAppointments = mapped.filter((a: Appointment) => {
          return a.date > this.todayStr && (a.status === 'UPCOMING' || a.status === 'CONFIRMED');
        });

        this.filteredTodayAppointments    = [...this.todayAppointments];
        this.filteredUpcomingAppointments = [...this.upcomingAppointments];
        this.buildStats();
        this.isLoading = false;
      },
      error: (err: unknown) => {
        console.error('Error cargando citas:', err);
        this.errorMsg = 'No se pudieron cargar las citas. Intenta de nuevo.';
        this.isLoading = false;
      }
    });
  }

  private mapToLocal(a: RecepAppointmentResponse): Appointment {
    return {
      id:          String(a.id),
      petId:       a.petId,
      petName:     a.petName,
      petEmoji:    this.getEmojiBySpecies(a.petSpecies),
      petSpecies:  a.petSpecies,
      petPhotoUrl: a.petPhotoUrl || null,
      petBreed:    a.petBreed   || '—',
      petAge:      this.calcularEdad(a.petBirthday),
      ownerName:   a.clientName,
      clientName:  a.clientName,
      clientEmail: a.clientEmail,
      date:        a.date,
      time:        this.formatTime(a.time),
      reason:      a.reason,
      notes:       a.notes || null,
      status:      a.status
    };
  }

  private calcularEdad(birthDate: string | null): string {
    if (!birthDate) return '—';
    const partes = birthDate.split('-');
    if (partes.length !== 3) return '—';
    const hoy        = new Date();
    const nacimiento = new Date(+partes[0], +partes[1] - 1, +partes[2]);
    let años  = hoy.getFullYear() - nacimiento.getFullYear();
    let meses = hoy.getMonth()    - nacimiento.getMonth();
    if (meses < 0) { años--; meses += 12; }
    if (años === 0) return `${meses} mes${meses !== 1 ? 'es' : ''}`;
    return `${años} año${años !== 1 ? 's' : ''}`;
  }

  private formatTime(time: string): string {
    if (!time) return '';
    const [hourStr, minStr] = time.split(':');
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minStr} ${ampm}`;
  }

  private getEmojiBySpecies(species: string): string {
    const map: { [key: string]: string } = {
      'Perro': '🐕', 'Dog': '🐕',
      'Gato': '🐈', 'Cat': '🐈',
      'Conejo': '🐇', 'Rabbit': '🐇',
      'Ave': '🦜', 'Bird': '🦜',
      'Pez': '🐠', 'Fish': '🐠'
    };
    return map[species] || '🐾';
  }

  setTab(tab: 'hoy' | 'proximas'): void { this.activeTab = tab; }

  getActiveTabLabel(): string {
    return this.activeTab === 'hoy' ? 'Citas de Hoy' : 'Próximas Citas';
  }

  getActiveTabSub(): string {
    return this.activeTab === 'hoy'
      ? 'Pacientes programados para el día de hoy'
      : 'Citas agendadas para los próximos días';
  }

  filterTodayAppointments(): void {
    const search = this.searchToday.toLowerCase();
    this.filteredTodayAppointments = this.todayAppointments.filter(a =>
      `${a.petName} ${a.ownerName}`.toLowerCase().includes(search) &&
      (!this.statusFilterToday || a.status === this.statusFilterToday)
    );
  }

  filterUpcomingAppointments(): void {
    const search = this.searchUpcoming.toLowerCase();
    this.filteredUpcomingAppointments = this.upcomingAppointments.filter(a =>
      `${a.petName} ${a.ownerName}`.toLowerCase().includes(search)
    );
  }

  buildStats(): void {
    this.todayStats = [
      { icon: '📋', label: 'Total de hoy',  value: this.todayAppointments.length },
      { icon: '✅', label: 'Confirmadas',   value: this.todayAppointments.filter(a => a.status === 'CONFIRMED').length },
      { icon: '⏳', label: 'Pendientes',    value: this.todayAppointments.filter(a => a.status === 'UPCOMING').length },
      { icon: '⏰', label: 'Próxima cita',  value: this.getNextAppointmentTime() }
    ];

    this.upcomingStats = [
      { icon: '🗓️', label: 'Total próximas', value: this.upcomingAppointments.length },
      { icon: '✅', label: 'Confirmadas',     value: this.upcomingAppointments.filter(a => a.status === 'CONFIRMED').length },
      { icon: '⏳', label: 'Pendientes',      value: this.upcomingAppointments.filter(a => a.status === 'UPCOMING').length },
      { icon: '📅', label: 'Días con citas',  value: new Set(this.upcomingAppointments.map(a => a.date)).size }
    ];
  }

  private getNextAppointmentTime(): string {
    const now    = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const pending = this.todayAppointments
      .filter(a => a.status === 'CONFIRMED')
      .map(a => {
        const [timePart, mod] = a.time.split(' ');
        let [h, m] = timePart.split(':').map(Number);
        if (mod === 'PM' && h !== 12) h += 12;
        if (mod === 'AM' && h === 12) h = 0;
        return { time: a.time, min: h * 60 + m };
      })
      .filter(a => a.min >= nowMin)
      .sort((a, b) => a.min - b.min);
    return pending.length > 0 ? pending[0].time : 'Ninguna';
  }

  getInitials(name: string): string {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  getStatusClass(status: string): string {
    const map: { [key: string]: string } = {
      'UPCOMING':    'status-programada',
      'CONFIRMED':   'status-confirmada',
      'IN_PROGRESS': 'status-enprogreso',
      'CANCELLED':   'status-cancelada',
      'COMPLETED':   'status-completada',
      'NO_SHOW':     'status-noshow'
    };
    return map[status] || '';
  }

  getStatusLabel(status: string): string {
    const map: { [key: string]: string } = {
      'UPCOMING':    'Programada',
      'CONFIRMED':   'Confirmada',
      'IN_PROGRESS': 'En progreso',
      'CANCELLED':   'Cancelada',
      'COMPLETED':   'Completada',
      'NO_SHOW':     'No asistió'
    };
    return map[status] || status;
  }

  // Abre el resumen clínico (solo lectura) desde "Ver paciente"
  openMedicalProfileModal(appointment: Appointment): void {
    this.selectedPetId            = appointment.petId;
    this.selectedAppointmentId    = appointment.id;
    this.selectedAppointment      = appointment;
    this.showMedicalProfileModal  = true;
  }

  closeMedicalProfileModal(): void {
    this.showMedicalProfileModal  = false;
    this.selectedPetId            = null;
    this.selectedAppointmentId    = null;
    this.selectedAppointment      = null;
  }

  continueWithAttention(apt: Appointment): void {
    const atencionActiva = this.medicalRecordService.getAtencionActiva();
    if (!atencionActiva) { this.errorMsg = 'No hay una atención activa para continuar.'; return; }
    if (atencionActiva.appointmentId !== parseInt(apt.id)) { this.errorMsg = 'La atención activa no corresponde a esta cita.'; return; }
    this.router.navigate(['/veterinario/formulario-consulta']);
  }

  canStartAttention(appointment: Appointment): boolean {
    return (appointment.status === 'CONFIRMED' || appointment.status === 'UPCOMING') &&
           !this.medicalRecordService.getAtencionActiva();
  }

  canContinueAttention(appointment: Appointment): boolean {
    return appointment.status === 'IN_PROGRESS';
  }

  hasActiveAttention(): boolean {
    return !!this.medicalRecordService.getAtencionActiva();
  }

  cleanupInProgressAppointments(): void {
    if (confirm('¿Estás seguro de que quieres limpiar todas las atenciones en progreso?')) {
      this.appointmentService.cleanupInProgressAppointments().subscribe({
        next: () => { this.medicalRecordService.cerrarAtencion(); this.loadAppointments(); },
        error: () => { this.errorMsg = 'Error al limpiar las atenciones. Intenta de nuevo.'; }
      });
    }
  }
}
