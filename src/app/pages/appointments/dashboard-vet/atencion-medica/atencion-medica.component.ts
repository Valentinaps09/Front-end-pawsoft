import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppSidebarComponent } from 'src/app/share/components/app-sidebar/app-sidebar.component';
import { AppointmentService, RecepAppointmentResponse } from 'src/app/services/appointment.service';
import { MedicalRecordService } from 'src/app/services/medical-record.service';

@Component({
  selector: 'app-atencion-medica',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent],
  templateUrl: './atencion-medica.component.html',
  styleUrls: ['./atencion-medica.component.scss']
})
export class AtencionMedicaComponent implements OnInit {

  userName = '';
  userRole = 'ROLE_VETERINARIO';

  citas: RecepAppointmentResponse[] = [];
  citasFiltradas: RecepAppointmentResponse[] = [];
  searchText = '';
  filtroEstado: 'todas' | 'pendiente' | 'en_proceso' = 'todas';

  isLoading = false;
  errorMsg = '';

  todayFormatted = '';

  constructor(
    private readonly router: Router,
    private readonly appointmentService: AppointmentService,
    private readonly medicalRecordService: MedicalRecordService,
  ) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('email') || 'Veterinario';
    this.userRole = localStorage.getItem('rol') || 'ROLE_VETERINARIO';
    this.buildTodayDate();
    this.cargarCitas();
  }

  private buildTodayDate(): void {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    };
    this.todayFormatted = now.toLocaleDateString('es-CO', options);
    this.todayFormatted = this.todayFormatted.charAt(0).toUpperCase() + this.todayFormatted.slice(1);
  }

  cargarCitas(): void {
    this.isLoading = true;
    this.errorMsg = '';

    this.appointmentService.getVetAppointments().subscribe({
      next: (data) => {
        // Solo citas CONFIRMED
        this.citas = data.filter(a => a.status === 'CONFIRMED');
        this.aplicarFiltros();
        this.isLoading = false;
      },
      error: () => {
        this.errorMsg = 'No se pudieron cargar las citas. Intenta de nuevo.';
        this.isLoading = false;
      }
    });
  }

  aplicarFiltros(): void {
    const atencionActiva = this.medicalRecordService.getAtencionActiva();
    const search = this.searchText.toLowerCase();

    this.citasFiltradas = this.citas.filter(c => {
      const matchSearch = !search ||
        c.petName.toLowerCase().includes(search) ||
        c.clientName.toLowerCase().includes(search);

      const enProceso = atencionActiva?.appointmentId === c.id;

      const matchEstado =
        this.filtroEstado === 'todas' ||
        (this.filtroEstado === 'en_proceso' && enProceso) ||
        (this.filtroEstado === 'pendiente' && !enProceso);

      return matchSearch && matchEstado;
    });
  }

  isEnProceso(cita: RecepAppointmentResponse): boolean {
    return this.medicalRecordService.getAtencionActiva()?.appointmentId === cita.id;
  }

  iniciarAtencion(cita: RecepAppointmentResponse): void {
    this.medicalRecordService.iniciarAtencion(cita);
    this.router.navigate(['/veterinario/formulario-consulta']);
  }

  continuarAtencion(): void {
    this.router.navigate(['/veterinario/formulario-consulta']);
  }

  getEmojiBySpecies(species: string): string {
    const map: { [key: string]: string } = {
      'Perro': '🐕', 'Dog': '🐕',
      'Gato': '🐈', 'Cat': '🐈',
      'Conejo': '🐇', 'Rabbit': '🐇',
      'Ave': '🦜', 'Bird': '🦜',
      'Pez': '🐠', 'Fish': '🐠'
    };
    return map[species] || '🐾';
  }

  formatTime(time: string): string {
    if (!time) return '';
    const [hourStr, minStr] = time.split(':');
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minStr} ${ampm}`;
  }

  getInitials(name: string): string {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }
}
