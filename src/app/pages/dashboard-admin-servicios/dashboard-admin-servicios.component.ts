import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AppSidebarComponent } from 'src/app/share/components/app-sidebar/app-sidebar.component';
import { AdminPaymentService, ServicePriceItem } from 'src/app/services/admin-payment.service';

@Component({
  selector: 'app-dashboard-admin-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AppSidebarComponent],
  templateUrl: './dashboard-admin-servicios.component.html',
  styleUrls: ['./dashboard-admin-servicios.component.scss']
})
export class DashboardAdminServiciosComponent implements OnInit {

  userName = '';
  userRole = 'ROLE_ADMIN';

  services: ServicePriceItem[] = [];
  filteredServices: ServicePriceItem[] = [];
  serviceSearch = '';
  serviceStatusFilter = '';
  loadingServices = false;

  showServiceModal = false;
  editingService: ServicePriceItem | null = null;
  serviceForm!: FormGroup;
  savingService = false;

  showDeleteModal = false;
  serviceToDelete: ServicePriceItem | null = null;
  deletingService = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly adminPaymentService: AdminPaymentService
  ) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('email') || 'Admin';
    this.userRole = localStorage.getItem('rol') || 'ROLE_ADMIN';
    this.buildServiceForm();
    this.loadServices();
  }

  loadServices(): void {
    this.loadingServices = true;
    this.adminPaymentService.getAllPrices().subscribe({
      next: (data) => {
        this.services = data;
        this.filteredServices = [...data];
        this.loadingServices = false;
      },
      error: () => { this.loadingServices = false; }
    });
  }

  buildServiceForm(service?: ServicePriceItem): void {
    this.serviceForm = this.fb.group({
      serviceType:  [service?.serviceType  || '', Validators.required],
      displayName:  [service?.displayName  || '', Validators.required],
      price:        [service?.price        ?? 0,  [Validators.required, Validators.min(0)]],
      description:  [service?.description  || ''],
      active:       [service?.active       ?? true]
    });

    if (service) {
      // Al editar, serviceType no se puede cambiar
      this.serviceForm.get('serviceType')?.disable();
    } else {
      // Al crear, serviceType se genera automaticamente desde displayName
      this.serviceForm.get('displayName')?.valueChanges.subscribe((val: string) => {
        this.serviceForm.get('serviceType')?.setValue(val ?? '', { emitEvent: false });
      });
    }
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.serviceForm.get(field);
    return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched));
  }

  openCreateServiceModal(): void {
    this.editingService = null;
    this.buildServiceForm();
    this.showServiceModal = true;
  }

  openEditServiceModal(service: ServicePriceItem): void {
    this.editingService = service;
    this.buildServiceForm(service);
    this.showServiceModal = true;
  }

  closeServiceModal(): void {
    this.showServiceModal = false;
    this.editingService = null;
  }

  saveService(): void {
    if (this.serviceForm.invalid) { this.serviceForm.markAllAsTouched(); return; }
    this.savingService = true;

    // getRawValue() incluye los campos disabled (serviceType al editar)
    const raw = this.serviceForm.getRawValue();

    const req = {
      serviceType:  raw.serviceType,
      displayName:  raw.displayName,
      price:        Number(raw.price),
      description:  raw.description || '',
      active:       raw.active
    };

    this.adminPaymentService.upsertPrice(req).subscribe({
      next: () => {
        this.loadServices();
        this.savingService = false;
        this.closeServiceModal();
      },
      error: () => { this.savingService = false; }
    });
  }

  toggleServiceActive(service: ServicePriceItem): void {
    const req = {
      serviceType: service.serviceType,
      displayName: service.displayName,
      price:       service.price,
      description: service.description || '',
      active:      !service.active
    };
    this.adminPaymentService.upsertPrice(req).subscribe({
      next: () => { service.active = !service.active; },
      error: () => {}
    });
  }

  openDeleteModal(service: ServicePriceItem): void {
    this.serviceToDelete = service;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.serviceToDelete = null;
  }

  deleteService(): void {
    if (!this.serviceToDelete?.id) return;
    this.deletingService = true;
    this.adminPaymentService.deletePrice(this.serviceToDelete.id).subscribe({
      next: () => {
        this.loadServices();
        this.deletingService = false;
        this.closeDeleteModal();
      },
      error: () => { this.deletingService = false; }
    });
  }

  filterServices(): void {
    const s = this.serviceSearch.toLowerCase();
    this.filteredServices = this.services.filter(sv => {
      const matchSearch = `${sv.displayName} ${sv.serviceType} ${sv.description || ''}`.toLowerCase().includes(s);
      const matchStatus = !this.serviceStatusFilter
        || (this.serviceStatusFilter === 'active'   ?  sv.active : !sv.active);
      return matchSearch && matchStatus;
    });
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price);
  }

  get activeCount()  { return this.services.filter(s => s.active).length; }
  get inactiveCount(){ return this.services.filter(s => !s.active).length; }
}
