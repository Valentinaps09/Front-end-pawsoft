import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Observable } from 'rxjs';
import { AppSidebarComponent } from 'src/app/share/components/app-sidebar/app-sidebar.component';
import {
  MedicalRecordService,
  AtencionActiva,
  Medicamento,
  VacunaControl,
  RegistroMedico,
  MedicalRecordResponse
} from 'src/app/services/medical-record.service';
import { AppointmentService } from 'src/app/services/appointment.service';
import { MedicalProfileService } from 'src/app/services/medical-profile.service';
import { HospitalizationService } from 'src/app/services/hospitalization.service';
import { ChatbotService } from 'src/app/services/chatbot.service';
import { MedicalFormSuggestionRequest, MedicalFormSuggestionResponse } from 'src/app/pages/chat-bot/chatbot.model';
import { PetMedicalProfileDTO, UpdateMedicalProfileRequest } from 'src/app/models/medical-profile.model';
import {
  evaluarTemperatura,
  evaluarFrecuenciaCardiaca,
  evaluarFrecuenciaRespiratoria,
  evaluarPeso,
  VitalResult
} from 'src/app/utils/vital-signs.util';

type EstadoGuardado = 'sin_cambios' | 'guardando' | 'guardado' | 'error';

/**
 * Componente para el formulario de consulta médica veterinaria.
 *
 * Funcionalidad:
 * - Registro de examen físico (peso, temperatura, frecuencia cardíaca)
 * - Diagnóstico y notas clínicas (interno)
 * - Tratamiento y medicamentos aplicados
 * - Resumen para el cliente con diagnóstico e indicaciones
 * - Registro de vacunas aplicadas
 * - Programación de próximo control
 * - Adjuntar fotos (radiografías, análisis)
 * - Guardado automático de borrador cada 30 segundos
 * - Validación de campos obligatorios antes de cerrar atención
 *
 * Flujo:
 * 1. Veterinario completa sección interna (examen, diagnóstico, tratamiento)
 * 2. Sistema valida campos obligatorios antes de permitir continuar
 * 3. Veterinario completa resumen para cliente
 * 4. Sistema guarda registro y cierra la cita (estado COMPLETED)
 */
@Component({
  selector: 'app-formulario-consulta',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, FormsModule, AppSidebarComponent],
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

  // Hoja médica maestra (prellenada)
  medicalProfile: PetMedicalProfileDTO | null = null;
  loadingMedicalProfile = false;
  medicalProfileError = '';

  // Últimas atenciones
  ultimasAtenciones: MedicalRecordResponse[] = [];
  loadingUltimasAtenciones = false;

  // Antecedentes médicos (prellenados, editables)
  alergias = '';
  condicionesCronicas = '';
  medicamentosActuales = '';
  antecedenteQuirurgico = '';
  tipoSangre = '';

  // Nuevos descubrimientos en consulta
  alergiasEncontradas = '';
  condicionesEncontradas = '';
  notaQuirurgica = '';
  medicamentosNuevos = '';
  tipoSangreNuevo = '';

  // Formulario — Examen físico
  peso: number | null = null;
  temperatura: number | null = null;
  frecuenciaCardiaca: number | null = null;
  frecuenciaRespiratoria: number | null = null;
  observacionesGenerales = '';

  // Diagnóstico
  diagnosticoPrincipal = '';
  diagnosticoSecundario = '';
  notasClinicas = '';

  // Tratamiento (interno - procedimiento)
  medicamentos: Medicamento[] = [];
  indicaciones = '';

  // Resumen para cliente
  diagnosticoCliente = '';
  medicamentosRecetados: Medicamento[] = [];
  indicacionesCliente = '';

  // Vacunas y controles
  vacunasAplicadas: VacunaControl[] = [];
  requiereProximoControl = false;
  proximoControlFecha = '';
  proximoControlMotivo = '';

  // Fotos adjuntas
  adjuntarFotos = false;
  fotosAdjuntas: string[] = [];
  uploadingPhoto = false;
  uploadError = '';
  descargandoPdf = false;

  // Hospitalización
  requiereHospitalizacion = false;
  hospitalizacionMotivo = '';
  hospitalizacionObservaciones = '';
  hospitalizacionTarifa: number | null = null;

  // Fallecimiento durante la atención
  fallecioEnAtencion = false;
  causaMuerteAtencion = '';

  // Estado del paciente (radio buttons)
  estadoPaciente: 'estable' | 'hospitalizacion' | 'fallecido' = 'estable';

  // Control de secciones
  seccionActiva: 'interno' | 'cliente' = 'interno';

  // Modal de confirmación
  mostrarModalCancelar = false;

  // Autocompletado médico con IA
  mostrarAutocompletado = false;
  descripcionSintomas = '';
  cargandoSugerencias = false;
  sugerenciasMedicas: MedicalFormSuggestionResponse | null = null;
  errorSugerencias = '';

  // Errores inline
  errores = {
    diagnosticoPrincipal: '',
    diagnosticoCliente: '',
    proximoControlFecha: '',
    proximoControlMotivo: '',
    peso: '',
    temperatura: '',
    frecuenciaCardiaca: '',
    frecuenciaRespiratoria: '',
    observacionesGenerales: '',
    notasClinicas: '',
    indicacionesCliente: '',
    hospitalizacionMotivo: '',
    hospitalizacionTarifa: '',
    causaMuerteAtencion: '',
    medicamentos: [] as string[],
    medicamentosRecetados: [] as string[]
  };

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

  // Catálogo con precios del backend
  catalogoMedicamentos: { id: number; name: string; price: number; unit: string }[] = [];
  precioServicioBase = 0;

  get costoMedicamentos(): number {
    return this.medicamentos.reduce((total, med) => {
      const item = this.catalogoMedicamentos.find(c => c.name === med.nombre);
      return total + (item ? item.price : 0);
    }, 0);
  }

  get costoTotal(): number {
    return this.precioServicioBase + this.costoMedicamentos;
  }

  getPrecioMedicamento(nombre: string): number {
    const item = this.catalogoMedicamentos.find(c => c.name === nombre);
    return item ? item.price : 0;
  }

  private debounceTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly router: Router,
    private readonly medicalRecordService: MedicalRecordService,
    private readonly appointmentService: AppointmentService,
    private readonly medicalProfileService: MedicalProfileService,
    private readonly hospitalizationService: HospitalizationService,
    private readonly chatbotService: ChatbotService,
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('email') || 'Veterinario';
    this.userRole = localStorage.getItem('rol') || 'ROLE_VETERINARIO';

    this.atencion = this.medicalRecordService.getAtencionActiva();

    if (!this.atencion) {
      this.router.navigate(['/veterinario/atencion-medica']);
      return;
    }

    // Cargar hoja médica maestra
    this.loadMedicalProfile();

    // Cargar últimas atenciones
    this.loadUltimasAtenciones();

    // Cargar catálogo de medicamentos con precios
    this.medicalRecordService.obtenerCatalogoMedicamentos().subscribe({
      next: (data) => { this.catalogoMedicamentos = data; },
      error: () => { /* silencioso, el vet puede seguir sin precios */ }
    });

    // Cargar precio base del servicio
    this.medicalRecordService.obtenerPrecioServicio(this.atencion.reason).subscribe({
      next: (precio) => { this.precioServicioBase = precio ?? 0; },
      error: () => { this.precioServicioBase = 0; }
    });

    // Cargar borrador si existe
    const borrador = this.medicalRecordService.obtenerBorrador(this.atencion.appointmentId);
    if (borrador) {
      this.peso                   = borrador.peso ?? null;
      this.temperatura            = borrador.temperatura ?? null;
      this.frecuenciaCardiaca     = borrador.frecuenciaCardiaca ?? null;
      this.frecuenciaRespiratoria = borrador.frecuenciaRespiratoria ?? null;
      this.observacionesGenerales = borrador.observacionesGenerales ?? '';
      this.diagnosticoPrincipal   = borrador.diagnosticoPrincipal ?? '';
      this.diagnosticoSecundario  = borrador.diagnosticoSecundario ?? '';
      this.notasClinicas          = borrador.notasClinicas ?? '';
      this.medicamentos           = borrador.medicamentos ?? [];
      this.indicaciones           = borrador.indicaciones ?? '';
      this.diagnosticoCliente     = borrador.diagnosticoCliente ?? '';
      this.medicamentosRecetados  = borrador.medicamentosRecetados ?? [];
      this.indicacionesCliente    = borrador.indicacionesCliente ?? '';
      this.vacunasAplicadas       = borrador.vacunasAplicadas ?? [];
      this.requiereProximoControl = !!(borrador.proximoControlFecha || borrador.proximoControlMotivo);
      this.proximoControlFecha    = borrador.proximoControlFecha ?? '';
      this.proximoControlMotivo   = borrador.proximoControlMotivo ?? '';
      this.adjuntarFotos          = !!(borrador.fotosAdjuntas && borrador.fotosAdjuntas.length > 0);
      this.fotosAdjuntas          = borrador.fotosAdjuntas ?? [];
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.debounceTimer);
  }

  /**
   * Carga la hoja médica maestra de la mascota
   */
  loadMedicalProfile(): void {
    if (!this.atencion?.petId) return;

    this.loadingMedicalProfile = true;
    this.medicalProfileError = '';

    this.medicalProfileService.getMedicalProfile(this.atencion.petId).subscribe({
      next: (profile) => {
        this.medicalProfile = profile;
        this.alergias = profile.knownAllergies || '';
        this.condicionesCronicas = profile.chronicConditions || '';
        this.medicamentosActuales = profile.currentMedications || '';
        this.antecedenteQuirurgico = profile.surgicalHistory || '';
        this.tipoSangre = profile.bloodType || '';
        this.loadingMedicalProfile = false;
      },
      error: (err) => {
        console.error('Error cargando hoja médica:', err);
        this.medicalProfile = null;
        this.alergias = '';
        this.condicionesCronicas = '';
        this.medicamentosActuales = '';
        this.antecedenteQuirurgico = '';
        this.tipoSangre = '';
        this.loadingMedicalProfile = false;
      }
    });
  }

  /**
   * Carga las últimas 2 atenciones de la mascota
   */
  loadUltimasAtenciones(): void {
    if (!this.atencion?.petId) return;

    this.loadingUltimasAtenciones = true;

    this.medicalRecordService.obtenerHistorialPorMascota(this.atencion.petId).subscribe({
      next: (records) => {
        // Ordenar por fecha más reciente y tomar las últimas 2
        this.ultimasAtenciones = records
          .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime())
          .slice(0, 2);
        this.loadingUltimasAtenciones = false;
      },
      error: (err) => {
        console.error('Error cargando últimas atenciones:', err);
        this.ultimasAtenciones = [];
        this.loadingUltimasAtenciones = false;
      }
    });
  }

  /**
   * Actualiza la hoja médica maestra con nuevos descubrimientos
   */
  updateMedicalProfile(): Observable<boolean> {
    if (!this.atencion?.petId) {
      return new Observable(observer => {
        observer.next(false);
        observer.complete();
      });
    }

    const updateData: UpdateMedicalProfileRequest = {};

    // Solo enviar campos que tienen nuevos descubrimientos
    if (this.alergiasEncontradas.trim()) {
      updateData.allergiesFound = this.alergiasEncontradas.trim();
    }
    if (this.condicionesEncontradas.trim()) {
      updateData.conditionsFound = this.condicionesEncontradas.trim();
    }
    if (this.notaQuirurgica.trim()) {
      updateData.surgicalNote = this.notaQuirurgica.trim();
    }
    if (this.medicamentosNuevos.trim()) {
      updateData.currentMeds = this.medicamentosNuevos.trim();
    }
    if (this.tipoSangreNuevo.trim()) {
      updateData.bloodType = this.tipoSangreNuevo.trim();
    }

    // Si no hay cambios, no hacer la llamada
    if (Object.keys(updateData).length === 0) {
      return new Observable(observer => {
        observer.next(true);
        observer.complete();
      });
    }

    return new Observable(observer => {
      this.medicalProfileService.updateMedicalProfile(this.atencion!.petId, updateData).subscribe({
        next: () => {
          observer.next(true);
          observer.complete();
        },
        error: (err) => {
          console.error('Error actualizando hoja médica:', err);
          observer.next(false);
          observer.complete();
        }
      });
    });
  }

  onFormChange(): void {
    this.estadoGuardado = 'guardando';
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.guardarBorrador();
      this.estadoGuardado = 'guardado';
    }, 2000);
  }

  limitarPeso(): void {
    if (this.peso !== null && this.peso !== undefined) {
      const valor = Number(this.peso);
      if (!isNaN(valor)) {
        if (valor > 999) this.peso = 999;
        else if (valor <= 0) this.peso = 0.02;
      }
    }
  }

  limitarTemperatura(): void {
    if (this.temperatura !== null && this.temperatura !== undefined) {
      const valor = Number(this.temperatura);
      if (!isNaN(valor)) {
        if (valor > 45) this.temperatura = 45;
        else if (valor <= 0) this.temperatura = 0.1;
      }
    }
  }

  limitarFrecuenciaCardiaca(): void {
    if (this.frecuenciaCardiaca !== null && this.frecuenciaCardiaca !== undefined) {
      const valor = Number(this.frecuenciaCardiaca);
      if (!isNaN(valor)) {
        if (valor > 300) this.frecuenciaCardiaca = 300;
        else if (valor <= 0) this.frecuenciaCardiaca = 1;
      }
    }
  }

  limitarFrecuenciaRespiratoria(): void {
    if (this.frecuenciaRespiratoria !== null && this.frecuenciaRespiratoria !== undefined) {
      const valor = Number(this.frecuenciaRespiratoria);
      if (!isNaN(valor)) {
        if (valor > 150) this.frecuenciaRespiratoria = 150;
        else if (valor <= 0) this.frecuenciaRespiratoria = 1;
      }
    }
  }

  limitarHospitalizacionTarifa(): void {
    if (this.hospitalizacionTarifa !== null && this.hospitalizacionTarifa !== undefined) {
      const valor = Number(this.hospitalizacionTarifa);
      if (!isNaN(valor)) {
        if (valor > 80000) this.hospitalizacionTarifa = 80000;
        else if (valor < 0) this.hospitalizacionTarifa = 5000;
      }
    }
  }

  // ── Evaluación de signos vitales ──────────────────────────────────────────
  get vitalPeso():                 VitalResult | null { return evaluarPeso(this.peso); }
  get vitalTemperatura():          VitalResult | null { return evaluarTemperatura(this.temperatura); }
  get vitalFrecuenciaCardiaca():   VitalResult | null { return evaluarFrecuenciaCardiaca(this.frecuenciaCardiaca); }
  get vitalFrecuenciaRespiratoria(): VitalResult | null { return evaluarFrecuenciaRespiratoria(this.frecuenciaRespiratoria); }

  limitarDosis(med: Medicamento): void {
    if (med.dosisValor !== null && med.dosisValor !== undefined && med.dosisValor !== '') {
      const valor = Number(med.dosisValor);
      if (!isNaN(valor)) {
        if (valor > 9999) {
          med.dosisValor = '9999';
        } else if (valor < 0.01 && valor !== 0) {
          med.dosisValor = '0.01';
        }
      }
    }
  }

  guardarBorrador(): void {
    if (!this.atencion) return;
    this.medicalRecordService.guardarBorrador(this.buildRegistro());
    this.estadoGuardado = 'guardado';
  }

  cambiarSeccion(seccion: 'interno' | 'cliente'): void {
    // Si cambias a cliente desde interno, valida los campos internos
    if (seccion === 'cliente' && this.seccionActiva === 'interno') {
      this.continuarACliente();
      return;
    }
    this.seccionActiva = seccion;
  }

  /**
   * Valida que todos los campos obligatorios de la sección interna estén completos
   * antes de permitir continuar al resumen para cliente.
   * Previene que el veterinario cierre la atención sin completar la información clínica.
   */
  continuarACliente(): void {
    // Validar campos obligatorios de la sección interna antes de continuar
    this.validarPeso();
    this.validarTemperatura();
    this.validarFrecuenciaCardiaca();
    this.validarFrecuenciaRespiratoria();
    this.validarObservacionesGenerales();
    this.validarDiagnosticoPrincipal();
    this.validarNotasClinicas();
    this.validarMedicamentos();

    const hayErroresInternos =
      this.errores.peso ||
      this.errores.temperatura ||
      this.errores.frecuenciaCardiaca ||
      this.errores.frecuenciaRespiratoria ||
      this.errores.observacionesGenerales ||
      this.errores.diagnosticoPrincipal ||
      this.errores.notasClinicas ||
      this.errores.medicamentos.some(e => e);

    if (hayErroresInternos) {
      this.errorMsg = 'Por favor completa todos los campos obligatorios de la información clínica';
      // Scroll al primer error
      setTimeout(() => {
        const firstError = document.querySelector('.input-error');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    this.errorMsg = '';
    this.seccionActiva = 'cliente';
  }

  validarDiagnosticoPrincipal(): void {
    if (!this.diagnosticoPrincipal.trim()) {
      this.errores.diagnosticoPrincipal = 'El diagnóstico principal es obligatorio';
    } else {
      this.errores.diagnosticoPrincipal = '';
    }
  }

  validarDiagnosticoCliente(): void {
    if (!this.diagnosticoCliente.trim()) {
      this.errores.diagnosticoCliente = 'El diagnóstico para el cliente es obligatorio';
    } else {
      this.errores.diagnosticoCliente = '';
    }
  }

  validarPeso(): void {
    if (this.peso === null || this.peso === undefined || String(this.peso).trim() === '') {
      this.errores.peso = 'El peso es obligatorio';
    } else if (this.peso <= 0) {
      this.errores.peso = 'El peso debe ser mayor a 0';
    } else if (this.peso < 0.02) {
      this.errores.peso = 'El peso mínimo válido es 0.02 kg';
    } else if (this.peso > 999) {
      this.errores.peso = 'El peso no puede superar 999 kg';
    } else {
      this.errores.peso = '';
    }
  }

  validarTemperatura(): void {
    if (this.temperatura === null || this.temperatura === undefined || String(this.temperatura).trim() === '') {
      this.errores.temperatura = 'La temperatura es obligatoria';
    } else if (this.temperatura <= 0) {
      this.errores.temperatura = 'La temperatura debe ser mayor a 0°C';
    } else if (this.temperatura > 45) {
      this.errores.temperatura = 'La temperatura no puede superar 45°C';
    } else {
      this.errores.temperatura = '';
    }
  }


  validarFrecuenciaCardiaca(): void {
    if (this.frecuenciaCardiaca === null || this.frecuenciaCardiaca === undefined || String(this.frecuenciaCardiaca).trim() === '') {
      this.errores.frecuenciaCardiaca = 'La frecuencia cardíaca es obligatoria';
    } else if (this.frecuenciaCardiaca <= 0) {
      this.errores.frecuenciaCardiaca = 'La frecuencia cardíaca debe ser mayor a 0 lpm';
    } else if (this.frecuenciaCardiaca > 300) {
      this.errores.frecuenciaCardiaca = 'La frecuencia cardíaca no puede superar 300 lpm';
    } else {
      this.errores.frecuenciaCardiaca = '';
    }
  }

  validarFrecuenciaRespiratoria(): void {
    if (this.frecuenciaRespiratoria === null || this.frecuenciaRespiratoria === undefined || String(this.frecuenciaRespiratoria).trim() === '') {
      this.errores.frecuenciaRespiratoria = 'La frecuencia respiratoria es obligatoria';
    } else if (this.frecuenciaRespiratoria <= 0) {
      this.errores.frecuenciaRespiratoria = 'La frecuencia respiratoria debe ser mayor a 0 rpm';
    } else if (this.frecuenciaRespiratoria > 150) {
      this.errores.frecuenciaRespiratoria = 'La frecuencia respiratoria no puede superar 150 rpm';
    } else {
      this.errores.frecuenciaRespiratoria = '';
    }
  }

  validarObservacionesGenerales(): void {
    if (!this.observacionesGenerales.trim()) {
      this.errores.observacionesGenerales = 'Las observaciones generales son obligatorias';
    } else {
      this.errores.observacionesGenerales = '';
    }
  }

  validarNotasClinicas(): void {
    if (!this.notasClinicas.trim()) {
      this.errores.notasClinicas = 'Las notas clínicas internas son obligatorias';
    } else {
      this.errores.notasClinicas = '';
    }
  }

  validarIndicacionesCliente(): void {
    if (!this.indicacionesCliente.trim()) {
      this.errores.indicacionesCliente = 'Las indicaciones de cuidado son obligatorias';
    } else {
      this.errores.indicacionesCliente = '';
    }
  }

  validarHospitalizacionTarifa(): void {
    if (this.hospitalizacionTarifa === null || this.hospitalizacionTarifa === undefined || String(this.hospitalizacionTarifa).trim() === '') {
      this.errores.hospitalizacionTarifa = 'La tarifa por hora es obligatoria';
    } else if (this.hospitalizacionTarifa < 5000) {
      this.errores.hospitalizacionTarifa = 'La tarifa mínima es de $5.000 COP';
    } else if (this.hospitalizacionTarifa > 80000) {
      this.errores.hospitalizacionTarifa = 'La tarifa máxima es de $80.000 COP';
    } else {
      this.errores.hospitalizacionTarifa = '';
    }
  }

  tieneErroresValidacion(): boolean {
    // Verificar si hay errores según el estado del paciente
    if (this.estadoPaciente === 'estable') {
      return !!(
        this.errores.diagnosticoPrincipal ||
        this.errores.diagnosticoCliente ||
        this.errores.proximoControlFecha ||
        this.errores.proximoControlMotivo ||
        this.errores.medicamentos.some(e => e) ||
        this.errores.medicamentosRecetados.some(e => e)
      );
    } else if (this.estadoPaciente === 'hospitalizacion') {
      return !!(
        this.errores.diagnosticoPrincipal ||
        this.errores.hospitalizacionMotivo ||
        this.errores.hospitalizacionTarifa ||
        this.errores.medicamentos.some(e => e)
      );
    } else if (this.estadoPaciente === 'fallecido') {
      return !!(
        this.errores.diagnosticoPrincipal ||
        this.errores.causaMuerteAtencion ||
        this.errores.medicamentos.some(e => e)
      );
    }
    return false;
  }

  validarProximoControl(): void {
    if (this.requiereProximoControl) {
      if (!this.proximoControlFecha) {
        this.errores.proximoControlFecha = 'Debes especificar la fecha del próximo control';
      } else {
        this.errores.proximoControlFecha = '';
      }

      if (!this.proximoControlMotivo.trim()) {
        this.errores.proximoControlMotivo = 'Debes especificar el motivo del próximo control';
      } else {
        this.errores.proximoControlMotivo = '';
      }
    } else {
      this.errores.proximoControlFecha = '';
      this.errores.proximoControlMotivo = '';
    }
  }

  onRequiereProximoControlChange(): void {
    if (!this.requiereProximoControl) {
      this.proximoControlFecha = '';
      this.proximoControlMotivo = '';
      this.errores.proximoControlFecha = '';
      this.errores.proximoControlMotivo = '';
    }
    this.onFormChange();
  }

  onAdjuntarFotosChange(): void {
    if (!this.adjuntarFotos) {
      this.fotosAdjuntas = [];
    }
    this.onFormChange();
  }

  onRequiereHospitalizacionChange(): void {
    if (this.requiereHospitalizacion) {
      // Mutuamente excluyente con fallecimiento
      this.fallecioEnAtencion = false;
      this.causaMuerteAtencion = '';
      this.errores.causaMuerteAtencion = '';
    } else {
      this.hospitalizacionMotivo = '';
      this.hospitalizacionObservaciones = '';
      this.hospitalizacionTarifa = null;
      this.errores.hospitalizacionMotivo = '';
      this.errores.hospitalizacionTarifa = '';
    }
    this.onFormChange();
  }

  onFallecioEnAtencionChange(): void {
    if (this.fallecioEnAtencion) {
      // Mutuamente excluyente con hospitalización
      this.requiereHospitalizacion = false;
      this.hospitalizacionMotivo = '';
      this.hospitalizacionObservaciones = '';
      this.hospitalizacionTarifa = null;
      this.errores.hospitalizacionMotivo = '';
      this.errores.hospitalizacionTarifa = '';
    } else {
      this.causaMuerteAtencion = '';
      this.errores.causaMuerteAtencion = '';
    }
    this.onFormChange();
  }

  onEstadoPacienteChange(): void {
    // Sincronizar con las variables booleanas existentes
    this.requiereHospitalizacion = this.estadoPaciente === 'hospitalizacion';
    this.fallecioEnAtencion = this.estadoPaciente === 'fallecido';

    // Limpiar campos según el estado
    if (this.estadoPaciente === 'estable') {
      // Limpiar campos de hospitalización y fallecimiento
      this.hospitalizacionMotivo = '';
      this.hospitalizacionObservaciones = '';
      this.hospitalizacionTarifa = null;
      this.causaMuerteAtencion = '';
      this.errores.hospitalizacionMotivo = '';
      this.errores.hospitalizacionTarifa = '';
      this.errores.causaMuerteAtencion = '';
    } else if (this.estadoPaciente === 'hospitalizacion') {
      // Limpiar campos de fallecimiento
      this.causaMuerteAtencion = '';
      this.errores.causaMuerteAtencion = '';
    } else if (this.estadoPaciente === 'fallecido') {
      // Limpiar campos de hospitalización
      this.hospitalizacionMotivo = '';
      this.hospitalizacionObservaciones = '';
      this.hospitalizacionTarifa = null;
      this.errores.hospitalizacionMotivo = '';
      this.errores.hospitalizacionTarifa = '';
    }

    this.onFormChange();
  }

  /**
   * Maneja la selección de archivo de foto para adjuntar al registro médico.
   * Valida tipo de archivo (solo imágenes) y tamaño (máximo 2MB).
   * Sube la foto a Cloudinary y agrega la URL al array de fotos adjuntas.
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.uploadError = '';

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      this.uploadError = 'Solo se permiten imágenes (JPG, PNG, WEBP) o archivos PDF';
      input.value = '';
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      this.uploadError = 'El archivo no debe superar 3MB';
      input.value = '';
      return;
    }

    this.uploadingPhoto = true;

    this.medicalRecordService.uploadPhoto(file).subscribe({
      next: (res) => {
        this.fotosAdjuntas.push(res.secure_url);
        this.uploadingPhoto = false;
        this.onFormChange();
        input.value = '';
      },
      error: (err) => {
        console.error('Error subiendo archivo:', err);
        this.uploadError = 'Error al subir el archivo. Intenta de nuevo.';
        this.uploadingPhoto = false;
        input.value = '';
      }
    });
  }

  pdfSeleccionado: SafeResourceUrl | null = null;
  pdfUrlOriginal: string | null = null; // URL original sin sanitizar para descarga

  esPdf(url: string): boolean {
    return url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('/raw/');
  }

  abrirPdf(url: string): void {
    // Guardar URL original para descarga
    this.pdfUrlOriginal = url;
    // Sanitizar la URL para que Angular permita cargarla en el iframe
    this.pdfSeleccionado = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  cerrarPdf(): void {
    this.pdfSeleccionado = null;
    this.pdfUrlOriginal = null;
  }

  descargarPdf(url: string, numero: number): void {
    this.descargandoPdf = true;
    
    // Transformar la URL de Cloudinary para forzar descarga
    // Cloudinary permite agregar fl_attachment para forzar descarga
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
      this.uploadError = 'Error al descargar el PDF. Intenta de nuevo.';
      this.descargandoPdf = false;
      document.body.removeChild(link);
    }
  }

  /**
   * Elimina una foto del array de fotos adjuntas.
   */
  eliminarFoto(index: number): void {
    this.fotosAdjuntas.splice(index, 1);
    this.onFormChange();
  }

  validarMedicamentos(): void {
    this.errores.medicamentos = [];
    this.medicamentos.forEach((med, i) => {
      const errores: string[] = [];
      if (!med.nombre) errores.push('nombre del medicamento');
      if (!med.dosisValor) {
        errores.push('dosis');
      } else {
        const dosis = Number(med.dosisValor);
        if (dosis < 0.01) {
          this.errores.medicamentos[i] = 'La dosis debe ser al menos 0.01';
          return;
        }
        if (dosis > 9999) {
          this.errores.medicamentos[i] = 'La dosis no puede superar 9999';
          return;
        }
      }
      if (!med.via) errores.push('vía de administración');

      if (errores.length > 0) {
        this.errores.medicamentos[i] = `Falta: ${errores.join(', ')}`;
      } else {
        this.errores.medicamentos[i] = '';
      }
    });
  }

  validarMedicamentosRecetados(): void {
    this.errores.medicamentosRecetados = [];
    this.medicamentosRecetados.forEach((med, i) => {
      const errores: string[] = [];
      if (!med.nombre) errores.push('nombre del medicamento');
      if (!med.dosisValor) {
        errores.push('dosis');
      } else {
        const dosis = Number(med.dosisValor);
        if (dosis < 0.01) {
          this.errores.medicamentosRecetados[i] = 'La dosis debe ser al menos 0.01';
          return;
        }
        if (dosis > 9999) {
          this.errores.medicamentosRecetados[i] = 'La dosis no puede superar 9999';
          return;
        }
      }
      if (!med.frecuencia) errores.push('frecuencia');
      if (!med.duracion) errores.push('duración');

      if (errores.length > 0) {
        this.errores.medicamentosRecetados[i] = `Falta: ${errores.join(', ')}`;
      } else {
        this.errores.medicamentosRecetados[i] = '';
      }
    });
  }

  agregarMedicamento(): void {
    this.medicamentos.push({ nombre: '', dosisValor: '', dosisUnidad: 'mg', via: '' });
    this.validarMedicamentos();
    this.onFormChange();
  }

  eliminarMedicamento(index: number): void {
    this.medicamentos.splice(index, 1);
    this.validarMedicamentos();
    this.onFormChange();
  }

  agregarMedicamentoRecetado(): void {
    this.medicamentosRecetados.push({ nombre: '', dosisValor: '', dosisUnidad: 'mg', via: '', frecuencia: '', duracion: '' });
    this.validarMedicamentosRecetados();
    this.onFormChange();
  }

  eliminarMedicamentoRecetado(index: number): void {
    this.medicamentosRecetados.splice(index, 1);
    this.validarMedicamentosRecetados();
    this.onFormChange();
  }

  cerrarAtencion(): void {
    if (!this.atencion || this.isSubmitting) return;

    // Validar campos obligatorios comunes
    this.validarDiagnosticoPrincipal();
    this.validarMedicamentos();
    this.validarMedicamentosRecetados();

    // Validar campos específicos según el estado del paciente
    if (this.estadoPaciente === 'estable') {
      this.validarDiagnosticoCliente();
      this.validarProximoControl();
    } else if (this.estadoPaciente === 'hospitalizacion') {
      if (!this.hospitalizacionMotivo.trim()) {
        this.errores.hospitalizacionMotivo = 'El motivo de hospitalización es obligatorio';
      } else {
        this.errores.hospitalizacionMotivo = '';
      }
      this.validarHospitalizacionTarifa();
    } else if (this.estadoPaciente === 'fallecido') {
      if (!this.causaMuerteAtencion.trim()) {
        this.errores.causaMuerteAtencion = 'La causa de defunción es obligatoria';
      } else {
        this.errores.causaMuerteAtencion = '';
      }
    }

    const hayErrores =
      this.errores.diagnosticoPrincipal ||
      (this.estadoPaciente === 'estable' && this.errores.diagnosticoCliente) ||
      (this.estadoPaciente === 'estable' && (this.errores.proximoControlFecha || this.errores.proximoControlMotivo)) ||
      (this.estadoPaciente === 'hospitalizacion' && (this.errores.hospitalizacionMotivo || this.errores.hospitalizacionTarifa)) ||
      (this.estadoPaciente === 'fallecido' && this.errores.causaMuerteAtencion) ||
      this.errores.medicamentos.some(e => e) ||
      this.errores.medicamentosRecetados.some(e => e);

    if (hayErrores) {
      this.errorMsg = 'Por favor completa todos los campos obligatorios y verifica los medicamentos';
      return;
    }

    this.isSubmitting = true;
    this.errorMsg = '';

    // 1. Actualizar hoja médica maestra si hay nuevos descubrimientos
    this.updateMedicalProfile().subscribe({
      next: (medicalProfileUpdated) => {
        if (!medicalProfileUpdated) {
          this.errorMsg = 'Error al actualizar la hoja médica. Intenta de nuevo.';
          this.isSubmitting = false;
          return;
        }

        // 2. Guardar el registro médico
        this.medicalRecordService.guardar(this.buildRegistro(), true).subscribe({
          next: () => {
            // 3. Si requiere hospitalización o falleció, registrarlo
            if ((this.requiereHospitalizacion || this.fallecioEnAtencion) && this.atencion) {
              const motivo = this.requiereHospitalizacion
                ? this.hospitalizacionMotivo.trim()
                : `Fallecimiento durante atención: ${this.causaMuerteAtencion.trim()}`;

              this.hospitalizationService.create({
                petId: this.atencion.petId,
                appointmentId: this.atencion.appointmentId,
                reason: motivo,
                initialObservations: this.hospitalizacionObservaciones.trim() || undefined,
                hourlyRate: this.hospitalizacionTarifa || 50000
              }).subscribe({
                next: (hosp) => {
                  // Si falleció, registrar el fallecimiento inmediatamente
                  if (this.fallecioEnAtencion) {
                    this.hospitalizationService.recordDeceased(hosp.id, this.causaMuerteAtencion.trim()).subscribe({
                      next: () => this.finalizarCierre(),
                      error: () => this.finalizarCierre()
                    });
                  } else {
                    this.finalizarCierre();
                  }
                },
                error: (err) => {
                  console.error('Error al crear hospitalización:', err);
                  this.errorMsg = 'Atención cerrada, pero hubo un error al registrar la hospitalización. Hazlo manualmente.';
                  this.isSubmitting = false;
                  setTimeout(() => this.finalizarCierre(), 3000);
                }
              });
            } else {
              this.finalizarCierre();
            }
          },
          error: (err) => {
            console.error('Error al cerrar atención:', err);
            
            // Intentar extraer mensaje de error del backend
            let errorDetail = '';
            if (err.error?.message) {
              errorDetail = err.error.message;
            } else if (err.error?.errors) {
              // Si hay errores de validación específicos
              errorDetail = Object.values(err.error.errors).join(', ');
            }
            
            if (err.status === 403) {
              this.errorMsg = 'Error de permisos. Verifica que tu sesión no haya expirado.';
            } else if (err.status === 400) {
              this.errorMsg = errorDetail 
                ? `Datos inválidos: ${errorDetail}` 
                : 'Datos inválidos. Verifica que todos los campos obligatorios estén completos y correctos.';
              
              // Scroll al primer error visible
              setTimeout(() => {
                const firstError = document.querySelector('.field-error');
                if (firstError) {
                  firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 100);
            } else {
              this.errorMsg = errorDetail 
                ? `Error: ${errorDetail}` 
                : `Error al cerrar la atención (${err.status}). Intenta de nuevo.`;
            }
            this.isSubmitting = false;
          }
        });
      },
      error: () => {
        this.errorMsg = 'Error al actualizar la hoja médica. Intenta de nuevo.';
        this.isSubmitting = false;
      }
    });
  }

  private finalizarCierre(): void {
    if (!this.atencion) return;

    // Llamar al backend para marcar la cita como COMPLETED
    this.appointmentService.completeAppointment(this.atencion.appointmentId).subscribe({
      next: () => {
        this.medicalRecordService.eliminarBorrador(this.atencion!.appointmentId);
        this.medicalRecordService.cerrarAtencion();
        this.isSubmitting = false;
        this.router.navigate(['/veterinario/atencion-medica']);
      },
      error: (err) => {
        console.error('Error al completar la cita:', err);
        // Aún así cerrar la atención localmente
        this.medicalRecordService.eliminarBorrador(this.atencion!.appointmentId);
        this.medicalRecordService.cerrarAtencion();
        this.isSubmitting = false;
        this.router.navigate(['/veterinario/atencion-medica']);
      }
    });
  }

  volver(): void {
    this.abrirModalCancelar();
  }

  abrirModalCancelar(): void {
    this.mostrarModalCancelar = true;
  }

  cerrarModalCancelar(): void {
    this.mostrarModalCancelar = false;
  }

  confirmarCancelarAtencion(): void {
    if (!this.atencion || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMsg = '';
    this.mostrarModalCancelar = false;

    this.appointmentService.cancelStartedAppointment(this.atencion.appointmentId).subscribe({
      next: () => {
        this.medicalRecordService.cerrarAtencion();
        this.isSubmitting = false;
        this.router.navigate(['/veterinario/atencion-medica']);
      },
      error: (err) => {
        console.error('Error al cancelar atención:', err);
        // Si el backend dice 400 (cita ya no está IN_PROGRESS), limpiar estado local igual
        if (err.status === 400 || err.status === 404) {
          this.medicalRecordService.cerrarAtencion();
          this.isSubmitting = false;
          this.router.navigate(['/veterinario/atencion-medica']);
        } else {
          this.errorMsg = 'Error al cancelar la atención. Intenta de nuevo.';
          this.isSubmitting = false;
        }
      }
    });
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

  private buildRegistro(): RegistroMedico {
    return {
      appointmentId:          this.atencion!.appointmentId,
      peso:                   this.peso,
      temperatura:            this.temperatura,
      frecuenciaCardiaca:     this.frecuenciaCardiaca,
      frecuenciaRespiratoria: this.frecuenciaRespiratoria,
      observacionesGenerales: this.observacionesGenerales,
      diagnosticoPrincipal:   this.diagnosticoPrincipal,
      diagnosticoSecundario:  this.diagnosticoSecundario,
      notasClinicas:          this.notasClinicas,
      medicamentos:           this.medicamentos,
      indicaciones:           this.indicaciones,
      diagnosticoCliente:     this.diagnosticoCliente,
      medicamentosRecetados:  this.medicamentosRecetados,
      indicacionesCliente:    this.indicacionesCliente,
      vacunasAplicadas:       this.vacunasAplicadas,
      proximoControlFecha:    this.requiereProximoControl ? this.proximoControlFecha : '',
      proximoControlMotivo:   this.requiereProximoControl ? this.proximoControlMotivo : '',
      fotosAdjuntas:          this.adjuntarFotos ? this.fotosAdjuntas : [],
      costoMedicamentos:      this.costoMedicamentos,
      costoTotal:             this.costoTotal,
    };
  }

  tieneMedicamentosIncompletos(): boolean {
    return this.errores.medicamentos.some(e => e);
  }

  tieneMedicamentosRecetadosIncompletos(): boolean {
    return this.errores.medicamentosRecetados.some(e => e);
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return '';
    const d = new Date(dateString);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  }

  calcularEdad(birthDate: string | null): string {
    if (!birthDate) return '—';
    const partes = birthDate.split('-');
    if (partes.length !== 3) return '—';
    const hoy        = new Date();
    const nacimiento = new Date(
      parseInt(partes[0], 10),
      parseInt(partes[1], 10) - 1,
      parseInt(partes[2], 10)
    );
    let años  = hoy.getFullYear() - nacimiento.getFullYear();
    let meses = hoy.getMonth()    - nacimiento.getMonth();
    if (meses < 0) { años--; meses += 12; }
    if (años === 0) return `${meses} mes${meses !== 1 ? 'es' : ''}`;
    return `${años} año${años !== 1 ? 's' : ''}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════
  // AUTOCOMPLETADO MÉDICO CON IA
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════

  abrirAutocompletado(): void {
    this.mostrarAutocompletado = true;
    this.descripcionSintomas = '';
    this.sugerenciasMedicas = null;
    this.errorSugerencias = '';
  }

  cerrarAutocompletado(): void {
    this.mostrarAutocompletado = false;
    this.descripcionSintomas = '';
    this.sugerenciasMedicas = null;
    this.errorSugerencias = '';
  }

  obtenerSugerenciasMedicas(): void {
    if (!this.descripcionSintomas.trim()) {
      this.errorSugerencias = 'Por favor describe los síntomas observados';
      return;
    }

    this.cargandoSugerencias = true;
    this.errorSugerencias = '';
    this.sugerenciasMedicas = null;

    const request: MedicalFormSuggestionRequest = {
      symptoms: this.descripcionSintomas,
      animalType: this.atencion?.petSpecies || '',
      age: this.atencion?.petBirthday ? this.calcularEdad(this.atencion.petBirthday) : '',
      weight: this.peso ? `${this.peso} kg` : '',
      breed: '', // No disponible en AtencionActiva
      additionalInfo: this.observacionesGenerales || ''
    };

    this.chatbotService.getMedicalFormSuggestions(request).subscribe({
      next: (response) => {
        this.cargandoSugerencias = false;
        if (response.success) {
          this.sugerenciasMedicas = response;
        } else {
          this.errorSugerencias = response.errorMessage || 'Error obteniendo sugerencias médicas';
        }
      },
      error: (error) => {
        this.cargandoSugerencias = false;
        this.errorSugerencias = 'Error conectando con el servicio de IA médica';
        console.error('Error obteniendo sugerencias médicas:', error);
      }
    });
  }

  aplicarDiagnosticoSugerido(): void {
    if (!this.sugerenciasMedicas) return;
    this.diagnosticoPrincipal = this.sugerenciasMedicas.suggestedDiagnosis;
    this.diagnosticoCliente = this.sugerenciasMedicas.suggestedDiagnosis;
    this.onFormChange();
  }

  aplicarTratamientoSugerido(): void {
    if (!this.sugerenciasMedicas) return;
    this.indicaciones = this.sugerenciasMedicas.recommendedTreatment;
    this.indicacionesCliente = this.sugerenciasMedicas.recommendedTreatment;
    this.onFormChange();
  }

  aplicarMedicamentosSugeridos(): void {
    if (!this.sugerenciasMedicas?.medications) return;
    
    // Agregar medicamentos sugeridos a la lista actual
    this.sugerenciasMedicas.medications.forEach(medText => {
      // Parsear el texto del medicamento (ej: "Amoxicilina 10mg/kg BID")
      const parts = medText.split(' ');
      const nombre = parts[0];
      const dosisText = parts.slice(1).join(' ');
      
      const nuevoMed: Medicamento = {
        nombre: nombre,
        dosisValor: '',
        dosisUnidad: 'mg/kg',
        via: 'Oral',
        frecuencia: dosisText, // Usar frecuencia para almacenar la información adicional
        duracion: ''
      };
      
      this.medicamentos.push(nuevoMed);
      this.errores.medicamentos.push('');
    });
    
    this.onFormChange();
  }

  aplicarExamenesSugeridos(): void {
    if (!this.sugerenciasMedicas?.complementaryExams) return;
    
    const examenes = this.sugerenciasMedicas.complementaryExams.join(', ');
    if (this.notasClinicas) {
      this.notasClinicas += `\n\nExámenes recomendados: ${examenes}`;
    } else {
      this.notasClinicas = `Exámenes recomendados: ${examenes}`;
    }
    
    this.onFormChange();
  }

  aplicarPronosticoSugerido(): void {
    if (!this.sugerenciasMedicas?.prognosis) return;
    
    if (this.notasClinicas) {
      this.notasClinicas += `\n\nPronóstico: ${this.sugerenciasMedicas.prognosis}`;
    } else {
      this.notasClinicas = `Pronóstico: ${this.sugerenciasMedicas.prognosis}`;
    }
    
    this.onFormChange();
  }

  aplicarRecomendacionesSugeridas(): void {
    if (!this.sugerenciasMedicas?.ownerRecommendations) return;
    
    const recomendaciones = this.sugerenciasMedicas.ownerRecommendations.join('\n• ');
    if (this.indicacionesCliente) {
      this.indicacionesCliente += `\n\nRecomendaciones adicionales:\n• ${recomendaciones}`;
    } else {
      this.indicacionesCliente = `Recomendaciones:\n• ${recomendaciones}`;
    }
    
    this.onFormChange();
  }

  aplicarTodasLasSugerencias(): void {
    if (!this.sugerenciasMedicas) return;
    
    this.aplicarDiagnosticoSugerido();
    this.aplicarTratamientoSugerido();
    this.aplicarMedicamentosSugeridos();
    this.aplicarExamenesSugeridos();
    this.aplicarPronosticoSugerido();
    this.aplicarRecomendacionesSugeridas();
    
    this.cerrarAutocompletado();
  }
}

