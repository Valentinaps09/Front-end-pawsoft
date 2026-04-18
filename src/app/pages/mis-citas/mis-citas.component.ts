import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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

  // Modal de cancelación
  showCancelModal = false;
  citaToCancel: CitaView | null = null;
  cancelReason = '';
  cancelling = false;

  // PDF y fotos
  fotoSeleccionada: string | null = null;
  pdfSeleccionado: SafeResourceUrl | null = null;
  pdfUrlOriginal: string | null = null;
  descargandoPdf = false;

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
    private readonly sanitizer: DomSanitizer
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

  // ═══════════════════════════════════════════════════════════════
  // MANEJO DE FOTOS Y PDFs
  // ═══════════════════════════════════════════════════════════════

  abrirFoto(url: string): void {
    this.fotoSeleccionada = url;
  }

  cerrarFoto(): void {
    this.fotoSeleccionada = null;
  }

  abrirPdf(url: string): void { 
    // Abrir en nueva pestaña (más confiable con Cloudinary)
    window.open(url, '_blank');
  }

  cerrarPdf(): void { 
    this.pdfSeleccionado = null; 
    this.pdfUrlOriginal = null;
  }

  esPdf(url: string): boolean {
    return url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('/raw/');
  }

  descargarPdf(url: string, numero: number): void {
    this.descargandoPdf = true;
    
    // Transformar la URL de Cloudinary para forzar descarga
    let downloadUrl = url;
    
    // Si es una URL de Cloudinary, agregar el flag de attachment
    if (url.includes('cloudinary.com')) {
      // Para URLs de tipo /raw/upload/, insertar fl_attachment después de /upload/
      if (url.includes('/raw/upload/')) {
        downloadUrl = url.replace('/raw/upload/', '/raw/upload/fl_attachment/');
      } else if (url.includes('/image/upload/')) {
        downloadUrl = url.replace('/image/upload/', '/image/upload/fl_attachment/');
      }
    }
    
    // Crear un link temporal y hacer clic para descargar
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `documento-${numero}.pdf`;
    link.target = '_blank';
    link.style.display = 'none';
    document.body.appendChild(link);
    
    try {
      link.click();
      
      // Limpiar después de un pequeño delay
      setTimeout(() => {
        document.body.removeChild(link);
        this.descargandoPdf = false;
      }, 100);
    } catch (error) {
      console.error('Error descargando PDF:', error);
      this.descargandoPdf = false;
      document.body.removeChild(link);
    }
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

  // ═══════════════════════════════════════════════════════════════
  // CANCELACIÓN DE CITAS
  // ═══════════════════════════════════════════════════════════════

  openCancelModal(cita: CitaView): void {
    this.citaToCancel = cita;
    this.cancelReason = '';
    this.showCancelModal = true;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.citaToCancel = null;
    this.cancelReason = '';
  }

  confirmCancel(): void {
    if (!this.citaToCancel || !this.cancelReason.trim()) return;
    
    this.cancelling = true;
    this.appointmentService.cancelAppointment(this.citaToCancel.id).subscribe({
      next: () => {
        // Actualizar el estado de la cita localmente
        const cita = this.citas.find(c => c.id === this.citaToCancel!.id);
        if (cita) {
          cita.status = 'cancelled';
        }
        this.aplicarFiltros();
        this.cancelling = false;
        this.closeCancelModal();
      },
      error: () => {
        this.cancelling = false;
        // Aquí podrías mostrar un mensaje de error
      }
    });
  }
}
