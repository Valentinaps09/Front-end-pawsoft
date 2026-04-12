import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppSidebarComponent } from 'src/app/share/components/app-sidebar/app-sidebar.component';
import { AppointmentService, AppointmentResponse } from 'src/app/services/appointment.service';
import { MedicalRecordService, MedicalRecordResponse } from 'src/app/services/medical-record.service';
import { PaymentService, PaymentResponse } from 'src/app/services/Payment.service';
import { forkJoin } from 'rxjs';

type EstadoCita = 'upcoming' | 'completed' | 'cancelled' | 'confirmed' | 'no_show';

interface CitaView {
  id: string;
  petName: string;
  petEmoji: string;
  petPhotoUrl?: string;
  date: string;
  rawDate: string;
  time: string;
  reason: string;
  vetName: string;
  status: EstadoCita;
  sortTimestamp: number;
  medicalRecord?: MedicalRecordResponse;
  payment?: PaymentResponse;
  showingRecord: boolean;
}

@Component({
  selector: 'app-mis-citas',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, FormsModule, AppSidebarComponent],
  templateUrl: './mis-citas.component.html',
  styleUrls: ['./mis-citas.component.scss']
})
export class MisCitasComponent implements OnInit {

  userName = '';
  userRole = 'ROLE_CLIENTE';

  citas: CitaView[] = [];
  citasFiltradas: CitaView[] = [];
  isLoading = false;
  errorMsg = '';

  filtroEstado = '';
  filtroTexto = '';

  readonly ESTADOS: { value: string; label: string }[] = [
    { value: '',          label: 'Todos los estados' },
    { value: 'upcoming',  label: 'Pendiente' },
    { value: 'confirmed', label: 'Confirmada' },
    { value: 'completed', label: 'Completada' },
    { value: 'cancelled', label: 'Cancelada' },
    { value: 'no_show',   label: 'No asistió' },
  ];

  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly medicalRecordService: MedicalRecordService,
    private readonly paymentService: PaymentService,
  ) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('email') || 'Cliente';
    this.userRole = localStorage.getItem('rol') || 'ROLE_CLIENTE';
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.isLoading = true;
    this.errorMsg = '';

    // Cargar citas y registros médicos en paralelo
    forkJoin({
      citas:    this.appointmentService.getMyAppointments(),
      registros: this.medicalRecordService.obtenerRegistrosCliente(),
      pagos:    this.paymentService.getMyPayments()
    }).subscribe({
      next: ({ citas, registros, pagos }) => {
        const recordMap = new Map<string, MedicalRecordResponse>();
        registros.forEach(r => recordMap.set(String(r.appointmentId), r));

        const paymentMap = new Map<string, PaymentResponse>();
        pagos.forEach(p => paymentMap.set(String(p.appointmentId), p));

        this.citas = citas.map(a => {
          const rawDateStr = a.date ?? a.dateFormatted ?? '';
          const rawTimeStr = a.time ?? '00:00:00';
          const id = String(a.id);
          return {
            id,
            petName:     a.petName     ?? 'Mi mascota',
            petEmoji:    a.petEmoji    ?? '🐾',
            petPhotoUrl: a.petPhotoUrl ?? undefined,
            date:        this.formatDate(rawDateStr),
            rawDate:     rawDateStr,
            time:        this.formatTime(rawTimeStr),
            reason:      a.reason ?? '',
            vetName:     a.vetName ?? 'Veterinario',
            status:      ((a.status ?? 'upcoming').toLowerCase()) as EstadoCita,
            sortTimestamp: new Date(`${rawDateStr}T${rawTimeStr}`).getTime(),
            medicalRecord: recordMap.get(id),
            payment:       paymentMap.get(id),
            showingRecord: false,
          };
        }).sort((a, b) => b.sortTimestamp - a.sortTimestamp);

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
    const texto = this.filtroTexto.toLowerCase();
    this.citasFiltradas = this.citas.filter(c => {
      const matchEstado = !this.filtroEstado || c.status === this.filtroEstado;
      const matchTexto  = !texto ||
        c.petName.toLowerCase().includes(texto) ||
        c.vetName.toLowerCase().includes(texto) ||
        c.reason.toLowerCase().includes(texto);
      return matchEstado && matchTexto;
    });
  }

  toggleResumen(cita: CitaView): void {
    cita.showingRecord = !cita.showingRecord;
  }

  fotoSeleccionada: string | null = null;

  abrirFoto(url: string): void {
    this.fotoSeleccionada = url;
  }

  cerrarFoto(): void {
    this.fotoSeleccionada = null;
  }

  parseMeds(json: string): any[] {
    try { return JSON.parse(json) || []; } catch { return []; }
  }

  parseFotos(json: string): string[] {
    try {
      const p = JSON.parse(json);
      return Array.isArray(p) ? p.filter(Boolean) : [];
    } catch { return []; }
  }

  getStatusLabel(status: EstadoCita): string {
    const map: Record<EstadoCita, string> = {
      upcoming:  'Pendiente',
      confirmed: 'Confirmada',
      completed: 'Completada',
      cancelled: 'Cancelada',
      no_show:   'No asistió',
    };
    return map[status] ?? status;
  }

  getStatusClass(status: EstadoCita): string {
    const map: Record<EstadoCita, string> = {
      upcoming:  'badge-pending',
      confirmed: 'badge-confirmed',
      completed: 'badge-completed',
      cancelled: 'badge-cancelled',
      no_show:   'badge-noshow',
    };
    return map[status] ?? '';
  }

  private formatDate(date: string): string {
    if (!date) return '—';
    const [y, m, d] = date.split('-');
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${d} ${meses[+m - 1]} ${y}`;
  }

  private formatTime(time: string): string {
    if (!time) return '—';
    const [h, m] = time.split(':');
    const hour = +h;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12  = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }
}
