import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppSidebarComponent } from 'src/app/share/components/app-sidebar/app-sidebar.component';
import { PaymentService, PaymentResponse, PaymentStats } from 'src/app/services/Payment.service';

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent],
  templateUrl: './admin-payments.component.html',
  styleUrls: ['./admin-payments.component.scss']
})
export class AdminPaymentsComponent implements OnInit {

  userName = '';
  userRole = 'ROLE_ADMIN';

  payments: PaymentResponse[] = [];
  filteredPayments: PaymentResponse[] = [];
  stats: PaymentStats | null = null;

  searchText     = '';
  statusFilter   = '';
  discountFilter = '';  // '' | 'with' | 'without'
  loading        = true;
  fechaDesde     = '';
  fechaHasta     = '';

  // Fila expandida
  expandedId: number | null = null;

  // Filtro activo combinado
  activeFilter: 'all' | 'paid' | 'pending' | 'paid_discount' | 'paid_no_discount' = 'all';

  setFilter(f: typeof this.activeFilter): void {
    this.activeFilter = f;
    this.filter();
  }

  limpiarFechas(): void {
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.filter();
  }

  // Modal de ajuste
  showAdjustModal   = false;
  adjustingPayment: PaymentResponse | null = null;
  adjustedAmount    = 0;
  adjustReason      = '';
  savingAdjust      = false;
  adjustError       = '';

  get minAllowed(): number {
    return this.adjustingPayment ? Math.ceil(this.adjustingPayment.baseAmount * 0.5) : 0;
  }

  get maxAllowed(): number {
    return this.adjustingPayment ? Math.floor(this.adjustingPayment.baseAmount * 2) : 0;
  }

  get amountValidationError(): string {
    if (!this.adjustingPayment) return '';
    const v = this.adjustedAmount;
    if (v === 0 || v === null || v === undefined) {
      return 'Ingresa un monto mayor a cero. Si necesitas cancelar el cobro, usa el botón "Revertir pago".';
    }
    if (v < 0) {
      return 'El monto no puede ser negativo.';
    }
    if (v < this.minAllowed) {
      return `El monto mínimo permitido es ${this.formatCurrency(this.minAllowed)} (50% del precio original de ${this.formatCurrency(this.adjustingPayment.baseAmount)}). No se permiten descuentos mayores al 50%.`;
    }
    if (v > this.maxAllowed) {
      return `El monto máximo permitido es ${this.formatCurrency(this.maxAllowed)} (200% del precio original). Si el servicio costó más, registra un nuevo pago adicional.`;
    }
    return '';
  }

  get isAmountValid(): boolean {
    return this.amountValidationError === '';
  }

  constructor(private readonly paymentService: PaymentService) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('email') || 'Admin';
    this.userRole = localStorage.getItem('rol')   || 'ROLE_ADMIN';
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.paymentService.getStats().subscribe({ next: (s) => { this.stats = s; }, error: () => {} });
    this.paymentService.getAllPayments().subscribe({
      next: (data) => { this.payments = data; this.filter(); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  filter(): void {
    const s = this.searchText.toLowerCase();
    this.filteredPayments = this.payments.filter(p => {
      const matchSearch = !s || `${p.clientName} ${p.clientEmail} ${p.petName} ${p.vetName} ${p.concept}`.toLowerCase().includes(s);
      const hasDiscount  = p.amount !== p.baseAmount || (!!p.adjustments && p.adjustments.length > 0);
      let matchFilter = true;
      switch (this.activeFilter) {
        case 'paid':            matchFilter = p.status === 'PAID'; break;
        case 'pending':         matchFilter = p.status === 'PENDING'; break;
        case 'paid_discount':   matchFilter = p.status === 'PAID' && hasDiscount; break;
        case 'paid_no_discount':matchFilter = p.status === 'PAID' && !hasDiscount; break;
        default:                matchFilter = true;
      }

      // Filtro por fecha de cita
      let matchFecha = true;
      if (this.fechaDesde || this.fechaHasta) {
        const fechaPago = p.appointmentDate ? new Date(p.appointmentDate + 'T00:00:00') : null;
        if (fechaPago) {
          if (this.fechaDesde) {
            const desde = new Date(this.fechaDesde + 'T00:00:00');
            if (fechaPago < desde) matchFecha = false;
          }
          if (this.fechaHasta) {
            const hasta = new Date(this.fechaHasta + 'T23:59:59');
            if (fechaPago > hasta) matchFecha = false;
          }
        }
      }

      return matchSearch && matchFilter && matchFecha;
    });
  }

  toggleRow(id: number): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  hasDiscount(p: PaymentResponse): boolean {
    return p.amount !== p.baseAmount || (!!p.adjustments && p.adjustments.length > 0);
  }

  getDiscountPct(p: PaymentResponse): number {
    if (!p.baseAmount || p.baseAmount === 0) return 0;
    return Math.round(((p.baseAmount - p.amount) / p.baseAmount) * 100);
  }

  revert(payment: PaymentResponse): void {
    if (!confirm(`¿Revertir el pago #${payment.id} a PENDIENTE?`)) return;
    this.paymentService.revertToPending(payment.id).subscribe({
      next: (updated) => {
        const idx = this.payments.findIndex(p => p.id === updated.id);
        if (idx !== -1) this.payments[idx] = updated;
        this.filter();
        this.loadStats();
      },
      error: () => {}
    });
  }

  openAdjustModal(payment: PaymentResponse): void {
    this.adjustingPayment = payment;
    this.adjustedAmount   = payment.amount;
    this.adjustReason     = '';
    this.adjustError      = '';
    this.savingAdjust     = false;
    this.showAdjustModal  = true;
  }

  closeAdjustModal(): void {
    this.showAdjustModal  = false;
    this.adjustingPayment = null;
  }

  confirmAdjust(): void {
    if (!this.adjustingPayment) return;
    if (!this.adjustReason.trim() || this.adjustReason.trim().length < 10) {
      this.adjustError = 'El motivo debe tener al menos 10 caracteres';
      return;
    }
    if (!this.isAmountValid) {
      this.adjustError = this.amountValidationError;
      return;
    }
    this.savingAdjust = true;
    this.adjustError  = '';
    this.paymentService.adjustPayment(this.adjustingPayment.id, {
      adjustedAmount: this.adjustedAmount,
      reason: this.adjustReason.trim()
    }).subscribe({
      next: (updated) => {
        const idx = this.payments.findIndex(p => p.id === updated.id);
        if (idx !== -1) this.payments[idx] = updated;
        this.filter();
        this.loadStats();
        this.closeAdjustModal();
      },
      error: () => {
        this.adjustError  = 'Error al ajustar el pago. Intenta de nuevo.';
        this.savingAdjust = false;
      }
    });
  }

  private loadStats(): void {
    this.paymentService.getStats().subscribe({ next: (s) => { this.stats = s; }, error: () => {} });
  }

  formatDate(date: string | null): string {
    if (!date) return '—';
    const parts = date.split('T')[0].split('-');
    if (parts.length === 3) {
      return new Date(+parts[0], +parts[1] - 1, +parts[2]).toLocaleDateString('es-CO', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    }
    return new Date(date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDateTime(date: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
  }
}
