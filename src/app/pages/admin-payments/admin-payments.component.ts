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

  searchText    = '';
  statusFilter  = '';
  loading       = true;

  constructor(private readonly paymentService: PaymentService) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('email') || 'Admin';
    this.userRole = localStorage.getItem('rol')   || 'ROLE_ADMIN';
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;

    this.paymentService.getStats().subscribe({
      next: (s) => { this.stats = s; },
      error: () => {}
    });

    this.paymentService.getAllPayments().subscribe({
      next: (data) => {
        this.payments         = data;
        this.filteredPayments = [...data];
        this.loading          = false;
      },
      error: () => { this.loading = false; }
    });
  }

  filter(): void {
    const s = this.searchText.toLowerCase();
    this.filteredPayments = this.payments.filter(p => {
      const matchSearch = `${p.clientName} ${p.clientEmail} ${p.petName} ${p.vetName} ${p.concept}`
        .toLowerCase().includes(s);
      const matchStatus = !this.statusFilter || p.status === this.statusFilter;
      return matchSearch && matchStatus;
    });
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

  private loadStats(): void {
    this.paymentService.getStats().subscribe({
      next: (s) => { this.stats = s; },
      error: () => {}
    });
  }

  formatDate(date: string | null): string {
    if (!date) return '—';
    // Parsear manualmente para evitar el problema de zona horaria UTC
    const parts = date.split('T')[0].split('-');
    if (parts.length === 3) {
      const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      return d.toLocaleDateString('es-CO', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    }
    return new Date(date).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(amount);
  }
}
