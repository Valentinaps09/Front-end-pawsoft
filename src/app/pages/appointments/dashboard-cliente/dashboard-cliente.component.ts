import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { AppSidebarComponent } from 'src/app/share/components/app-sidebar/app-sidebar.component';
import { AppointmentService, AppointmentRequest, AppointmentResponse } from 'src/app/services/appointment.service';
import { PetService } from 'src/app/services/pet.service';
import { AdminUserService, AdminUser } from 'src/app/services/admin-user.service';
import { PaymentService, PaymentResponse, ServicePrice } from 'src/app/services/Payment.service';

interface Pet {
  id: string; name: string; species: string; breed: string;
  emoji: string; gender: string; birthDate: string; photoUrl?: string;
}

interface CalendarDay {
  date: number | null; isToday: boolean; isSelected: boolean;
  isDisabled: boolean; hasAvailableSlots: boolean; fullDate?: Date;
}

interface TimeSlot { time: string; status: 'available' | 'taken' | 'selected'; }

interface AppointmentView {
  id: string; petName: string; petEmoji: string; petPhotoUrl?: string;
  date: string; time: string; reason: string; vetName: string;
  status: 'upcoming' | 'completed' | 'cancelled'; canCancel: boolean;
}

/**
 * Dashboard principal del cliente — Pawsoft.
 *
 * Muestra:
 * - Sus citas próximas con opción de cancelar.
 * - Su historial de pagos.
 * - Flujo de 5 pasos para agendar una nueva cita.
 *
 * CORRECCIÓN: Los métodos loadMyPayments() y loadServicePrices() ahora usan
 * los endpoints de /api/cliente/ en lugar de /api/admin/ y /api/recepcionista/,
 * eliminando los errores 403 que ocurrían por llamar rutas sin permiso.
 *
 * Proyecto: Pawsoft — Universidad del Quindío — Software III
 * Autoras: Valentina Porras Salazar · Helen Xiomara Giraldo Libreros
 */
@Component({
  selector: 'app-dashboard-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AppSidebarComponent],
  templateUrl: './dashboard-cliente.component.html',
  styleUrls: ['./dashboard-cliente.component.scss']
})
export class DashboardClienteComponent implements OnInit, OnDestroy {

  userName = '';
  userRole = '';

  /* ── Mascotas ── */
  pets: Pet[] = [];
  selectedPet: Pet | null = null;

  /* ── Veterinarios ── */
  veterinarians: AdminUser[] = [];
  selectedVet: AdminUser | null = null;
  loadingVets = false;

  /* ── Calendario ── */
  weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  calendarDays: CalendarDay[] = [];
  currentMonth = new Date().getMonth();
  currentYear  = new Date().getFullYear();
  currentMonthYear = '';
  selectedDate: string | null = null;
  selectedDateObj: Date | null = null;

  /* ── Horarios ── */
  timeSlots: TimeSlot[] = [];
  selectedTimeSlot: TimeSlot | null = null;
  loadingSlots = false;

  /* ── Detalle cita ── */
  appointmentReason = '';
  appointmentNotes  = '';
  confirmingAppointment = false;

  /* ── Mis citas ── */
  myAppointments: AppointmentView[] = [];

  /* ── Mis pagos ── */
  myPayments: PaymentResponse[] = [];
  loadingPayments = false;

  /* ── Precio referencial al agendar ── */
  servicePrices:  ServicePrice[] = [];
  referencePrice: number | null  = null;

  /* ── Modal cancelar ── */
  showCancelModal = false;
  appointmentToCancel: AppointmentView | null = null;
  cancelling   = false;
  cancelReason = '';

  /* ── Toast ── */
  toastVisible = false;
  toastMessage = '';
  private toastTimer: any;

  constructor(
    private readonly fb: FormBuilder,
    readonly router: Router,
    private readonly appointmentService: AppointmentService,
    private readonly petService: PetService,
    private readonly adminUserService: AdminUserService,
    private readonly paymentService: PaymentService,
  ) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('email') || 'Usuario';
    this.userRole = localStorage.getItem('rol')   || 'ROLE_CLIENTE';
    this.loadPets();
    this.loadVeterinarians();
    this.loadMyAppointments();
    this.loadMyPayments();
    this.loadServicePrices();
    this.generateCalendar();
    this.updateMonthYearLabel();
  }

  ngOnDestroy(): void {
    clearTimeout(this.toastTimer);
  }

  /* ══════════════════════════════
     TOAST
  ══════════════════════════════ */

  showToast(message: string): void {
    this.toastMessage = message;
    this.toastVisible = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastVisible = false; }, 3000);
  }

  /* ══════════════════════════════
     CARGA DE DATOS
  ══════════════════════════════ */

  loadPets(): void {
    this.petService.getMyPets().subscribe({
      next: (data) => {
        this.pets = data.map(p => ({
          id: String(p.id), name: p.name, species: p.species,
          breed: p.breed || '', emoji: this.getEmojiBySpecies(p.species),
          gender: p.sex, birthDate: p.birthDate || '', photoUrl: p.photoUrl
        }));
      },
      error: () => {}
    });
  }

  loadVeterinarians(): void {
    this.loadingVets = true;
    this.adminUserService.getVeterinarians().subscribe({
      next: (data) => {
        this.veterinarians = data.filter(v => v.enabled);
        this.loadingVets = false;
      },
      error: () => { this.veterinarians = []; this.loadingVets = false; }
    });
  }

  loadMyAppointments(): void {
    this.appointmentService.getMyAppointments().subscribe({
      next: (data: AppointmentResponse[]) => {
        this.myAppointments = data.map(a => {
          const rawStatus  = (a.status ?? 'upcoming').toLowerCase() as AppointmentView['status'];
          const aptDate    = new Date(a.date ?? a.dateFormatted ?? '');
          const tomorrow   = new Date();
          tomorrow.setHours(0, 0, 0, 0);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return {
            id:          String(a.id),
            petName:     a.petName     ?? 'Mi mascota',
            petEmoji:    a.petEmoji    ?? '🐾',
            petPhotoUrl: a.petPhotoUrl ?? undefined,
            date:        this.formatearFecha(a.dateFormatted ?? a.date ?? ''),
            time:        this.formatearHora(a.time ?? ''),
            reason:      this.getReasonLabel(a.reason),
            vetName:     a.vetName     ?? 'Veterinario',
            status:      rawStatus,
            canCancel:   rawStatus === 'upcoming' && aptDate >= tomorrow,
          };
        });
      },
      error: () => {}
    });
  }

  /**
   * Carga el historial de pagos del cliente autenticado.
   *
   * USA: GET /api/cliente/payments/my
   * El backend extrae el email del JWT — sin pasar email como parámetro.
   *
   * ANTES (incorrecto — causaba 403):
   *   this.paymentService.getByClient(email)  →  /api/admin/payments/client/{email}
   */
  loadMyPayments(): void {
    this.loadingPayments = true;
    this.paymentService.getMyPayments().subscribe({
      next:  (data) => { this.myPayments = data; this.loadingPayments = false; },
      error: ()     => { this.loadingPayments = false; }
    });
  }

  /**
   * Carga los precios de servicios para mostrar el precio referencial al agendar.
   *
   * USA: GET /api/cliente/payments/prices
   *
   * ANTES (incorrecto — causaba 403):
   *   this.paymentService.getActivePrices()  →  /api/recepcionista/payments/prices
   */
  loadServicePrices(): void {
    this.paymentService.getActivePricesCliente().subscribe({
      next:  (data) => { this.servicePrices = data; },
      error: ()     => {}
    });
  }

  onReasonChange(): void {
    if (!this.appointmentReason) { this.referencePrice = null; return; }
    const found = this.servicePrices.find(p => p.serviceType === this.appointmentReason);
    this.referencePrice = found ? found.price : null;
  }

  /* ══════════════════════════════
     SELECCIÓN MASCOTA Y VET
  ══════════════════════════════ */

  selectPet(pet: Pet): void {
    this.selectedPet = pet;
    this.resetBookingState();
  }

  selectVet(vet: AdminUser): void {
    this.selectedVet      = vet;
    this.selectedDate     = null;
    this.selectedDateObj  = null;
    this.selectedTimeSlot = null;
    this.timeSlots        = [];
    this.calendarDays.forEach(d => d.isSelected = false);
  }

  resetBookingState(): void {
    this.selectedVet       = null;
    this.selectedDate      = null;
    this.selectedDateObj   = null;
    this.selectedTimeSlot  = null;
    this.appointmentReason = '';
    this.appointmentNotes  = '';
    this.timeSlots         = [];
  }

  /* ══════════════════════════════
     CALENDARIO
  ══════════════════════════════ */

  previousMonth(): void {
    if (this.currentMonth === 0) { this.currentMonth = 11; this.currentYear--; }
    else this.currentMonth--;
    this.generateCalendar(); this.updateMonthYearLabel();
  }

  nextMonth(): void {
    if (this.currentMonth === 11) { this.currentMonth = 0; this.currentYear++; }
    else this.currentMonth++;
    this.generateCalendar(); this.updateMonthYearLabel();
  }

  generateCalendar(): void {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay  = new Date(this.currentYear, this.currentMonth + 1, 0);
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    let start = firstDay.getDay();
    start = start === 0 ? 6 : start - 1;
    this.calendarDays = [];
    for (let i = 0; i < start; i++)
      this.calendarDays.push({ date: null, isToday: false, isSelected: false, isDisabled: true, hasAvailableSlots: false });
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(this.currentYear, this.currentMonth, day); d.setHours(0, 0, 0, 0);
      this.calendarDays.push({
        date: day, isToday: d.getTime() === today.getTime(),
        isSelected: false, isDisabled: d < today,
        hasAvailableSlots: d >= today, fullDate: d
      });
    }
  }

  updateMonthYearLabel(): void {
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    this.currentMonthYear = `${months[this.currentMonth]} ${this.currentYear}`;
  }

  selectDate(day: CalendarDay): void {
    if (!day.fullDate || day.isDisabled) return;
    this.calendarDays.forEach(d => d.isSelected = false);
    day.isSelected      = true;
    this.selectedDateObj = day.fullDate;
    this.selectedDate    = day.fullDate.toLocaleDateString();
    this.loadTimeSlots();
  }

  loadTimeSlots(): void {
    if (!this.selectedVet || !this.selectedDateObj) return;
    this.loadingSlots = true;
    const year  = this.selectedDateObj.getFullYear();
    const month = String(this.selectedDateObj.getMonth() + 1).padStart(2, '0');
    const day   = String(this.selectedDateObj.getDate()).padStart(2, '0');
    const allHours = ['08:00','08:30','09:00','09:30','10:00','10:30',
      '11:00','11:30','14:00','14:30','15:00','15:30'];
    this.appointmentService.getOccupiedSlots(Number(this.selectedVet.id), `${year}-${month}-${day}`).subscribe({
      next: (occupied) => {
        this.timeSlots = allHours.map(time => ({
          time, status: occupied.some(o => o.startsWith(time)) ? 'taken' : 'available'
        }));
        this.loadingSlots = false;
      },
      error: () => {
        this.timeSlots = allHours.map(time => ({ time, status: 'available' }));
        this.loadingSlots = false;
      }
    });
  }

  selectTimeSlot(slot: TimeSlot): void {
    this.timeSlots.forEach(s => { if (s.status === 'selected') s.status = 'available'; });
    slot.status          = 'selected';
    this.selectedTimeSlot = slot;
  }

  /* ══════════════════════════════
     CONFIRMAR CITA
  ══════════════════════════════ */

  confirmAppointment(): void {
    if (!this.selectedPet || !this.selectedVet || !this.selectedTimeSlot || !this.selectedDateObj || !this.appointmentReason) return;
    this.confirmingAppointment = true;
    const year  = this.selectedDateObj.getFullYear();
    const month = String(this.selectedDateObj.getMonth() + 1).padStart(2, '0');
    const day   = String(this.selectedDateObj.getDate()).padStart(2, '0');
    const payload: AppointmentRequest = {
      petId:  Number(this.selectedPet.id),
      vetId:  Number(this.selectedVet.id),
      date:   `${year}-${month}-${day}`,
      time:   this.selectedTimeSlot.time.length === 5 ? `${this.selectedTimeSlot.time}:00` : this.selectedTimeSlot.time,
      reason: this.appointmentReason,
    };
    // Optimistic UI — agrega la cita visualmente antes de confirmar el backend
    this.myAppointments.unshift({
      id: Date.now().toString(), petName: this.selectedPet.name, petEmoji: this.selectedPet.emoji,
      date: this.selectedDateObj.toLocaleDateString(), time: this.selectedTimeSlot.time,
      reason: this.getReasonLabel(this.appointmentReason), vetName: this.selectedVet.name,
      status: 'upcoming', canCancel: true,
    });
    this.appointmentService.createAppointment(payload).subscribe({
      next:  () => { this.loadMyAppointments(); },
      error: (err) => { console.warn('Backend falló al crear cita', err); },
    });
    this.confirmingAppointment = false;
    this.resetBookingState();
    this.showToast('¡Cita agendada con éxito! 🐾');
  }

  /* ══════════════════════════════
     CANCELAR CITA
  ══════════════════════════════ */

  openCancelModal(appt: AppointmentView): void { this.appointmentToCancel = appt; this.showCancelModal = true; }
  closeCancelModal(): void { this.showCancelModal = false; this.appointmentToCancel = null; this.cancelReason = ''; }

  confirmCancel(): void {
    if (!this.appointmentToCancel) return;
    this.cancelling = true;
    this.appointmentService.cancelAppointment(this.appointmentToCancel.id).subscribe({
      next:  () => { this.loadMyAppointments(); this.cancelling = false; this.closeCancelModal(); },
      error: () => { this.cancelling = false; }
    });
  }

  /* ══════════════════════════════
     HELPERS
  ══════════════════════════════ */

  getEmojiBySpecies(species: string): string {
    return ({ Perro:'🐕', Gato:'🐈', Conejo:'🐰', Hamster:'🐹', Ave:'🦜' } as Record<string,string>)[species] || '🐾';
  }

  getReasonLabel(reason: string): string {
    return ({
      consulta:'Consulta general', vacunacion:'Vacunación', desparasitacion:'Desparasitación',
      control:'Control de rutina', emergencia:'Emergencia', cirugia:'Cirugía programada', otro:'Otro'
    } as Record<string,string>)[reason] || reason;
  }

  private formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const [year, month, day] = fecha.split('-');
    const m = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return `${parseInt(day)} de ${m[parseInt(month) - 1]} de ${year}`;
  }

  private formatearHora(hora: string): string {
    if (!hora) return '';
    const [h, min] = hora.split(':');
    const hNum = parseInt(h);
    return `${hNum % 12 || 12}:${min} ${hNum >= 12 ? 'PM' : 'AM'}`;
  }

  getVetInitials(vet: AdminUser): string {
    const parts = vet.name.trim().split(' ');
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
}
