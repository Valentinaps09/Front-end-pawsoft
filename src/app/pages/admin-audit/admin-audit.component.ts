import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppSidebarComponent } from 'src/app/share/components/app-sidebar/app-sidebar.component';
import { AuditService, PaymentAdjustmentResponse } from 'src/app/services/audit.service';

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent],
  templateUrl: './admin-audit.component.html',
  styleUrls: ['./admin-audit.component.scss']
})
export class AdminAuditComponent implements OnInit {
  userName = '';
  userRole = 'ROLE_ADMIN';

  adjustments: PaymentAdjustmentResponse[] = [];
  filteredAdjustments: PaymentAdjustmentResponse[] = [];
  
  searchText = '';
  loading = true;

  constructor(private auditService: AuditService) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('email') || 'Admin';
    this.userRole = localStorage.getItem('rol') || 'ROLE_ADMIN';
    this.loadAdjustments();
  }

  loadAdjustments(): void {
    this.loading = true;
    this.auditService.getAllAdjustments().subscribe({
      next: (data) => {
        this.adjustments = data;
        this.filteredAdjustments = [...data];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading adjustments:', err);
        this.loading = false;
      }
    });
  }

  filter(): void {
    const s = this.searchText.toLowerCase();
    this.filteredAdjustments = this.adjustments.filter(adj => 
      adj.adjustedByName.toLowerCase().includes(s) ||
      adj.reason.toLowerCase().includes(s)
    );
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getDifferenceClass(difference: number): string {
    if (difference > 0) return 'positive';
    if (difference < 0) return 'negative';
    return 'neutral';
  }
}
