import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppSidebarComponent } from 'src/app/share/components/app-sidebar/app-sidebar.component';
import { HospitalizationService, HospitalizationDTO } from 'src/app/services/hospitalization.service';

type TabActiva = 'activas' | 'alta' | 'fallecidas';

@Component({
  selector: 'app-hospitalizaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent],
  templateUrl: './hospitalizaciones.component.html',
  styleUrls: ['./hospitalizaciones.component.scss']
})
export class HospitalizacionesComponent implements OnInit {

  userName = '';
  userRole = 'ROLE_VETERINARIO';
  tabActiva: TabActiva = 'activas';

  todasHospitalizaciones: HospitalizationDTO[] = [];
  isLoading = false;
  errorMsg = '';

  // Filtros
  searchTerm = '';
  fechaDesde = '';
  fechaHasta = '';

  // Modal dar de alta
  mostrarModalAlta = false;
  hospSeleccionada: HospitalizationDTO | null = null;
  guardandoAlta = false;
  errorAlta = '';

  // Modal fallecimiento
  mostrarModalFallecido = false;
  hospFallecida: HospitalizationDTO | null = null;
  causaMuerte = '';
  guardandoFallecido = false;
  errorFallecido = '';

  // Modal nota
  mostrarModalNota = false;
  hospNota: HospitalizationDTO | null = null;
  notaTexto = '';
  guardandoNota = false;

  constructor(private readonly hospitalizationService: HospitalizationService) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('email') || 'Veterinario';
    this.userRole = localStorage.getItem('rol') || 'ROLE_VETERINARIO';
    this.cargarHospitalizaciones();
  }

  cargarHospitalizaciones(): void {
    this.isLoading = true;
    this.errorMsg = '';
    console.log('Cargando registros especiales...');
    
    // Cambiar de getActive() a getAll() para obtener todas las hospitalizaciones
    this.hospitalizationService.getAll().subscribe({
      next: (data) => { 
        console.log('Registros especiales cargados:', data);
        this.todasHospitalizaciones = data; 
        this.isLoading = false; 
      },
      error: (err) => { 
        console.error('Error cargando registros especiales:', err);
        this.errorMsg = 'No se pudieron cargar los registros especiales.'; 
        this.isLoading = false; 
      }
    });
  }

  get hospitalizacionesActivas(): HospitalizationDTO[] {
    return this.todasHospitalizaciones.filter(h => h.status === 'ACTIVE');
  }

  get hospitalizacionesAlta(): HospitalizationDTO[] {
    // Solo incluye las dadas de alta (excluye fallecidas)
    return this.todasHospitalizaciones.filter(h => h.status === 'DISCHARGED');
  }

  get hospitalizacionesFallecidas(): HospitalizationDTO[] {
    return this.todasHospitalizaciones.filter(h => h.status === 'DECEASED');
  }

  get hospitalizacionesTab(): HospitalizationDTO[] {
    if (this.tabActiva === 'activas') return this.hospitalizacionesActivas;
    if (this.tabActiva === 'alta') return this.hospitalizacionesAlta;
    return this.hospitalizacionesFallecidas;
  }

  get hospitalizacionesFiltradas(): HospitalizationDTO[] {
    let resultado = [...this.todasHospitalizaciones];

    // Filtro por tab activo
    if (this.tabActiva === 'activas') {
      resultado = resultado.filter(h => h.status === 'ACTIVE');
    } else if (this.tabActiva === 'alta') {
      // Solo incluye altas (excluye fallecimientos)
      resultado = resultado.filter(h => h.status === 'DISCHARGED');
    } else if (this.tabActiva === 'fallecidas') {
      resultado = resultado.filter(h => h.status === 'DECEASED');
    }

    // Filtro por búsqueda (nombre de mascota)
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      resultado = resultado.filter(h => 
        h.petName.toLowerCase().includes(term)
      );
    }

    // Filtro por fecha desde
    if (this.fechaDesde) {
      const desde = new Date(this.fechaDesde);
      resultado = resultado.filter(h => {
        const fecha = new Date(h.admissionDate);
        return fecha >= desde;
      });
    }

    // Filtro por fecha hasta
    if (this.fechaHasta) {
      const hasta = new Date(this.fechaHasta);
      hasta.setHours(23, 59, 59, 999); // Incluir todo el día
      resultado = resultado.filter(h => {
        const fecha = new Date(h.admissionDate);
        return fecha <= hasta;
      });
    }

    return resultado;
  }

  limpiarFiltros(): void {
    this.searchTerm = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
  }

  get fechaMaxima(): string {
    // Retorna la fecha de hoy en formato YYYY-MM-DD
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  }

  // ── Dar de alta ──────────────────────────────────────────────────────────

  abrirModalAlta(h: HospitalizationDTO): void {
    this.hospSeleccionada = h;
    this.errorAlta = '';
    this.mostrarModalAlta = true;
  }

  cerrarModalAlta(): void {
    this.mostrarModalAlta = false;
    this.hospSeleccionada = null;
  }

  confirmarAlta(): void {
    if (!this.hospSeleccionada) return;
    
    console.log('Iniciando proceso de alta para hospitalización:', this.hospSeleccionada.id);
    this.guardandoAlta = true;
    this.errorAlta = '';
    
    this.hospitalizationService.discharge(this.hospSeleccionada.id).subscribe({
      next: (result) => {
        console.log('Alta exitosa:', result);
        this.guardandoAlta = false;
        this.mostrarModalAlta = false;
        this.cargarHospitalizaciones();
        this.tabActiva = 'alta';
      },
      error: (err) => { 
        console.error('Error al dar de alta:', err);
        this.errorAlta = err.error?.message || 'Error al dar de alta.'; 
        this.guardandoAlta = false; 
      }
    });
  }

  // ── Fallecimiento ────────────────────────────────────────────────────────

  abrirModalFallecido(h: HospitalizationDTO): void {
    this.hospFallecida = h;
    this.causaMuerte = '';
    this.errorFallecido = '';
    this.mostrarModalFallecido = true;
  }

  cerrarModalFallecido(): void {
    this.mostrarModalFallecido = false;
    this.hospFallecida = null;
  }

  confirmarFallecido(): void {
    if (!this.hospFallecida || !this.causaMuerte.trim()) return;
    this.guardandoFallecido = true;
    this.hospitalizationService.recordDeceased(this.hospFallecida.id, this.causaMuerte.trim()).subscribe({
      next: () => {
        this.guardandoFallecido = false;
        this.mostrarModalFallecido = false;
        this.cargarHospitalizaciones();
        this.tabActiva = 'fallecidas';
      },
      error: () => { this.errorFallecido = 'Error al registrar el fallecimiento.'; this.guardandoFallecido = false; }
    });
  }

  // ── Nota ─────────────────────────────────────────────────────────────────

  abrirModalNota(h: HospitalizationDTO): void {
    this.hospNota = h;
    this.notaTexto = '';
    this.mostrarModalNota = true;
  }

  cerrarModalNota(): void {
    this.mostrarModalNota = false;
    this.hospNota = null;
  }

  guardarNota(): void {
    if (!this.hospNota || !this.notaTexto.trim()) return;
    this.guardandoNota = true;
    this.hospitalizationService.addNote(this.hospNota.id, this.notaTexto.trim()).subscribe({
      next: () => { this.guardandoNota = false; this.mostrarModalNota = false; this.cargarHospitalizaciones(); },
      error: () => { this.guardandoNota = false; }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  getEmojiBySpecies(name: string): string {
    return '🐾';
  }

  calcularTiempo(admissionDate: string): string {
    const diff = Date.now() - new Date(admissionDate).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} día${days !== 1 ? 's' : ''}`;
    return `${hours} hora${hours !== 1 ? 's' : ''}`;
  }

  formatDate(date: string | null): string {
    if (!date) return '—';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  }
}
