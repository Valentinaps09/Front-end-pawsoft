import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppSidebarComponent } from 'src/app/share/components/app-sidebar/app-sidebar.component';
import { PaymentService, PaymentResponse } from 'src/app/services/Payment.service';

@Component({
  selector: 'app-mis-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent],
  templateUrl: './mis-pagos.component.html',
  styleUrls: ['./mis-pagos.component.scss']
})
export class MisPagosComponent implements OnInit {

  userName = '';
  userRole = 'ROLE_CLIENTE';

  pagos: PaymentResponse[] = [];
  pagosFiltrados: PaymentResponse[] = [];
  isLoading = false;
  errorMsg = '';

  filtroFecha = '';
  filtroConcepto = '';
  conceptosDisponibles: string[] = [];

  constructor(private readonly paymentService: PaymentService) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('email') || 'Cliente';
    this.userRole = localStorage.getItem('rol') || 'ROLE_CLIENTE';
    this.cargarPagos();
  }

  cargarPagos(): void {
    this.isLoading = true;
    this.errorMsg = '';
    this.paymentService.getMyPayments().subscribe({
      next: (data) => {
        this.pagos = data.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.conceptosDisponibles = [...new Set(data.map(p => p.concept).filter(Boolean))];
        this.aplicarFiltros();
        this.isLoading = false;
      },
      error: () => {
        this.errorMsg = 'No se pudieron cargar los pagos. Intenta de nuevo.';
        this.isLoading = false;
      }
    });
  }

  aplicarFiltros(): void {
    this.pagosFiltrados = this.pagos.filter(p => {
      const matchFecha    = !this.filtroFecha    || p.appointmentDate?.startsWith(this.filtroFecha);
      const matchConcepto = !this.filtroConcepto || p.concept === this.filtroConcepto;
      return matchFecha && matchConcepto;
    });
  }

  limpiarFiltros(): void {
    this.filtroFecha = '';
    this.filtroConcepto = '';
    this.aplicarFiltros();
  }
}
