import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppSidebarComponent } from 'src/app/share/components/app-sidebar/app-sidebar.component';
import { AdminHospitalizationService } from 'src/app/services/admin-hospitalization.service';
import { HospitalizationDTO } from 'src/app/services/hospitalization.service';

/**
 * Vista de solo lectura de hospitalizaciones para el administrador.
 * Permite filtrar por fecha, nombre de mascota, especie y correo del cliente.
 *
 * Proyecto: Pawsoft
 * Universidad del Quindío — Ingeniería de Sistemas y Computación — Software III
 * Autoras: Valentina Porras Salazar · Helen Xiomara Giraldo Libreros
 * Profesor: Raúl Yulbraynner Rivera Gálvez
 */
@Component({
  selector: 'app-admin-hospitalizaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent],
  templateUrl: './admin-hospitalizaciones.component.html',
  styleUrls: ['./admin-hospitalizaciones.component.scss']
})
export class AdminHospitalizacionesComponent implements OnInit {

  userName = '';
  userRole = 'ROLE_ADMIN';

  todas: HospitalizationDTO[] = [];
  isLoading = false;
  errorMsg = '';

  // Filtros
  filtroBusqueda = '';
  filtroEstado: 'TODOS' | 'ACTIVE' | 'DISCHARGED' | 'DECEASED' = 'TODOS';
  filtroFechaDesde = '';
  filtroFechaHasta = '';

  // Detalle expandido
  expandidaId: number | null = null;

  constructor(private readonly adminHospService: AdminHospitalizationService) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('email') || 'Admin';
    this.userRole = localStorage.getItem('rol') || 'ROLE_ADMIN';
    this.cargar();
  }

  cargar(): void {
    this.isLoading = true;
    this.errorMsg = '';
    this.adminHospService.getAll().subscribe({
      next: (data) => {
        this.todas = data;
        this.isLoading = false;
      },
      error: () => {
        this.errorMsg = 'No se pudieron cargar las hospitalizaciones.';
        this.isLoading = false;
      }
    });
  }

  get filtradas(): HospitalizationDTO[] {
    const q = this.filtroBusqueda.toLowerCase().trim();
    return this.todas.filter(h => {
      // Filtro estado
      if (this.filtroEstado !== 'TODOS' && h.status !== this.filtroEstado) return false;

      // Filtro fecha desde
      if (this.filtroFechaDesde) {
        const desde = new Date(this.filtroFechaDesde);
        if (new Date(h.admissionDate) < desde) return false;
      }

      // Filtro fecha hasta
      if (this.filtroFechaHasta) {
        const hasta = new Date(this.filtroFechaHasta);
        hasta.setHours(23, 59, 59);
        if (new Date(h.admissionDate) > hasta) return false;
      }

      // Filtro texto libre
      if (!q) return true;
      return (
        h.petName?.toLowerCase().includes(q) ||
        h.petSpecies?.toLowerCase().includes(q) ||
        h.ownerEmail?.toLowerCase().includes(q) ||
        h.vetName?.toLowerCase().includes(q) ||
        h.reason?.toLowerCase().includes(q)
      );
    });
  }

  get totalActivas(): number {
    return this.todas.filter(h => h.status === 'ACTIVE').length;
  }

  get totalAlta(): number {
    return this.todas.filter(h => h.status === 'DISCHARGED').length;
  }

  get totalFallecidas(): number {
    return this.todas.filter(h => h.status === 'DECEASED').length;
  }

  toggleDetalle(id: number): void {
    this.expandidaId = this.expandidaId === id ? null : id;
  }

  limpiarFiltros(): void {
    this.filtroBusqueda = '';
    this.filtroEstado = 'TODOS';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
  }

  calcularTiempo(admissionDate: string, dischargeDate: string | null): string {
    const fin = dischargeDate ? new Date(dischargeDate) : new Date();
    const diff = fin.getTime() - new Date(admissionDate).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    if (days > 0) return `${days}d ${remHours}h`;
    return `${hours}h`;
  }

  formatDate(date: string | null): string {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'Hospitalizada',
      DISCHARGED: 'Dada de alta',
      DECEASED: 'Fallecida'
    };
    return map[status] ?? status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'badge-activa',
      DISCHARGED: 'badge-alta',
      DECEASED: 'badge-fallecida'
    };
    return map[status] ?? '';
  }

  getEspecieEmoji(species: string): string {
    if (!species) return '🐾';
    const s = species.toLowerCase();
    if (s.includes('perro') || s.includes('canino')) return '🐶';
    if (s.includes('gato') || s.includes('felino')) return '🐱';
    if (s.includes('ave') || s.includes('pájaro')) return '🐦';
    if (s.includes('conejo')) return '🐰';
    if (s.includes('hamster')) return '🐹';
    return '🐾';
  }

  calcularCostoActual(h: HospitalizationDTO): number {
    if (h.totalCost !== null && h.totalCost !== undefined) return Number(h.totalCost);
    if (!h.hourlyRate) return 0;
    const fin = h.dischargeDate ? new Date(h.dischargeDate) : new Date();
    const diff = fin.getTime() - new Date(h.admissionDate).getTime();
    const hours = diff / 3600000;
    return Math.ceil(hours) * Number(h.hourlyRate);
  }
}
