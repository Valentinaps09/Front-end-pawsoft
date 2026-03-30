import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppSidebarComponent } from 'src/app/share/components/app-sidebar/app-sidebar.component';
import { MedicalRecordService, MedicalRecordResponse, Medicamento, VacunaControl } from 'src/app/services/medical-record.service';

@Component({
  selector: 'app-historial-clinico',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent],
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

  isLoading = false;
  errorMsg = '';

  constructor(private readonly medicalRecordService: MedicalRecordService) {}

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

  parseMedicamentos(json: string): Medicamento[] {
    try { return JSON.parse(json) || []; } catch { return []; }
  }

  parseVacunas(json: string): VacunaControl[] {
    try { return JSON.parse(json) || []; } catch { return []; }
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
}
