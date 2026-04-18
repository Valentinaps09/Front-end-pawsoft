import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule, ReactiveFormsModule,
  FormBuilder, FormGroup, Validators
} from '@angular/forms';
import { AppSidebarComponent } from 'src/app/share/components/app-sidebar/app-sidebar.component';
import { RecepcionistaService, RecepAppointment } from 'src/app/services/recepcionista.service';
import { AdminUserService, AdminPet } from 'src/app/services/admin-user.service';
import { AppointmentService } from 'src/app/services/appointment.service';
import { PaymentService, PaymentResponse, ServicePrice } from 'src/app/services/Payment.service';
import { RecepClientService, RecepClient, RecepPet } from 'src/app/services/RecepClient.service';
import { AdminPaymentService, ServicePriceItem } from 'src/app/services/admin-payment.service';
import { MedicalRecordService } from 'src/app/services/medical-record.service';

interface Vet {
  id:        string;
  firstName: string;
  lastName:  string;
  specialty: string;
}

interface ClientPet {
  id:        string;
  name:      string;
  emoji:     string;
  species:   string;
  breed:     string;
  age:       number;
  gender:    string;
  color:     string;
  birthDate?: string;
  photoUrl?:  string;
  isHospitalized?: boolean;  // Indica si la mascota está hospitalizada
}

interface Client {
  id:               string;
  firstName:        string;
  lastName:         string;
  phone:            string;
  email:            string;
  registrationDate: string;
  pets:             ClientPet[];
}

interface Appointment {
  id:              string;
  date:            string;
  time:            string;
  clientId:        string;
  clientFirstName: string;
  clientLastName:  string;
  clientEmail:     string;
  petId:           string;
  petName:         string;
  petEmoji:        string;
  petSpecies:      string;
  vetId:           string;
  vetFirstName:    string;
  vetLastName:     string;
  vetSpecialty:    string;
  reason:          string;
  notes:           string;
  status:          'UPCOMING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
  cancelReason?:   string;
}

interface StatCard { icon: string; label: string; value: number | string; }
interface WeekDay  { day: string; count: number; pct: number; isToday: boolean; date: string; }
interface VetStat  { firstName: string; lastName: string; count: number; pct: number; }
interface Toast    { show: boolean; message: string; type: 'success' | 'error'; }
interface TimeSlot { time: string; status: 'available' | 'taken' | 'past'; }

@Component({
  selector: 'app-dashboard-recepcionista',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AppSidebarComponent],
  templateUrl: './dashboard-rec.component.html',
  styleUrls: ['./dashboard-rec.component.scss']
})
export class DashboardRecComponent implements OnInit {

  userName = '';
  userRole = 'ROLE_RECEPCIONISTA';

  activeTab: 'inicio' | 'nueva-cita' | 'todas-citas' | 'pagos' | 'clientes' = 'inicio';

  vets:               Vet[]    = [];
  appointmentClients: Client[] = [];
  appointments:       Appointment[] = [];

  allPets:     AdminPet[] = [];
  loadingPets  = true;

  todayLabel  = '';
  todayStats: StatCard[] = [];
  todaySearch = '';
  filteredTodayAppointments: Appointment[] = [];

  weeklyData:        WeekDay[]     = [];
  cancelledThisWeek: Appointment[] = [];
  vetStats:          VetStat[]     = [];

  allAptSearch       = '';
  allAptStatusFilter = '';
  allAptVetFilter    = '';
  allAptDateFilter   = '';
  filteredAllAppointments: Appointment[] = [];

  newAptStep  = 1;
  clientMode: 'existing' | 'new' = 'existing';
  petMode:    'existing' | 'new' = 'existing';

  clientSearchQuery      = '';
  clientSearchResults:   Client[]    = [];
  clientSearchTouched    = false;

  selectedExistingClient: Client    | null = null;
  selectedPet:            ClientPet | null = null;

  newClientForm!: FormGroup;
  newPetForm!:    FormGroup;
  newAptForm!:    FormGroup;
  editAptForm!:   FormGroup;

  showNewClientPw  = false;
  petPhotoPreview: string | null = null;
  showMedicalSection = false;  // Nueva variable para controlar la sección médica
  savingApt        = false;

  showEditAptModal = false;
  editingApt:  Appointment | null = null;
  savingEditApt    = false;

  showCancelModal = false;
  aptToCancel: Appointment | null = null;
  cancelReason    = '';
  cancellingApt   = false;

  toast: Toast = { show: false, message: '', type: 'success' };

  timeSlots: TimeSlot[] = [];
  loadingSlots = false;

  readonly ALL_SLOTS = [
    '08:00','08:30','09:00','09:30','10:00','10:30',
    '11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30',
    '17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30'
  ];

  // ── Calendario citas ───────────────────────────────────────────────────────
  showCalendarApt  = false;
  calYearApt       = new Date().getFullYear();
  calMonthApt      = new Date().getMonth();
  calDaysApt:      number[] = [];

  showCalendarEdit = false;
  calYearEdit      = new Date().getFullYear();
  calMonthEdit     = new Date().getMonth();
  calDaysEdit:     number[] = [];

  // ── Calendario birthDate mascota ──────────────────────────────────────────
  showCalendarPetBirth  = false;
  calYearPetBirth       = new Date().getFullYear();
  calMonthPetBirth      = new Date().getMonth();
  calDaysPetBirth:      number[] = [];

  readonly petBirthYears: number[] = (() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 31 }, (_, i) => y - i);
  })();

  readonly meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  readonly calYears: number[] = (() => {
    const y = new Date().getFullYear();
    return Array.from({ length: y - 2023 }, (_, i) => 2024 + i);
  })();

  payments:          PaymentResponse[] = [];
  filteredPayments:  PaymentResponse[] = [];
  servicePrices:     ServicePrice[]    = [];
  loadingPayments    = false;

  paymentSearch       = '';
  paymentStatusFilter = '';
  paymentDateFilter   = '';

  paymentStats = { total: 0, pending: 0, paid: 0, todayRevenue: 0 };

  showPaymentModal  = false;
  paymentApt:        Appointment | null = null;
  paymentConcept     = '';
  paymentBaseAmount  = 0;
  paymentMedCost     = 0;
  paymentTotalAmount = 0;
  paymentAjustarPrecio = false;
  paymentMontoAjustado = 0;
  paymentNotes       = '';
  savingPayment      = false;

  // ── Tab Clientes ──────────────────────────────────────────────────────────

  recepClients:         RecepClient[] = [];
  filteredRecepClients: RecepClient[] = [];
  clientSearch          = '';
  loadingClients        = false;
  selectedClient:       RecepClient | null = null;

  selectedClientPets:  RecepPet[] = [];
  loadingClientPets    = false;

  showCreateClientModal = false;
  showEditClientModal   = false;
  savingClient          = false;
  editingClientId:      number | null = null;

  // ── Sin campo password — se genera en backend y se envía por correo
  clientForm     = { nombre: '', email: '' };
  editClientForm = { nombre: '', email: '', telefono: '' };

  showPetModal       = false;
  savingPet          = false;
  uploadingPetPhoto  = false;
  editingPet:        RecepPet | null = null;

  petForm: {
    name: string; species: string; breed: string;
    sex: string; birthDate: string; photoUrl: string;
  } = { name: '', species: '', breed: '', sex: '', birthDate: '', photoUrl: '' };

  showDeletePetModal = false;
  deletingPet        = false;
  petToDelete:       RecepPet | null = null;

  // ── Eliminar cliente ──────────────────────────────────────────────────────
  showDeleteClientModal = false;
  deletingClient        = false;
  clientToDelete:       RecepClient | null = null;

  // ── Servicios dinámicos ───────────────────────────────────────────────────
  availableServices: ServicePriceItem[] = [];
  loadingServices = false;

  constructor(
    private readonly fb:                 FormBuilder,
    private readonly recepService:       RecepcionistaService,
    private readonly adminUserService:   AdminUserService,
    private readonly appointmentService: AppointmentService,
    private readonly paymentService:     PaymentService,
    private readonly recepClientService: RecepClientService,
    private readonly adminPaymentService: AdminPaymentService,
    private readonly medicalRecordService: MedicalRecordService
  ) {}

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showCalendarApt      = false;
    this.showCalendarEdit     = false;
    this.showCalendarPetBirth = false;
  }

  ngOnInit(): void {
    this.userName = localStorage.getItem('email') || 'Recepcionista';
    this.userRole = localStorage.getItem('rol')   || 'ROLE_RECEPCIONISTA';
    this.buildForms();
    this.setupToday();
    this.loadData();
    this.loadPayments();
    this.loadServicePrices();
    this.loadRecepClients();
    this.loadAvailableServices();
  }

  setupToday(): void {
    const now    = new Date();
    const days   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const months = ['enero','febrero','marzo','abril','mayo','junio',
      'julio','agosto','septiembre','octubre','noviembre','diciembre'];
    this.todayLabel = `${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
  }

  // ── Carga de datos ────────────────────────────────────────────────────────

  loadData(): void {
    this.loadVets();
    this.loadAllPets();
    this.loadAppointmentClients();
    this.loadAppointments();
  }

  loadVets(): void {
    this.adminUserService.getVets().subscribe({
      next: (data) => {
        this.vets = data.map(v => {
          const parts = (v.name ?? '').split(' ');
          return { id: String(v.id), firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') ?? '', specialty: '' };
        });
      },
      error: () => this.showToast('Error cargando veterinarios', 'error')
    });
  }

  loadAllPets(): void {
    this.loadingPets = true;
    this.adminUserService.getAllPets().subscribe({
      next: (pets) => {
        this.allPets     = pets;
        this.loadingPets = false;
        if (this.selectedExistingClient) this.loadPetsForClient(this.selectedExistingClient);
      },
      error: () => { this.loadingPets = false; this.showToast('Error cargando mascotas', 'error'); }
    });
  }

  loadAppointmentClients(): void {
    this.adminUserService.getClients().subscribe({
      next: (data) => {
        this.appointmentClients = data.map(c => {
          const parts = (c.name ?? '').split(' ');
          return { id: c.id, firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') ?? '', email: c.email, phone: '', registrationDate: '', pets: [] };
        });
      },
      error: () => this.showToast('Error cargando clientes', 'error')
    });
  }

  loadAppointments(): void {
    this.recepService.getAll().subscribe({
      next: (data) => { this.appointments = data.map(a => this.mapRecepApt(a)); this.refreshAll(); },
      error: () => this.showToast('Error cargando citas', 'error')
    });
  }

  loadPetsForClient(client: Client): void {
    const pets = this.allPets
      .filter(p => p.ownerEmail === client.email)
      .filter(p => !p.isDeceased) // Filtrar mascotas fallecidas - no se pueden agendar citas
      .map(p => ({
        id: String(p.id), name: p.name, emoji: this.getEmojiBySpecies(p.species),
        species: p.species, breed: p.breed ?? '—', age: 0, gender: p.sex ?? '',
        color: '', birthDate: p.birthDate, photoUrl: p.photoUrl,
        isHospitalized: p.isHospitalized // Pasar información de hospitalización
      }));
    this.selectedExistingClient = { ...client, pets };
  }

  // ── Pagos ─────────────────────────────────────────────────────────────────

  loadPayments(): void {
    this.loadingPayments = true;
    this.paymentService.getAllPayments().subscribe({
      next: (data: PaymentResponse[]) => {
        this.payments = data; this.filterPayments(); this.calcPaymentStats(); this.loadingPayments = false;
      },
      error: () => { this.loadingPayments = false; }
    });
  }

  loadServicePrices(): void {
    this.paymentService.getActivePrices().subscribe({
      next: (data: ServicePrice[]) => { this.servicePrices = data.filter(p => p.active); },
      error: () => {}
    });
  }

  loadAvailableServices(): void {
    this.loadingServices = true;
    this.paymentService.getActivePrices().subscribe({
      next: (data: ServicePrice[]) => {
        this.availableServices = data.map(s => ({
          id: s.id,
          serviceType: s.serviceType,
          displayName: s.displayName,
          price: s.price,
          description: s.description || '',
          active: s.active
        }));
        this.loadingServices = false;
      },
      error: () => { this.loadingServices = false; }
    });
  }

  calcPaymentStats(): void {
    const today = this.getTodayString();
    this.paymentStats = {
      total:        this.payments.length,
      pending:      this.payments.filter(p => p.status === 'PENDING').length,
      paid:         this.payments.filter(p => p.status === 'PAID').length,
      todayRevenue: this.payments.filter(p => p.status === 'PAID' && p.paymentDate?.startsWith(today)).reduce((sum, p) => sum + (p.amount ?? 0), 0)
    };
  }

  filterPayments(): void {
    const s = this.paymentSearch.toLowerCase();
    this.filteredPayments = this.payments.filter(p => {
      const matchSearch = !s || `${p.clientName} ${p.petName} ${p.concept}`.toLowerCase().includes(s);
      const matchStatus = !this.paymentStatusFilter || p.status === this.paymentStatusFilter;
      const matchDate   = !this.paymentDateFilter   || p.appointmentDate?.startsWith(this.paymentDateFilter);
      return matchSearch && matchStatus && matchDate;
    });
  }

  openPaymentModal(apt: Appointment): void {
    this.paymentApt = apt; this.paymentConcept = apt.reason;
    this.paymentNotes = ''; this.paymentBaseAmount = this.getPriceForConcept(apt.reason);
    this.paymentMedCost = 0;
    this.paymentTotalAmount = this.paymentBaseAmount;
    this.paymentAjustarPrecio = false;
    this.paymentMontoAjustado = 0;

    // Consultar si hay registro médico con costos calculados por el vet
    this.medicalRecordService.obtenerPorCita(Number(apt.id)).subscribe({
      next: (record) => {
        if (record?.costoTotal && record.costoTotal > 0) {
          this.paymentMedCost = record.costoMedicamentos ?? 0;
          this.paymentTotalAmount = record.costoTotal;
          this.paymentBaseAmount = record.costoTotal;
        }
      },
      error: () => { /* sin registro médico aún, usar precio base */ }
    });

    this.showPaymentModal = true;
  }

  closePaymentModal(): void {
    this.showPaymentModal = false; this.paymentApt = null;
    this.paymentAjustarPrecio = false; this.paymentMontoAjustado = 0; this.paymentNotes = '';
  }

  onAjustarPrecioChange(): void {
    if (!this.paymentAjustarPrecio) {
      this.paymentMontoAjustado = 0;
      this.paymentNotes = '';
    } else {
      this.paymentMontoAjustado = this.paymentBaseAmount;
    }
  }

  getPriceForConcept(concept: string): number {
    const sp = this.servicePrices.find(p => p.serviceType.toLowerCase() === concept.toLowerCase());
    return sp?.price ?? 0;
  }

  onConceptChange(): void { this.paymentBaseAmount = this.getPriceForConcept(this.paymentConcept); }

  savePayment(): void {
    if (!this.paymentApt || this.paymentBaseAmount <= 0) return;
    if (this.paymentAjustarPrecio && !this.paymentNotes.trim()) return;

    const montoFinal = this.paymentAjustarPrecio && this.paymentMontoAjustado > 0
      ? this.paymentMontoAjustado
      : this.paymentBaseAmount;

    this.savingPayment = true;
    this.paymentService.createPayment({
      appointmentId: Number(this.paymentApt.id),
      clientName: `${this.paymentApt.clientFirstName} ${this.paymentApt.clientLastName}`,
      clientEmail: this.paymentApt.clientEmail, petName: this.paymentApt.petName,
      vetName: `${this.paymentApt.vetFirstName} ${this.paymentApt.vetLastName}`,
      appointmentDate: this.paymentApt.date, appointmentTime: this.paymentApt.time,
      concept: this.paymentApt.reason, baseAmount: this.paymentBaseAmount,
      amount: montoFinal, notes: this.paymentNotes
    }).subscribe({
      next: () => { this.savingPayment = false; this.closePaymentModal(); this.loadPayments(); this.showToast('Pago registrado correctamente', 'success'); },
      error: () => { this.savingPayment = false; this.showToast('Error al registrar el pago', 'error'); }
    });
  }

  confirmPaymentCash(pay: PaymentResponse): void {
    if (!confirm(`¿Confirmar cobro de $${pay.amount?.toLocaleString()} a ${pay.clientName}?`)) return;
    this.paymentService.markAsPaid(pay.id).subscribe({
      next: () => { pay.status = 'PAID'; this.calcPaymentStats(); this.showToast('Pago confirmado ✓', 'success'); },
      error: () => this.showToast('Error al confirmar el pago', 'error')
    });
  }

  // ── Tab Clientes — CRUD ───────────────────────────────────────────────────

  loadRecepClients(): void {
    this.loadingClients = true;
    this.recepClientService.getClients().subscribe({
      next: (data) => { this.recepClients = data; this.applyClientSearch(); this.loadingClients = false; },
      error: () => { this.loadingClients = false; }
    });
  }

  applyClientSearch(): void {
    const q = this.clientSearch.toLowerCase().trim();
    this.filteredRecepClients = q
      ? this.recepClients.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      : [...this.recepClients];
  }

  selectClient(client: RecepClient): void {
    this.selectedClient = client;
    this.loadClientPets(client.email);
  }

  loadClientPets(email: string): void {
    this.loadingClientPets  = true;
    this.selectedClientPets = [];
    this.recepClientService.getPetsByClient(email).subscribe({
      next: (pets) => { this.selectedClientPets = pets; this.loadingClientPets = false; },
      error: () => { this.loadingClientPets = false; }
    });
  }

  openCreateClientModal(): void {
    this.clientForm = { nombre: '', email: '' };
    this.showCreateClientModal = true;
  }

  openEditClientModal(client: RecepClient): void {
    this.editingClientId = client.id;
    this.editClientForm  = {
      nombre:   client.name,
      email:    client.email,
      telefono: client.phone ?? ''
    };
    this.showEditClientModal = true;
  }

  closeClientModal(): void {
    this.showCreateClientModal = false; this.showEditClientModal = false;
    this.savingClient = false; this.editingClientId = null;
  }

  saveNewClient(): void {
    if (!this.clientForm.nombre.trim() || !this.clientForm.email.trim()) return;
    this.savingClient = true;
    this.recepClientService.createClient({
      name:  this.clientForm.nombre.trim(),
      email: this.clientForm.email.trim()
    }).subscribe({
      next: (created) => {
        this.recepClients.unshift(created);
        this.applyClientSearch();
        this.closeClientModal();
        this.showToast('Cliente creado — contraseña enviada a su correo 📧', 'success');
        this.loadAppointmentClients();
      },
      error: () => { this.savingClient = false; this.showToast('Error al crear el cliente', 'error'); }
    });
  }

  saveEditClient(): void {
    if (!this.editingClientId || !this.editClientForm.nombre.trim()) return;
    this.savingClient = true;
    this.recepClientService.updateClient(this.editingClientId, {
      nombre:   this.editClientForm.nombre.trim(),
      email:    this.editClientForm.email?.trim()    || undefined,
      telefono: this.editClientForm.telefono?.trim() || undefined
    }).subscribe({
      next: (updated) => {
        const idx = this.recepClients.findIndex(c => c.id === updated.id);
        if (idx > -1) this.recepClients[idx] = updated;
        if (this.selectedClient?.id === updated.id) this.selectedClient = updated;
        this.applyClientSearch();
        this.loadAppointmentClients();
        this.closeClientModal();
        this.showToast('Cliente actualizado', 'success');
      },
      error: () => { this.savingClient = false; this.showToast('Error al actualizar el cliente', 'error'); }
    });
  }

  toggleRecepClient(client: RecepClient): void {
    this.recepClientService.toggleClient(client.id).subscribe({
      next: () => {
        client.enabled = !client.enabled;
        if (this.selectedClient?.id === client.id) this.selectedClient = { ...client };
        this.showToast(client.enabled ? 'Cliente activado' : 'Cliente desactivado', 'success');
      },
      error: () => this.showToast('Error al cambiar el estado', 'error')
    });
  }

  // ── Eliminar cliente ──────────────────────────────────────────────────────

  confirmDeleteClient(client: RecepClient): void {
    this.clientToDelete       = client;
    this.showDeleteClientModal = true;
  }

  deleteClient(): void {
    if (!this.clientToDelete) return;
    this.deletingClient = true;
    this.recepClientService.deleteClient(this.clientToDelete.id).subscribe({
      next: () => {
        this.recepClients = this.recepClients.filter(c => c.id !== this.clientToDelete!.id);
        this.applyClientSearch();
        if (this.selectedClient?.id === this.clientToDelete!.id) {
          this.selectedClient     = null;
          this.selectedClientPets = [];
        }
        this.showDeleteClientModal = false;
        this.deletingClient        = false;
        this.clientToDelete        = null;
        this.loadAppointmentClients();
        this.showToast('Cliente eliminado correctamente', 'success');
      },
      error: () => {
        this.deletingClient = false;
        this.showToast('Error al eliminar el cliente', 'error');
      }
    });
  }

  // ── Mascotas ──────────────────────────────────────────────────────────────

  openAddPetModal(): void {
    this.editingPet = null;
    this.petForm = { name: '', species: '', breed: '', sex: '', birthDate: '', photoUrl: '' };
    this.showPetModal = true;
  }

  openEditPetModal(pet: RecepPet): void {
    this.editingPet = pet;
    this.petForm = { name: pet.name, species: pet.species, breed: pet.breed, sex: pet.sex, birthDate: pet.birthDate, photoUrl: pet.photoUrl ?? '' };
    this.showPetModal = true;
  }

  closePetModal(): void {
    this.showPetModal = false; this.savingPet = false; this.editingPet = null;
    this.showCalendarPetBirth = false;
  }

  onPetModalPhotoChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingPetPhoto = true;
    this.adminUserService.uploadPhoto(file).subscribe({
      next: (res) => { this.petForm.photoUrl = res.secure_url; this.uploadingPetPhoto = false; },
      error: () => { this.uploadingPetPhoto = false; this.showToast('Error al subir la foto', 'error'); }
    });
  }

  savePet(): void {
    if (!this.selectedClient) return;
    this.savingPet = true;
    const req = {
      name: this.petForm.name, species: this.petForm.species, breed: this.petForm.breed,
      sex: this.petForm.sex, birthDate: this.petForm.birthDate,
      photoUrl: this.petForm.photoUrl || undefined, ownerEmail: this.selectedClient.email
    };
    const call = this.editingPet
      ? this.recepClientService.updatePet(this.editingPet.id, req)
      : this.recepClientService.createPet(req);
    call.subscribe({
      next: (saved) => {
        if (this.editingPet) {
          const idx = this.selectedClientPets.findIndex(p => p.id === saved.id);
          if (idx > -1) this.selectedClientPets[idx] = saved;
        } else {
          this.selectedClientPets.push(saved);
        }
        this.loadAllPets(); this.closePetModal();
        this.showToast(this.editingPet ? 'Mascota actualizada' : 'Mascota agregada', 'success');
      },
      error: () => { this.savingPet = false; this.showToast('Error al guardar la mascota', 'error'); }
    });
  }

  confirmDeletePet(pet: RecepPet): void { this.petToDelete = pet; this.showDeletePetModal = true; }

  deletePet(): void {
    if (!this.petToDelete) return;
    this.deletingPet = true;
    this.recepClientService.deletePet(this.petToDelete.id).subscribe({
      next: () => {
        this.selectedClientPets = this.selectedClientPets.filter(p => p.id !== this.petToDelete!.id);
        this.loadAllPets(); this.showDeletePetModal = false; this.deletingPet = false;
        this.petToDelete = null; this.showToast('Mascota eliminada', 'success');
      },
      error: () => { this.deletingPet = false; this.showToast('Error al eliminar la mascota', 'error'); }
    });
  }

  // ── Calendario birthDate mascota ──────────────────────────────────────────

  toggleCalendarPetBirth(e: Event): void {
    e.stopPropagation();
    this.showCalendarApt  = false;
    this.showCalendarEdit = false;
    this.showCalendarPetBirth = !this.showCalendarPetBirth;
    if (this.showCalendarPetBirth) this.syncCalendarPetBirthToForm();
  }

  syncCalendarPetBirthToForm(): void {
    const v = this.petForm.birthDate;
    if (v) {
      const [y, m] = v.split('-');
      this.calYearPetBirth  = +y;
      this.calMonthPetBirth = +m - 1;
    } else {
      this.calYearPetBirth  = new Date().getFullYear();
      this.calMonthPetBirth = new Date().getMonth();
    }
    this.buildCalendarPetBirth();
  }

  buildCalendarPetBirth(): void {
    this.calDaysPetBirth = this.buildCalendarFor(this.calYearPetBirth, this.calMonthPetBirth);
  }

  prevMonthPetBirth(): void {
    if (this.calMonthPetBirth === 0) { this.calMonthPetBirth = 11; this.calYearPetBirth--; }
    else this.calMonthPetBirth--;
    this.buildCalendarPetBirth();
  }

  nextMonthPetBirth(): void {
    if (this.isNextPetBirthMonthDisabled()) return;
    if (this.calMonthPetBirth === 11) { this.calMonthPetBirth = 0; this.calYearPetBirth++; }
    else this.calMonthPetBirth++;
    this.buildCalendarPetBirth();
  }

  selectDayPetBirth(day: number): void {
    if (!day || this.isPetBirthDayDisabled(day)) return;
    const mm = String(this.calMonthPetBirth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    this.petForm.birthDate = `${this.calYearPetBirth}-${mm}-${dd}`;
    this.newPetForm?.get('birthDate')?.setValue(this.petForm.birthDate);
    this.showCalendarPetBirth = false;
  }

  isPetBirthDayDisabled(day: number): boolean {
    if (!day) return true;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(this.calYearPetBirth, this.calMonthPetBirth, day) > today;
  }

  isNextPetBirthMonthDisabled(): boolean {
    const now = new Date();
    return this.calYearPetBirth === now.getFullYear() && this.calMonthPetBirth === now.getMonth();
  }

  // ── Validación nombre cliente nuevo (máximo 2 palabras) ───────────────────

  onClientNameKeydown(event: KeyboardEvent): void {
    if (event.key === ' ') {
      const val = (event.target as HTMLInputElement).value;
      const words = val.trim().split(/\s+/).filter(w => w.length > 0);
      if (words.length >= 2) event.preventDefault();
    }
  }

  onClientNamePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted  = event.clipboardData?.getData('text') ?? '';
    const words   = pasted.trim().split(/\s+/).filter(w => w.length > 0).slice(0, 2);
    const cleaned = words.join(' ');
    const input   = event.target as HTMLInputElement;
    const start   = input.selectionStart ?? 0;
    const end     = input.selectionEnd   ?? 0;
    const merged  = (input.value.slice(0, start) + cleaned + input.value.slice(end)).replace(/^\s+/, '');
    const final   = merged.trim().split(/\s+/).filter((w: string) => w.length > 0).slice(0, 2).join(' ');
    input.value   = final;
    input.dispatchEvent(new Event('input'));
    this.newClientForm.get('name')?.setValue(final);
  }

  // ── Mapeo backend → local ─────────────────────────────────────────────────

  private mapRecepApt(a: RecepAppointment): Appointment {
    const clientParts = (a.clientName ?? '').split(' ');
    const vetParts    = (a.vetName    ?? '').split(' ');
    let status = a.status;
    if (status === 'UPCOMING' && a.date && a.time) {
      if (new Date(`${a.date}T${a.time}`) < new Date()) status = 'NO_SHOW';
    }
    return {
      id: String(a.id ?? ''),
      date: a.date ?? '',
      time: (a.time ?? '').substring(0, 5),
      reason: a.reason ?? '',
      notes: a.notes ?? '',
      status: status as Appointment['status'],
      cancelReason: a.cancelReason,
      clientId: String(a.clientId ?? ''),
      clientFirstName: clientParts[0] ?? '',
      clientLastName: clientParts.slice(1).join(' ') ?? '',
      clientEmail: a.clientEmail ?? '',
      petId: String(a.petId ?? ''),
      petName: a.petName ?? '',
      petEmoji: this.getEmojiBySpecies(a.petSpecies ?? ''),
      petSpecies: a.petSpecies ?? '',
      vetId: String(a.vetId ?? ''),
      vetFirstName: vetParts[0] ?? '',
      vetLastName: vetParts.slice(1).join(' ') ?? '',
      vetSpecialty: ''
    };
  }

  private getEmojiBySpecies(species: string): string {
    const map: Record<string, string> = { 'Perro': '🐕', 'Gato': '🐈', 'Conejo': '🐇', 'Ave': '🐦', 'Hamster': '🐹' };
    return map[species] ?? '🐾';
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  setTab(tab: string): void {
    const valid = ['inicio','nueva-cita','todas-citas','pagos','clientes'];
    if (valid.includes(tab)) {
      this.activeTab = tab as typeof this.activeTab;
      if (tab === 'nueva-cita') this.resetNewAptFlow();
      if (tab === 'pagos')      this.loadPayments();
      if (tab === 'clientes')   this.loadRecepClients();
    }
  }

  getActiveTabLabel(): string {
    const labels: Record<string, string> = {
      'inicio': 'Panel del Recepcionista', 'nueva-cita': 'Crear Nueva Cita',
      'todas-citas': 'Todas las Citas', 'pagos': 'Gestión de Pagos', 'clientes': 'Gestión de Clientes'
    };
    return labels[this.activeTab] ?? '';
  }

  getActiveTabSub(): string {
    const subs: Record<string, string> = {
      'inicio': 'Resumen de citas del día y estadísticas semanales',
      'nueva-cita': 'Registra una nueva cita para un cliente existente o nuevo',
      'todas-citas': 'Visualiza y gestiona todas las citas del sistema',
      'pagos': 'Registra y confirma cobros de citas',
      'clientes': 'Administra clientes y sus mascotas'
    };
    return subs[this.activeTab] ?? '';
  }

  // ── Formularios ───────────────────────────────────────────────────────────

  buildForms(): void {
    this.newClientForm = this.fb.group({
      name:  ['', [Validators.required, Validators.pattern(/^[^\s]+\s[^\s]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^3[0-9]{9}$/)]]
    });

    this.newPetForm = this.fb.group({
      name:      ['', Validators.required], species: ['', Validators.required],
      breed:     ['', Validators.required], birthDate: ['', Validators.required],
      gender:    ['', Validators.required], color: [''],
      // Información médica inicial (opcional)
      bloodType: [''],
      knownAllergies: [''],
      chronicConditions: [''],
      currentMedications: [''],
      additionalNotes: ['']
    });
    this.newAptForm = this.fb.group({
      date: ['', Validators.required], time: ['', Validators.required],
      vetId: ['', Validators.required], reason: ['', Validators.required], notes: ['']
    });
    this.editAptForm = this.fb.group({
      date: ['', Validators.required], time: ['', Validators.required],
      vetId: ['', Validators.required], reason: [''], notes: ['']
    });
  }

  isClientFieldInvalid(f: string): boolean { const c = this.newClientForm.get(f); return !!(c?.invalid && (c.dirty || c.touched)); }
  isPetFieldInvalid(f: string):    boolean { const c = this.newPetForm.get(f);    return !!(c?.invalid && (c.dirty || c.touched)); }
  isAptFieldInvalid(f: string):    boolean { const c = this.newAptForm.get(f);    return !!(c?.invalid && (c.dirty || c.touched)); }

  // ── Calendarios citas ─────────────────────────────────────────────────────

  private buildCalendarFor(year: number, month: number): number[] {
    const firstDay    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: number[] = [];
    for (let i = 0; i < firstDay; i++) days.push(0);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }

  buildCalendarApt():  void { this.calDaysApt  = this.buildCalendarFor(this.calYearApt,  this.calMonthApt);  }
  buildCalendarEdit(): void { this.calDaysEdit = this.buildCalendarFor(this.calYearEdit, this.calMonthEdit); }

  toggleCalendarApt (e: Event): void { e.stopPropagation(); this.showCalendarEdit = false; this.showCalendarPetBirth = false; this.showCalendarApt  = !this.showCalendarApt;  }
  toggleCalendarEdit(e: Event): void { e.stopPropagation(); this.showCalendarApt  = false; this.showCalendarPetBirth = false; this.showCalendarEdit = !this.showCalendarEdit; }

  prevMonthApt():  void { if (this.calMonthApt  === 0)  { this.calMonthApt  = 11; this.calYearApt--;  } else this.calMonthApt--;  this.buildCalendarApt();  }
  nextMonthApt():  void { if (this.calMonthApt  === 11) { this.calMonthApt  = 0;  this.calYearApt++;  } else this.calMonthApt++;  this.buildCalendarApt();  }
  prevMonthEdit(): void { if (this.calMonthEdit === 0)  { this.calMonthEdit = 11; this.calYearEdit--; } else this.calMonthEdit--; this.buildCalendarEdit(); }
  nextMonthEdit(): void { if (this.calMonthEdit === 11) { this.calMonthEdit = 0;  this.calYearEdit++; } else this.calMonthEdit++; this.buildCalendarEdit(); }

  selectDayApt(day: number): void {
    if (!day || this.isCalDayDisabled(day, this.calYearApt, this.calMonthApt, true)) return;
    const mm = String(this.calMonthApt + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    this.newAptForm.get('date')?.setValue(`${this.calYearApt}-${mm}-${dd}`);
    this.showCalendarApt = false; this.loadAvailableSlots();
  }

  selectDayEdit(day: number): void {
    if (!day || this.isCalDayDisabled(day, this.calYearEdit, this.calMonthEdit, true)) return;
    const mm = String(this.calMonthEdit + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    this.editAptForm.get('date')?.setValue(`${this.calYearEdit}-${mm}-${dd}`);
    this.showCalendarEdit = false;
  }

  isCalDayDisabled(day: number, year: number, month: number, onlyFuture: boolean): boolean {
    if (!day) return true;
    if (!onlyFuture) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(year, month, day) < today;
  }

  isCalDaySelected(day: number, year: number, month: number, formValue: string | null): boolean {
    if (!day || !formValue) return false;
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return formValue === `${year}-${mm}-${dd}`;
  }

  isCalDayToday(day: number, year: number, month: number): boolean {
    if (!day) return false;
    const t = new Date();
    return day === t.getDate() && month === t.getMonth() && year === t.getFullYear();
  }

  syncCalendarAptToForm(): void {
    const v = this.newAptForm.get('date')?.value;
    if (v) { const [y, m] = v.split('-'); this.calYearApt = +y; this.calMonthApt = +m - 1; }
    else { this.calYearApt = new Date().getFullYear(); this.calMonthApt = new Date().getMonth(); }
    this.buildCalendarApt();
  }

  syncCalendarEditToForm(): void {
    const v = this.editAptForm.get('date')?.value;
    if (v) { const [y, m] = v.split('-'); this.calYearEdit = +y; this.calMonthEdit = +m - 1; }
    else { this.calYearEdit = new Date().getFullYear(); this.calMonthEdit = new Date().getMonth(); }
    this.buildCalendarEdit();
  }

  // ── Estadísticas ──────────────────────────────────────────────────────────

  getTodayString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private toLocalDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  getNowTimeString(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  get minAppointmentDate(): string { return this.getTodayString(); }

  loadAvailableSlots(): void {
    const dateVal = this.newAptForm.get('date')?.value;
    const vetId   = this.newAptForm.get('vetId')?.value;
    if (!dateVal || !vetId) { this.timeSlots = []; return; }
    this.loadingSlots = true;
    this.newAptForm.get('time')?.setValue('');
    this.appointmentService.getOccupiedSlotsRecep(Number(vetId), dateVal).subscribe({
      next: (occupied: string[]) => {
        const isToday = dateVal === this.getTodayString();
        const nowTime = this.getNowTimeString();
        this.timeSlots = this.ALL_SLOTS.map(time => {
          if (isToday && time <= nowTime) return { time, status: 'past' as const };
          if (occupied.some(o => o.startsWith(time))) return { time, status: 'taken' as const };
          return { time, status: 'available' as const };
        });
        this.loadingSlots = false;
      },
      error: () => {
        const isToday = dateVal === this.getTodayString();
        const nowTime = this.getNowTimeString();
        this.timeSlots = this.ALL_SLOTS.map(time => ({ time, status: (isToday && time <= nowTime) ? 'past' as const : 'available' as const }));
        this.loadingSlots = false;
      }
    });
  }

  filterTodayAppointments(): void {
    const s     = this.todaySearch.toLowerCase();
    const today = this.getTodayString();
    this.filteredTodayAppointments = this.appointments.filter(a =>
      a.date === today && (!s || `${a.clientFirstName} ${a.clientLastName} ${a.petName}`.toLowerCase().includes(s))
    );
    this.updateTodayStats();
  }

  updateTodayStats(): void {
    const todayApts = this.appointments.filter(a => a.date === this.getTodayString());
    this.todayStats = [
      { icon: '📋', label: 'Total hoy',   value: todayApts.length },
      { icon: '⏳', label: 'Pendientes',  value: todayApts.filter(a => a.status === 'UPCOMING').length },
      { icon: '✅', label: 'Confirmadas', value: todayApts.filter(a => a.status === 'CONFIRMED').length },
      { icon: '❌', label: 'Canceladas',  value: todayApts.filter(a => a.status === 'CANCELLED').length }
    ];
  }

  buildWeeklyData(): void {
    const today    = new Date();
    const dayNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const monday   = new Date(today);
    monday.setDate(today.getDate() + (today.getDay() === 0 ? -6 : 1 - today.getDay()));
    let maxCount = 0;
    const days: WeekDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      const dateStr = this.toLocalDateStr(d);
      const count   = this.appointments.filter(a => a.date === dateStr && a.status !== 'CANCELLED').length;
      if (count > maxCount) maxCount = count;
      days.push({ day: dayNames[d.getDay()], count, pct: 0, isToday: dateStr === this.getTodayString(), date: dateStr });
    }
    this.weeklyData = days.map(d => ({ ...d, pct: maxCount > 0 ? Math.round((d.count / maxCount) * 100) : 0 }));
  }

  buildCancelledThisWeek(): void {
    const { mondayStr, sundayStr } = this.getWeekRange();
    this.cancelledThisWeek = this.appointments.filter(a => a.status === 'CANCELLED' && a.date >= mondayStr && a.date <= sundayStr);
  }

  buildVetStats(): void {
    const { mondayStr, sundayStr } = this.getWeekRange();
    const weekApts = this.appointments.filter(a => a.date >= mondayStr && a.date <= sundayStr && a.status !== 'CANCELLED');
    let maxCount = 0;
    const stats = this.vets.map(v => {
      const count = weekApts.filter(a => a.vetId === v.id).length;
      if (count > maxCount) maxCount = count;
      return { firstName: v.firstName, lastName: v.lastName, count, pct: 0 };
    });
    this.vetStats = stats.map(s => ({ ...s, pct: maxCount > 0 ? Math.round((s.count / maxCount) * 100) : 0 })).sort((a, b) => b.count - a.count);
  }

  private getWeekRange(): { mondayStr: string; sundayStr: string } {
    const today  = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() + (today.getDay() === 0 ? -6 : 1 - today.getDay()));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    return { mondayStr: this.toLocalDateStr(monday), sundayStr: this.toLocalDateStr(sunday) };
  }

  filterAllAppointments(): void {
    const s = this.allAptSearch.toLowerCase();
    this.filteredAllAppointments = this.appointments.filter(a => {
      const matchSearch = !s || `${a.clientFirstName} ${a.clientLastName} ${a.petName} ${a.vetFirstName} ${a.vetLastName}`.toLowerCase().includes(s);
      const matchStatus = !this.allAptStatusFilter || a.status === this.allAptStatusFilter;
      const matchVet    = !this.allAptVetFilter    || a.vetId  === this.allAptVetFilter;
      const matchDate   = !this.allAptDateFilter   || a.date   === this.allAptDateFilter;
      return matchSearch && matchStatus && matchVet && matchDate;
    });
  }

  hasActiveFilters(): boolean { return !!(this.allAptSearch || this.allAptStatusFilter || this.allAptVetFilter || this.allAptDateFilter); }

  clearAllAptFilters(): void {
    this.allAptSearch = this.allAptStatusFilter = this.allAptVetFilter = this.allAptDateFilter = '';
    this.filterAllAppointments();
  }

  confirmAppointment(apt: Appointment): void {
    this.recepService.confirm(Number(apt.id)).subscribe({
      next: () => { apt.status = 'CONFIRMED'; this.refreshAll(); this.showToast('Cita confirmada', 'success'); },
      error: () => this.showToast('Error al confirmar la cita', 'error')
    });
  }

  markNoShow(apt: Appointment): void {
    this.recepService.noShow(Number(apt.id)).subscribe({
      next: () => { apt.status = 'NO_SHOW'; this.refreshAll(); this.showToast('Inasistencia registrada', 'success'); },
      error: () => this.showToast('Error al registrar inasistencia', 'error')
    });
  }

  openCancelModal(apt: Appointment): void { this.aptToCancel = apt; this.cancelReason = ''; this.showCancelModal = true; }
  closeCancelModal(): void { this.showCancelModal = false; this.aptToCancel = null; }

  cancelAppointment(): void {
    if (!this.aptToCancel) return;
    this.cancellingApt = true;
    this.recepService.cancel(Number(this.aptToCancel.id), this.cancelReason).subscribe({
      next: () => {
        this.aptToCancel!.status = 'CANCELLED'; this.aptToCancel!.cancelReason = this.cancelReason;
        this.refreshAll(); this.cancellingApt = false; this.closeCancelModal();
        this.showToast('Cita cancelada', 'success');
      },
      error: () => { this.cancellingApt = false; this.showToast('Error al cancelar', 'error'); }
    });
  }

  openEditAppointmentModal(apt: Appointment): void {
    this.editingApt = apt;
    this.editAptForm.patchValue({ date: apt.date, time: apt.time, vetId: String(apt.vetId), reason: apt.reason, notes: apt.notes });
    this.syncCalendarEditToForm(); this.showEditAptModal = true;
  }

  closeEditAptModal(): void { this.showEditAptModal = false; this.showCalendarEdit = false; this.editingApt = null; }

  saveEditedApt(): void {
    if (!this.editingApt) return;
    this.savingEditApt = true;
    const val = this.editAptForm.value;
    this.recepService.update(Number(this.editingApt.id), { date: val.date, time: val.time, vetId: Number(val.vetId), reason: val.reason, notes: val.notes }).subscribe({
      next: () => {
        const vet = this.vets.find(v => v.id === val.vetId);
        Object.assign(this.editingApt!, { date: val.date, time: val.time, vetId: val.vetId, vetFirstName: vet?.firstName ?? '', vetLastName: vet?.lastName ?? '', reason: val.reason, notes: val.notes });
        this.refreshAll(); this.savingEditApt = false; this.closeEditAptModal(); this.showToast('Cita actualizada', 'success');
      },
      error: () => { this.savingEditApt = false; this.showToast('Error al actualizar', 'error'); }
    });
  }

  resetNewAptFlow(): void {
    this.showCalendarApt = false; this.showCalendarPetBirth = false;
    this.showMedicalSection = false;  // Resetear sección médica
    this.newAptStep = 1; this.clientMode = 'existing'; this.petMode = 'existing';
    this.clientSearchQuery = ''; this.clientSearchResults = []; this.clientSearchTouched = false;
    this.selectedExistingClient = null; this.selectedPet = null; this.petPhotoPreview = null;
    this.buildForms();
  }

  searchExistingClients(): void {
    const q = this.clientSearchQuery.toLowerCase().trim();
    if (q.length < 2) { this.clientSearchResults = []; this.clientSearchTouched = false; return; }
    this.clientSearchTouched = true;
    this.clientSearchResults = this.appointmentClients.filter(c =>
      `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(q)
    );
  }

  get noSlotsAvailable(): boolean { return this.timeSlots.length > 0 && this.timeSlots.every(s => s.status !== 'available'); }

  get showNoResults(): boolean {
    return this.clientSearchTouched && this.clientSearchQuery.trim().length >= 2 && this.clientSearchResults.length === 0 && !this.selectedExistingClient;
  }

  selectExistingClient(c: Client): void {
    this.selectedPet = null; this.clientSearchQuery = `${c.firstName} ${c.lastName}`;
    this.clientSearchResults = []; this.clientSearchTouched = false; this.loadPetsForClient(c);
  }

  countPetsForClient(email: string): number { 
    return this.allPets.filter(p => p.ownerEmail === email && !p.isDeceased).length; 
  }

  clearSelectedClient(): void {
    this.selectedExistingClient = null; this.selectedPet = null;
    this.clientSearchQuery = ''; this.clientSearchResults = []; this.clientSearchTouched = false;
  }

  canProceedStep1(): boolean { return this.clientMode === 'existing' ? !!this.selectedExistingClient : this.newClientForm.valid; }

  goToStep2(): void {
    if (!this.canProceedStep1()) { if (this.clientMode === 'new') this.newClientForm.markAllAsTouched(); return; }
    this.newAptStep = 2;
    this.petMode = (this.clientMode === 'existing' && (this.selectedExistingClient?.pets.length ?? 0) > 0) ? 'existing' : 'new';
  }

  selectPet(pet: ClientPet): void { this.selectedPet = pet; }

  onPetPhotoChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.adminUserService.uploadPhoto(file).subscribe({
      next: (res) => { this.petPhotoPreview = res.secure_url; },
      error: () => this.showToast('Error al subir la foto', 'error')
    });
  }

  removePetPhoto():  void { this.petPhotoPreview = null; }
  
  toggleMedicalSection(): void { 
    this.showMedicalSection = !this.showMedicalSection; 
  }
  
  onSpeciesChange(): void { /* reservado */ }

  getPetEmojiForSpecies(): string {
    const map: Record<string, string> = { 'Perro': '🐕', 'Gato': '🐈', 'Conejo': '🐇', 'Ave': '🐦', 'Otro': '🐾' };
    return map[this.newPetForm?.get('species')?.value ?? ''] ?? '🐾';
  }

  canProceedStep2(): boolean {
    if (this.petMode === 'existing' && this.selectedPet) return true;
    if (this.petMode === 'new' || this.clientMode === 'new') return this.newPetForm.valid;
    return false;
  }

  goToStep3(): void {
    if (!this.canProceedStep2()) { if (this.petMode === 'new' || this.clientMode === 'new') this.newPetForm.markAllAsTouched(); return; }
    this.newAptStep = 3;
  }

  getClientForSummary(): Partial<Client> | null {
    if (this.clientMode === 'existing') return this.selectedExistingClient;
    const v = this.newClientForm.value; const parts = (v.name ?? '').split(' ');
    return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') ?? '', email: v.email };
  }

  getPetNameForSummary(): string {
    if (this.petMode === 'existing' && this.selectedPet) return this.selectedPet.name;
    return this.newPetForm.get('name')?.value || 'Nueva mascota';
  }

  saveNewAppointment(): void {
    if (this.newAptForm.invalid) { this.newAptForm.markAllAsTouched(); return; }
    const { date, time } = this.newAptForm.value;
    const slot = this.timeSlots.find(s => s.time === time);
    if (slot?.status === 'past')  { this.showToast('Ese horario ya pasó, elige una hora futura', 'error'); return; }
    if (slot?.status === 'taken') { this.showToast('Ese horario ya está ocupado para este veterinario', 'error'); return; }
    if (new Date(`${date}T${time}`) <= new Date()) { this.showToast('No puedes agendar citas en el pasado', 'error'); return; }
    this.savingApt = true;
    const aVal = this.newAptForm.value;

    if (this.clientMode === 'existing' && this.petMode === 'existing') {
      this.recepService.create({
        clientEmail: this.selectedExistingClient!.email,
        petId: Number(this.selectedPet!.id),
        vetId: Number(aVal.vetId),
        date: aVal.date, time: aVal.time,
        reason: aVal.reason, notes: aVal.notes ?? ''
      }).subscribe({
        next: (created) => this.onAptCreated(created),
        error: () => { this.savingApt = false; this.showToast('Error al crear la cita', 'error'); }
      });
      return;
    }

    if (this.clientMode === 'new') {
      const cv = this.newClientForm.value;
      this.recepClientService.createClient({
        name:  cv.name.trim(),
        email: cv.email.trim(),
        phone: cv.phone?.trim() || undefined
      }).subscribe({
        next: (createdClient) => {
          this.loadAppointmentClients();
          this.crearMascotaYCita(createdClient.email, aVal);
        },
        error: () => { this.savingApt = false; this.showToast('Error al crear el cliente', 'error'); }
      });
      return;
    }

    this.crearMascotaYCita(this.selectedExistingClient!.email, aVal);
  }

  private crearMascotaYCita(clientEmail: string, aVal: any): void {
    const pv = this.newPetForm.value;
    
    // Preparar información médica inicial si se proporcionó
    const medicalProfileInitial = (pv.bloodType || pv.knownAllergies || pv.chronicConditions || pv.currentMedications || pv.additionalNotes) ? {
      bloodType: pv.bloodType?.trim() || undefined,
      knownAllergies: pv.knownAllergies?.trim() || undefined,
      chronicConditions: pv.chronicConditions?.trim() || undefined,
      currentMedications: pv.currentMedications?.trim() || undefined,
      additionalNotes: pv.additionalNotes?.trim() || undefined
    } : undefined;
    
    this.recepClientService.createPet({
      name: pv.name, species: pv.species, breed: pv.breed,
      sex: pv.gender, birthDate: pv.birthDate,
      photoUrl: this.petPhotoPreview ?? undefined,
      ownerEmail: clientEmail,
      medicalProfileInitial
    }).subscribe({
      next: (createdPet) => {
        this.loadAllPets();
        this.recepService.create({
          clientEmail,
          petId: createdPet.id,
          vetId: Number(aVal.vetId),
          date: aVal.date, time: aVal.time,
          reason: aVal.reason, notes: aVal.notes ?? ''
        }).subscribe({
          next: (created) => this.onAptCreated(created),
          error: () => { this.savingApt = false; this.showToast('Error al crear la cita', 'error'); }
        });
      },
      error: () => { this.savingApt = false; this.showToast('Error al crear la mascota', 'error'); }
    });
  }

  private onAptCreated(created: any): void {
    this.appointments.unshift(this.mapRecepApt(created));
    this.refreshAll();
    this.savingApt = false;
    this.resetNewAptFlow();
    this.setTab('inicio');
    this.showToast('Cita creada correctamente', 'success');
  }

  getUserInitials(first: string, last: string): string { return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase(); }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = { UPCOMING: 'Pendiente', CONFIRMED: 'Confirmada', NO_SHOW: 'No asistió', CANCELLED: 'Cancelada', COMPLETED: 'Completada' };
    return labels[status] ?? status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = { UPCOMING: 'status-pendiente', CONFIRMED: 'status-confirmada', NO_SHOW: 'status-no_asistio', CANCELLED: 'status-cancelada', COMPLETED: 'status-completada' };
    return classes[status] ?? '';
  }

  refreshAll(): void {
    this.filterTodayAppointments(); this.filterAllAppointments();
    this.buildWeeklyData(); this.buildCancelledThisWeek(); this.buildVetStats();
  }

  showToast(message: string, type: 'success' | 'error'): void {
    this.toast = { show: true, message, type };
    setTimeout(() => { this.toast.show = false; }, 3000);
  }

  getPaymentForApt(aptId: string): PaymentResponse | undefined {
    return this.payments.find(p => String(p.appointmentId) === aptId);
  }

  getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  validateDateInput(event: any): void {
    const input = event.target as HTMLInputElement;
    const selectedDate = new Date(input.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      input.value = this.getTodayDate();
      this.paymentDateFilter = this.getTodayDate();
    }
  }

  pwHasLength(pw: string):  boolean { return pw.length >= 8; }
  pwHasUpper(pw: string):   boolean { return /[A-Z]/.test(pw); }
  pwHasNumber(pw: string):  boolean { return /\d/.test(pw); }
  pwHasSpecial(pw: string): boolean { return /[@$!%*?&]/.test(pw); }

  get isModalPasswordInvalid(): boolean {
    return false; // ya no se usa — contraseña la genera el backend
  }
}
