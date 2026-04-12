import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppSidebarComponent } from 'src/app/share/components/app-sidebar/app-sidebar.component';
import { MedicalRecordService, MedicalRecordResponse, Medicamento, VacunaControl } from 'src/app/services/medical-record.service';
import {
  evaluarPeso, evaluarTemperatura, evaluarFrecuenciaCardiaca, evaluarFrecuenciaRespiratoria,
  VitalResult
} from 'src/app/utils/vital-signs.util';

@Component({
  selector: 'app-historial-clinico',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, FormsModule, AppSidebarComponent],
  templateUrl: './historial-clinico.component.html',
  styleUrls: ['./historial-clinico.component.scss']
})
export class HistorialClinicoComponent implements OnInit {

  userName = '';
  userRole = 'ROLE_VETERINARIO';

  registros: MedicalRecordResponse[] = [];
  registrosFiltrados: MedicalRecordResponse[] = [];
  expandidos = new Set<number>();

  searchText = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';
  filtroEspecie = '';
  especiesDisponibles: string[] = [];

  minDate = '';
  maxDate = '';

  isLoading = false;
  errorMsg = '';

  constructor(private readonly medicalRecordService: MedicalRecordService) {
    // Calcular fechas límite: hace 20 años hasta hoy
    const today = new Date();
    this.maxDate = today.toISOString().split('T')[0];

    const twentyYearsAgo = new Date();
    twentyYearsAgo.setFullYear(today.getFullYear() - 20);
    this.minDate = twentyYearsAgo.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.userName = localStorage.getItem('email') || 'Veterinario';
    this.userRole = localStorage.getItem('rol') || 'ROLE_VETERINARIO';
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.isLoading = true;
    this.errorMsg = '';

    this.medicalRecordService.obtenerHistorial().subscribe({
      next: (data) => {
        this.registros = data;
        this.especiesDisponibles = [...new Set(data.map(r => r.petSpecies).filter(Boolean))];
        this.aplicarFiltros();
        this.isLoading = false;
      },
      error: () => {
        this.errorMsg = 'No se pudo cargar el historial. Intenta de nuevo.';
        this.isLoading = false;
      }
    });
  }

  onFechaInicioChange(): void {
    // Si "hasta" es anterior a "desde", limpiarla
    if (this.filtroFechaFin && this.filtroFechaInicio && this.filtroFechaFin < this.filtroFechaInicio) {
      this.filtroFechaFin = '';
    }
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    const search = this.searchText.toLowerCase();

    this.registrosFiltrados = this.registros.filter(r => {
      const matchSearch = !search ||
        r.petName.toLowerCase().includes(search) ||
        r.ownerName.toLowerCase().includes(search);

      const matchEspecie = !this.filtroEspecie || r.petSpecies === this.filtroEspecie;

      const fecha = r.appointmentDate;
      const matchFechaInicio = !this.filtroFechaInicio || fecha >= this.filtroFechaInicio;
      const matchFechaFin    = !this.filtroFechaFin    || fecha <= this.filtroFechaFin;

      return matchSearch && matchEspecie && matchFechaInicio && matchFechaFin;
    });
  }

  toggleExpand(id: number): void {
    if (this.expandidos.has(id)) {
      this.expandidos.delete(id);
    } else {
      this.expandidos.add(id);
    }
  }

  isExpanded(id: number): boolean {
    return this.expandidos.has(id);
  }

  fotoSeleccionada: string | null = null;

  abrirFoto(url: string): void {
    this.fotoSeleccionada = url;
  }

  cerrarFoto(): void {
    this.fotoSeleccionada = null;
  }

  parseMedicamentos(json: string): any[] {
    try { return JSON.parse(json) || []; } catch { return []; }
  }

  parseVacunas(json: string): any[] {
    try { return JSON.parse(json) || []; } catch { return []; }
  }

  parseFotos(json: string): string[] {
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed.filter(f => !!f) : [];
    } catch { return []; }
  }

  getEmojiBySpecies(species: string): string {
    const map: { [k: string]: string } = {
      'Perro': '🐕', 'Gato': '🐈', 'Conejo': '🐇', 'Ave': '🦜', 'Pez': '🐠'
    };
    return map[species] || '🐾';
  }

  formatDate(date: string): string {
    if (!date) return '—';
    const [y, m, d] = date.split('-');
    return `${d}/${m}/${y}`;
  }

  evalPeso(v: number | null):  VitalResult | null { return evaluarPeso(v); }
  evalTemp(v: number | null):  VitalResult | null { return evaluarTemperatura(v); }
  evalFC(v: number | null):    VitalResult | null { return evaluarFrecuenciaCardiaca(v); }
  evalFR(v: number | null):    VitalResult | null { return evaluarFrecuenciaRespiratoria(v); }
}
