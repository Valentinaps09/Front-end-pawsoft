import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AppSidebarComponent } from 'src/app/share/components/app-sidebar/app-sidebar.component';
import { MedicalRecordService, MedicalRecordResponse } from 'src/app/services/medical-record.service';
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
  filtroVet = '';
  especiesDisponibles: string[] = [];
  vetsDisponibles: string[] = [];

  minDate = '';
  maxDate = '';

  isLoading = false;
  errorMsg = '';
  descargandoPdf = false;

  constructor(
    private readonly medicalRecordService: MedicalRecordService,
    private readonly sanitizer: DomSanitizer
  ) {
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

    // Carga el historial del vet autenticado — todos los registros donde participó
    // Para ver historial de una mascota específica se usa el filtro de búsqueda
    this.medicalRecordService.obtenerHistorial().subscribe({
      next: (data) => {
        this.registros = data;
        this.especiesDisponibles = [...new Set(data.map(r => r.petSpecies).filter(Boolean))];
        this.vetsDisponibles = [...new Set(data.map(r => r.vetName).filter(Boolean))];
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
        r.ownerName.toLowerCase().includes(search) ||
        r.vetName?.toLowerCase().includes(search);

      const matchEspecie = !this.filtroEspecie || r.petSpecies === this.filtroEspecie;
      const matchVet = !this.filtroVet || r.vetName === this.filtroVet;

      const fecha = r.appointmentDate;
      const matchFechaInicio = !this.filtroFechaInicio || fecha >= this.filtroFechaInicio;
      const matchFechaFin    = !this.filtroFechaFin    || fecha <= this.filtroFechaFin;

      return matchSearch && matchEspecie && matchVet && matchFechaInicio && matchFechaFin;
    });
  }

  toggleExpand(id: number): void {
    if (this.expandidos.has(id)) this.expandidos.delete(id);
    else this.expandidos.add(id);
  }

  isExpanded(id: number): boolean { return this.expandidos.has(id); }

  fotoSeleccionada: string | null = null;
  pdfSeleccionado: SafeResourceUrl | null = null;
  pdfUrlOriginal: string | null = null; // URL original sin sanitizar para descarga
  abrirFoto(url: string): void { this.fotoSeleccionada = url; }
  cerrarFoto(): void { this.fotoSeleccionada = null; }
  
  abrirPdf(url: string): void { 
    // En lugar de iframe, abrir en nueva pestaña (más confiable con Cloudinary)
    window.open(url, '_blank');
  }
  cerrarPdf(): void { 
    this.pdfSeleccionado = null; 
    this.pdfUrlOriginal = null;
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
      return Array.isArray(parsed) ? parsed.filter((f: string) => !!f) : [];
    } catch { return []; }
  }

  esPdf(url: string): boolean {
    return url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('/raw/');
  }

  descargarPdf(url: string, numero: number): void {
    this.descargandoPdf = true;
    
    // Transformar la URL de Cloudinary para forzar descarga
    let downloadUrl = url;
    
    // Si es una URL de Cloudinary, agregar el flag de attachment
    if (url.includes('cloudinary.com')) {
      // Para URLs de tipo /raw/upload/, insertar fl_attachment después de /upload/
      if (url.includes('/raw/upload/')) {
        downloadUrl = url.replace('/raw/upload/', '/raw/upload/fl_attachment/');
      } else if (url.includes('/image/upload/')) {
        downloadUrl = url.replace('/image/upload/', '/image/upload/fl_attachment/');
      }
    }
    
    // Crear un link temporal y hacer clic para descargar
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `documento-${numero}.pdf`;
    link.target = '_blank';
    link.style.display = 'none';
    document.body.appendChild(link);
    
    try {
      link.click();
      
      // Limpiar después de un pequeño delay
      setTimeout(() => {
        document.body.removeChild(link);
        this.descargandoPdf = false;
      }, 100);
    } catch (error) {
      console.error('Error descargando PDF:', error);
      this.errorMsg = 'Error al descargar el PDF. Intenta de nuevo.';
      this.descargandoPdf = false;
      document.body.removeChild(link);
    }
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

  evalPeso(v: number | null): VitalResult | null { return evaluarPeso(v); }
  evalTemp(v: number | null): VitalResult | null { return evaluarTemperatura(v); }
  evalFC(v: number | null):   VitalResult | null { return evaluarFrecuenciaCardiaca(v); }
  evalFR(v: number | null):   VitalResult | null { return evaluarFrecuenciaRespiratoria(v); }
}
