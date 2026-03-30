import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppSidebarComponent } from 'src/app/share/components/app-sidebar/app-sidebar.component';
import {
  MedicalRecordService,
  AtencionActiva,
  Medicamento,
  VacunaControl,
  RegistroMedico
} from 'src/app/services/medical-record.service';

type EstadoGuardado = 'sin_cambios' | 'guardando' | 'guardado' | 'error';

@Component({
  selector: 'app-formulario-consulta',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent],
  templateUrl: './formulario-consulta.component.html',
  styleUrls: ['./formulario-consulta.component.scss']
})
export class FormularioConsultaComponent implements OnInit, OnDestroy {

  userName = '';
  userRole = 'ROLE_VETERINARIO';

  atencion: AtencionActiva | null = null;
  estadoGuardado: EstadoGuardado = 'sin_cambios';
  isSubmitting = false;
  errorMsg = '';

  // Formulario — Examen físico
  peso: number | null = null;
  temperatura: number | null = null;
  frecuenciaCardiaca: number | null = null;
  observacionesGenerales = '';

  // Diagnóstico
  diagnosticoPrincipal = '';
  diagnosticoSecundario = '';
  notasClinicas = '';

  // Tratamiento
  medicamentos: Medicamento[] = [];
  indicaciones = '';

  // Vacunas y controles
  vacunasAplicadas: VacunaControl[] = [];
  proximoControlFecha = '';
  proximoControlMotivo = '';

  // Fecha mínima para próximo control (hoy + 1 día)
  readonly minFechaControl = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })();

  // Catálogo de medicamentos veterinarios (datos quemados)
  readonly MEDICAMENTOS_CATALOGO = [
    'Amoxicilina', 'Ampicilina', 'Cefalexina', 'Enrofloxacina', 'Metronidazol',
    'Doxiciclina', 'Clindamicina', 'Gentamicina', 'Tramadol', 'Meloxicam',
    'Carprofeno', 'Prednisona', 'Dexametasona', 'Furosemida', 'Enalapril',
    'Atenolol', 'Omeprazol', 'Metoclopramida', 'Ondansetrón', 'Ranitidina',
    'Ivermectina', 'Prazicuantel', 'Fenbendazol', 'Selamectina', 'Fipronil',
    'Insulina NPH', 'Fenobarbital', 'Diazepam', 'Acepromazina', 'Ketamina',
    'Vitamina B12', 'Hierro dextrano', 'Calcio gluconato', 'Suero fisiológico'
  ];

  readonly VIAS_ADMINISTRACION = [
    'Oral', 'Intramuscular (IM)', 'Subcutánea (SC)', 'Intravenosa (IV)',
    'Tópica', 'Oftálmica', 'Ótica', 'Intranasal', 'Rectal'
  ];

  readonly UNIDADES_DOSIS = ['mg', 'mg/kg', 'ml', 'ml/kg', 'UI', 'UI/kg', 'g', 'mcg'];

  private debounceTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly router: Router,
    private readonly medicalRecordService: MedicalRecordService,
  ) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('email') || 'Veterinario';
    this.userRole = localStorage.getItem('rol') || 'ROLE_VETERINARIO';

    this.atencion = this.medicalRecordService.getAtencionActiva();

    if (!this.atencion) {
      this.router.navigate(['/veterinario/atencion-medica']);
      return;
    }

    // Cargar borrador si existe
    const borrador = this.medicalRecordService.obtenerBorrador(this.atencion.appointmentId);
    if (borrador) {
      this.peso                   = borrador.peso ?? null;
      this.temperatura            = borrador.temperatura ?? null;
      this.frecuenciaCardiaca     = borrador.frecuenciaCardiaca ?? null;
      this.observacionesGenerales = borrador.observacionesGenerales ?? '';
      this.diagnosticoPrincipal   = borrador.diagnosticoPrincipal ?? '';
      this.diagnosticoSecundario  = borrador.diagnosticoSecundario ?? '';
      this.notasClinicas          = borrador.notasClinicas ?? '';
      this.medicamentos           = borrador.medicamentos ?? [];
      this.indicaciones           = borrador.indicaciones ?? '';
      this.vacunasAplicadas       = borrador.vacunasAplicadas ?? [];
      this.proximoControlFecha    = borrador.proximoControlFecha ?? '';
      this.proximoControlMotivo   = borrador.proximoControlMotivo ?? '';
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.debounceTimer);
  }

  onFormChange(): void {
    this.estadoGuardado = 'guardando';
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.guardarBorrador();
      this.estadoGuardado = 'guardado';
    }, 2000);
  }

  guardarBorrador(): void {
    if (!this.atencion) return;
    this.medicalRecordService.guardarBorrador(this.buildRegistro());
    this.estadoGuardado = 'guardado';
  }

  agregarMedicamento(): void {
    this.medicamentos.push({ nombre: '', dosisValor: '', dosisUnidad: 'mg', via: '' });
    this.onFormChange();
  }

  eliminarMedicamento(index: number): void {
    this.medicamentos.splice(index, 1);
    this.onFormChange();
  }

  cerrarAtencion(): void {
    if (!this.atencion || this.isSubmitting) return;
    this.isSubmitting = true;
    this.errorMsg = '';

    this.medicalRecordService.guardar(this.buildRegistro(), true).subscribe({
      next: () => {
        this.medicalRecordService.eliminarBorrador(this.atencion!.appointmentId);
        this.medicalRecordService.cerrarAtencion();
        this.isSubmitting = false;
        this.router.navigate(['/veterinario/atencion-medica']);
      },
      error: () => {
        this.errorMsg = 'Error al cerrar la atención. Los datos no se perdieron.';
        this.isSubmitting = false;
      }
    });
  }

  volver(): void {
    this.router.navigate(['/veterinario/atencion-medica']);
  }

  getEstadoGuardadoLabel(): string {
    const map: Record<EstadoGuardado, string> = {
      sin_cambios: '',
      guardando:   '⏳ Guardando...',
      guardado:    '✓ Guardado',
      error:       '⚠️ Error al guardar',
    };
    return map[this.estadoGuardado];
  }

  calcularEdad(birthDate: string | null): string {
    if (!birthDate) return '—';
    const partes = birthDate.split('-');
    if (partes.length !== 3) return '—';
    const hoy = new Date();
    const nac = new Date(+partes[0], +partes[1] - 1, +partes[2]);
    let años = hoy.getFullYear() - nac.getFullYear();
    let meses = hoy.getMonth() - nac.getMonth();
    if (meses < 0) { años--; meses += 12; }
    if (años === 0) return `${meses} mes${meses !== 1 ? 'es' : ''}`;
    return `${años} año${años !== 1 ? 's' : ''}`;
  }

  getEmojiBySpecies(species: string): string {
    const map: { [k: string]: string } = {
      'Perro': '🐕', 'Gato': '🐈', 'Conejo': '🐇', 'Ave': '🦜', 'Pez': '🐠'
    };
    return map[species] || '🐾';
  }

  formatDateDisplay(date: string): string {
    if (!date) return '';
    const [y, m, d] = date.split('-');
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${d} ${meses[+m - 1]} ${y}`;
  }

  abrirCalendario(): void {
    const input = document.getElementById('fechaControlPicker') as HTMLInputElement;
    if (input) input.showPicker?.();
  }

  /** Bloquea entrada si el número resultante excede el máximo permitido */
  clampNumericInput(event: Event, max: number, decimals = 1): void {
    const input = event.target as HTMLInputElement;
    let val = parseFloat(input.value);
    if (isNaN(val)) return;
    if (val > max) {
      val = max;
      input.value = val.toFixed(decimals);
      // Forzar actualización del ngModel
      input.dispatchEvent(new Event('input'));
    }
  }

  private buildRegistro(): RegistroMedico {    return {
      appointmentId:          this.atencion!.appointmentId,
      peso:                   this.peso,
      temperatura:            this.temperatura,
      frecuenciaCardiaca:     this.frecuenciaCardiaca,
      observacionesGenerales: this.observacionesGenerales,
      diagnosticoPrincipal:   this.diagnosticoPrincipal,
      diagnosticoSecundario:  this.diagnosticoSecundario,
      notasClinicas:          this.notasClinicas,
      medicamentos:           this.medicamentos,
      indicaciones:           this.indicaciones,
      vacunasAplicadas:       this.vacunasAplicadas,
      proximoControlFecha:    this.proximoControlFecha,
      proximoControlMotivo:   this.proximoControlMotivo,
    };
  }
}
