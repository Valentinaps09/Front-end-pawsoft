import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
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
import { AppointmentService } from 'src/app/services/appointment.service';
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

  // Control de secciones
  seccionActiva: 'interno' | 'cliente' = 'interno';

  // Modal de confirmación
  mostrarModalCancelar = false;

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
  ) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('email') || 'Veterinario';
    this.userRole = localStorage.getItem('rol') || 'ROLE_VETERINARIO';

    this.atencion = this.medicalRecordService.getAtencionActiva();

    if (!this.atencion) {
      this.router.navigate(['/veterinario/atencion-medica']);
      return;
    }

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
        if (valor > 999) this.frecuenciaCardiaca = 999;
        else if (valor <= 0) this.frecuenciaCardiaca = 1;
      }
    }
  }

  limitarFrecuenciaRespiratoria(): void {
    if (this.frecuenciaRespiratoria !== null && this.frecuenciaRespiratoria !== undefined) {
      const valor = Number(this.frecuenciaRespiratoria);
      if (!isNaN(valor)) {
        if (valor > 999) this.frecuenciaRespiratoria = 999;
        else if (valor <= 0) this.frecuenciaRespiratoria = 1;
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
    } else if (this.frecuenciaCardiaca > 999) {
      this.errores.frecuenciaCardiaca = 'La frecuencia cardíaca no puede superar 999 lpm';
    } else {
      this.errores.frecuenciaCardiaca = '';
    }
  }

  validarFrecuenciaRespiratoria(): void {
    if (this.frecuenciaRespiratoria === null || this.frecuenciaRespiratoria === undefined || String(this.frecuenciaRespiratoria).trim() === '') {
      this.errores.frecuenciaRespiratoria = 'La frecuencia respiratoria es obligatoria';
    } else if (this.frecuenciaRespiratoria <= 0) {
      this.errores.frecuenciaRespiratoria = 'La frecuencia respiratoria debe ser mayor a 0 rpm';
    } else if (this.frecuenciaRespiratoria > 999) {
      this.errores.frecuenciaRespiratoria = 'La frecuencia respiratoria no puede superar 999 rpm';
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

  /**
   * Maneja la selección de archivo de foto para adjuntar al registro médico.
   * Valida tipo de archivo (solo imágenes) y tamaño (máximo 2MB).
   * Sube la foto a Cloudinary y agrega la URL al array de fotos adjuntas.
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    if (!file.type.startsWith('image/')) {
      this.errorMsg = 'Solo se permiten archivos de imagen';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.errorMsg = 'La imagen no debe superar 2MB';
      return;
    }

    this.uploadingPhoto = true;
    this.errorMsg = '';

    this.medicalRecordService.uploadPhoto(file).subscribe({
      next: (res) => {
        this.fotosAdjuntas.push(res.secure_url);
        this.uploadingPhoto = false;
        this.onFormChange();
        input.value = '';
      },
      error: (err) => {
        console.error('Error subiendo foto:', err);
        this.errorMsg = 'Error al subir la foto. Intenta de nuevo.';
        this.uploadingPhoto = false;
        input.value = '';
      }
    });
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

    // Validar solo campos realmente obligatorios
    this.validarDiagnosticoPrincipal();
    this.validarDiagnosticoCliente();
    this.validarProximoControl();
    this.validarMedicamentos();
    this.validarMedicamentosRecetados();

    const hayErrores =
      this.errores.diagnosticoPrincipal ||
      this.errores.diagnosticoCliente ||
      this.errores.proximoControlFecha ||
      this.errores.proximoControlMotivo ||
      this.errores.medicamentos.some(e => e) ||
      this.errores.medicamentosRecetados.some(e => e);

    if (hayErrores) {
      this.errorMsg = 'Por favor completa todos los campos obligatorios y verifica los medicamentos';
      return;
    }

    this.isSubmitting = true;
    this.errorMsg = '';

    this.medicalRecordService.guardar(this.buildRegistro(), true).subscribe({
      next: () => {
        this.medicalRecordService.eliminarBorrador(this.atencion!.appointmentId);
        this.medicalRecordService.cerrarAtencion();
        this.isSubmitting = false;
        this.router.navigate(['/veterinario/atencion-medica']);
      },
      error: (err) => {
        console.error('Error al cerrar atención:', err);
        if (err.status === 403) {
          this.errorMsg = 'Error de permisos (403). Verifica que tu sesión no haya expirado.';
        } else if (err.status === 400) {
          this.errorMsg = 'Datos inválidos (400). Verifica que todos los campos estén correctos.';
        } else {
          this.errorMsg = `Error al cerrar la atención (${err.status}). Intenta de nuevo.`;
        }
        this.isSubmitting = false;
      }
    });
  }

  volver(): void {
    this.router.navigate(['/veterinario/atencion-medica']);
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
        this.errorMsg = 'Error al cancelar la atención. Intenta de nuevo.';
        this.isSubmitting = false;
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
}
