# Documento de Diseño: Historial Clínico y Atención Médica

## Visión General

Este módulo extiende el panel veterinario de PawSoft con tres vistas nuevas y un servicio centralizado. El flujo sigue el ciclo de vida de una cita: `CONFIRMED → en proceso → COMPLETED`. Todos los componentes son standalone, siguen el patrón visual del `dashboard-vet` existente y usan TypeScript con Angular + Ionic.

---

## Interfaces TypeScript

```typescript
// src/app/services/medical-record.service.ts (interfaces exportadas)

export interface AtencionActiva {
  appointmentId: string;
  petName: string;
  petSpecies: string;
  petAge: number;
  petSex: string;
  ownerName: string;
  reason: string;
  appointmentNumber: string;
  appointmentTime: string;
}

export interface ExamenFisico {
  peso: number | null;
  temperatura: number | null;
  frecuenciaCardiaca: number | null;
  observaciones: string;
}

export interface Diagnostico {
  principal: string;
  secundario: string;
  notasClinicas: string;
}

export interface Medicamento {
  nombre: string;
  dosis: string;
  via: string;
}

export interface VacunaControl {
  nombre: string;
  estado: 'aplicada_hoy' | 'vencida' | 'pendiente';
  aplicadaHoy: boolean;
}

export interface ProximoControl {
  fecha: string;
  motivo: string;
}

export interface RegistroMedico {
  appointmentId: string;
  examenFisico: ExamenFisico;
  diagnostico: Diagnostico;
  medicamentos: Medicamento[];
  vacunas: VacunaControl[];
  proximoControl: ProximoControl;
  indicaciones: string;
}
```

---

## Arquitectura de Componentes

```
src/app/
├── services/
│   └── medical-record.service.ts          ← Servicio centralizado (nuevo)
├── pages/appointments/dashboard-vet/
│   ├── atencion-medica/
│   │   ├── atencion-medica.component.ts
│   │   ├── atencion-medica.component.html
│   │   └── atencion-medica.component.scss
│   ├── formulario-consulta/
│   │   ├── formulario-consulta.component.ts
│   │   ├── formulario-consulta.component.html
│   │   └── formulario-consulta.component.scss
│   └── historial-clinico/
│       ├── historial-clinico.component.ts
│       ├── historial-clinico.component.html
│       └── historial-clinico.component.scss
└── share/components/app-sidebar/
    └── app-sidebar.component.ts            ← Modificar sección CLÍNICO
```

---

## Diseño del Servicio: MedicalRecordService

```typescript
@Injectable({ providedIn: 'root' })
export class MedicalRecordService {
  private readonly STORAGE_KEY_ATENCION = 'atencion_activa';
  private readonly DRAFT_PREFIX = 'medical_draft_';

  private atencionActivaSubject = new BehaviorSubject<AtencionActiva | null>(null);
  atencionActiva$ = this.atencionActivaSubject.asObservable();

  constructor(private http: HttpClient) {
    // Restaurar desde localStorage al inicializar (Req 5.8)
    const stored = localStorage.getItem(this.STORAGE_KEY_ATENCION);
    if (stored) {
      this.atencionActivaSubject.next(JSON.parse(stored));
    }
  }

  iniciarAtencion(appointment: RecepAppointmentResponse): void {
    // Mapear RecepAppointmentResponse → AtencionActiva
    // Persistir en localStorage
    // Emitir en atencionActiva$
  }

  cerrarAtencion(): void {
    // Eliminar de localStorage
    // Emitir null
  }

  guardarBorrador(registro: Partial<RegistroMedico>): void {
    // Clave: medical_draft_{appointmentId}
    // Persistir en localStorage
  }

  obtenerBorrador(appointmentId: string): Partial<RegistroMedico> | null {
    // Recuperar desde localStorage
    // Retornar null si no existe
  }

  completarAtencion(registro: RegistroMedico): Observable<any> {
    // POST /api/vet/medical-records
    // Al completarse: eliminar borrador de localStorage
  }

  obtenerHistorial(): Observable<RegistroMedico[]> {
    // GET /api/vet/medical-records
  }
}
```

### Flujo de estado del BehaviorSubject

```
null ──iniciarAtencion()──► AtencionActiva ──cerrarAtencion()──► null
                                  │
                          completarAtencion()
                                  │
                               null (éxito)
```

---

## Diseño: Vista Atención Médica

**Ruta:** `/veterinario/atencion-medica`
**Archivo:** `atencion-medica.component.ts`

### Estructura del componente

```typescript
@Component({
  selector: 'app-atencion-medica',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent],
  templateUrl: './atencion-medica.component.html',
  styleUrls: ['./atencion-medica.component.scss']
})
export class AtencionMedicaComponent implements OnInit {
  userRole = 'ROLE_VETERINARIO';
  userName = '';

  citas: RecepAppointmentResponse[] = [];
  citasFiltradas: RecepAppointmentResponse[] = [];
  atencionActiva: AtencionActiva | null = null;

  searchText = '';
  filtroEstado: 'todas' | 'pendiente' | 'en_proceso' = 'todas';
  isLoading = false;
  errorMsg = '';

  ngOnInit(): void {
    // Cargar userName desde localStorage
    // Suscribirse a medicalRecordService.atencionActiva$
    // Llamar cargarCitas()
  }

  cargarCitas(): void {
    // appointmentService.getVetAppointments()
    // Filtrar solo status === 'CONFIRMED'
    // Manejar error con errorMsg
  }

  aplicarFiltros(): void {
    // Filtrar por searchText (petName | clientName)
    // Filtrar por filtroEstado
  }

  estaEnProceso(cita: RecepAppointmentResponse): boolean {
    return this.atencionActiva?.appointmentId === String(cita.id);
  }

  iniciarAtencion(cita: RecepAppointmentResponse): void {
    // medicalRecordService.iniciarAtencion(cita)
    // router.navigate(['/veterinario/formulario-consulta'])
  }

  continuarAtencion(): void {
    // router.navigate(['/veterinario/formulario-consulta'])
  }
}
```

### Layout HTML (estructura)

```
dashboard-layout
├── app-sidebar [userRole] [userName]
└── main.main-content
    ├── div.topbar  (título + fecha)
    ├── div.filters-row
    │   ├── input[search] → aplicarFiltros()
    │   └── select[filtroEstado] → aplicarFiltros()
    └── div.cards-grid
        └── div.cita-card *ngFor="let cita of citasFiltradas"
            ├── div.card-header  (emoji + nombre + especie)
            ├── div.card-body    (propietario, hora, motivo, nº cita)
            ├── div.estado-badge (naranja "Pendiente" | verde "En proceso")
            └── button           ("Iniciar atención →" | "Continuar →")
```

---

## Diseño: Vista Formulario de Consulta

**Ruta:** `/veterinario/formulario-consulta`
**Archivo:** `formulario-consulta.component.ts`

### Estructura del componente

```typescript
@Component({
  selector: 'app-formulario-consulta',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent],
  templateUrl: './formulario-consulta.component.html',
  styleUrls: ['./formulario-consulta.component.scss']
})
export class FormularioConsultaComponent implements OnInit, OnDestroy {
  userRole = 'ROLE_VETERINARIO';
  userName = '';
  atencionActiva: AtencionActiva | null = null;

  examenFisico: ExamenFisico = { peso: null, temperatura: null, frecuenciaCardiaca: null, observaciones: '' };
  diagnostico: Diagnostico = { principal: '', secundario: '', notasClinicas: '' };
  medicamentos: Medicamento[] = [];
  vacunas: VacunaControl[] = [];
  proximoControl: ProximoControl = { fecha: '', motivo: '' };
  indicaciones = '';

  estadoGuardado: 'guardado' | 'guardando' | 'sin_cambios' = 'sin_cambios';
  isSubmitting = false;
  errorMsg = '';

  private debounceTimer: any;

  ngOnInit(): void {
    // Suscribirse a atencionActiva$
    // Si null → router.navigate(['/veterinario/atencion-medica'])  (Req 3.1)
    // Si existe → cargar borrador desde localStorage
  }

  onFormChange(): void {
    // Debounce 2 segundos → guardarBorrador()  (Req 3.9)
    // estadoGuardado = 'guardando'
  }

  guardarBorrador(): void {
    // medicalRecordService.guardarBorrador(registro)
    // estadoGuardado = 'guardado'
  }

  agregarMedicamento(): void {
    // Push { nombre: '', dosis: '', via: '' }
  }

  eliminarMedicamento(index: number): void {
    // splice(index, 1)
  }

  cerrarAtencion(): void {
    // Validar campos requeridos
    // medicalRecordService.completarAtencion(registro)
    // Al éxito: appointmentService.completarCita(appointmentId)
    // Al éxito: medicalRecordService.cerrarAtencion()
    // Al éxito: router.navigate(['/veterinario/atencion-medica'])
    // Al error: mostrar errorMsg sin limpiar datos  (Req 3.12)
  }

  ngOnDestroy(): void {
    // Limpiar debounceTimer
  }
}
```

### Layout HTML (estructura)

```
dashboard-layout
├── app-sidebar [userRole] [userName]
└── main.main-content
    ├── div.topbar
    │   ├── button "← Volver"
    │   ├── span título
    │   └── span.estado-guardado (sin_cambios | guardando... | ✓ Guardado)
    ├── div.banner-mascota
    │   ├── span.emoji (especie)
    │   ├── div.info-mascota (nombre, especie, edad, sexo, propietario, motivo)
    │   └── button "Guardar borrador"
    ├── section.seccion-form  "Examen físico"
    │   ├── input peso, temperatura, frecuenciaCardiaca
    │   └── textarea observaciones
    ├── section.seccion-form  "Diagnóstico"
    │   ├── input diagnostico.principal
    │   ├── input diagnostico.secundario (opcional)
    │   └── textarea diagnostico.notasClinicas
    ├── section.seccion-form  "Tratamiento y medicamentos"
    │   ├── div.medicamento-item *ngFor
    │   │   ├── input nombre, dosis, via
    │   │   └── button "✕" eliminar
    │   └── button "Agregar medicamento"
    ├── section.seccion-form  "Vacunas y controles"
    │   ├── div.vacuna-item *ngFor
    │   │   ├── span nombre + estado badge
    │   │   └── checkbox aplicadaHoy
    │   └── input fecha próximo control
    └── div.form-actions
        └── button.btn-cerrar "Cerrar atención ✓"
```

---

## Diseño: Vista Historial Clínico

**Ruta:** `/veterinario/historial-clinico`
**Archivo:** `historial-clinico.component.ts`

### Estructura del componente

```typescript
@Component({
  selector: 'app-historial-clinico',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent],
  templateUrl: './historial-clinico.component.html',
  styleUrls: ['./historial-clinico.component.scss']
})
export class HistorialClinicoComponent implements OnInit {
  userRole = 'ROLE_VETERINARIO';
  userName = '';

  registros: RegistroMedico[] = [];
  registrosFiltrados: RegistroMedico[] = [];
  expandedIds = new Set<string>();

  searchText = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';
  filtroEspecie = '';
  especiesDisponibles: string[] = [];

  isLoading = false;
  errorMsg = '';

  ngOnInit(): void {
    // Cargar userName
    // Llamar cargarHistorial()
  }

  cargarHistorial(): void {
    // medicalRecordService.obtenerHistorial()
    // Poblar especiesDisponibles (unique)
    // Manejar error con errorMsg
  }

  aplicarFiltros(): void {
    // Filtrar por searchText (petName | ownerName)
    // Filtrar por rango de fechas
    // Filtrar por especie
  }

  toggleExpand(appointmentId: string): void {
    // expandedIds.has(id) ? delete : add
  }

  isExpanded(appointmentId: string): boolean {
    return this.expandedIds.has(appointmentId);
  }
}
```

### Layout HTML (estructura)

```
dashboard-layout
├── app-sidebar [userRole] [userName]
└── main.main-content
    ├── div.topbar (título)
    ├── div.filters-row
    │   ├── input[search]
    │   ├── input[date] fecha inicio
    │   ├── input[date] fecha fin
    │   └── select[especie]
    └── div.registros-list
        └── div.registro-item *ngFor
            ├── div.registro-header (click → toggleExpand)
            │   ├── span emoji especie
            │   ├── div.info-basica (petName, especie, ownerName, fecha, diagnóstico principal)
            │   └── span.chevron (▼ | ▲)
            └── div.registro-detalle *ngIf="isExpanded(r.appointmentId)"
                ├── section "Examen físico" (peso, temp, FC, observaciones)
                ├── section "Diagnóstico" (principal, secundario, notas)
                ├── section "Medicamentos" (lista)
                └── section "Vacunas" (lista con estado)
```

---

## Modificación del Sidebar

### Cambios en `app-sidebar.component.ts`

Se agrega una sección separada `clinicItems` para `ROLE_VETERINARIO` y se inyecta `MedicalRecordService`:

```typescript
// Nuevas propiedades
clinicItems: ClinicMenuItem[] = [];
atencionActiva: AtencionActiva | null = null;

// Nueva interfaz local
interface ClinicMenuItem {
  icon: string;
  label: string;
  route: string;
  disabled: boolean;
  showBadge?: boolean;
  badgeLabel?: string;
}

// En ngOnInit: suscribirse a medicalRecordService.atencionActiva$
// Al cambiar: actualizar clinicItems[1].disabled y badge

private buildClinicItems(): void {
  const hayAtencion = this.atencionActiva !== null;
  this.clinicItems = [
    { icon: '🩺', label: 'Atención médica',    route: '/veterinario/atencion-medica',    disabled: false },
    {
      icon: hayAtencion ? '📋' : '🔒',
      label: 'Formulario consulta',
      route: '/veterinario/formulario-consulta',
      disabled: !hayAtencion,
      showBadge: hayAtencion,
      badgeLabel: this.atencionActiva?.petName
    },
    { icon: '📂', label: 'Historial clínico',  route: '/veterinario/historial-clinico',  disabled: false },
  ];
}
```

### Cambios en `app-sidebar.component.html`

Agregar bloque condicional para la sección CLÍNICO debajo del menú principal:

```html
<!-- Sección CLÍNICO — solo ROLE_VETERINARIO -->
<div *ngIf="userRole === 'ROLE_VETERINARIO'" class="sidebar-section">
  <div class="section-label">CLÍNICO</div>
  <div *ngFor="let item of clinicItems"
       class="menu-item"
       [class.disabled]="item.disabled"
       [class.active]="isActive(item)"
       (click)="onClinicItemClick(item)">
    <span class="menu-icon">{{ item.icon }}</span>
    <span class="menu-label">{{ item.label }}</span>
    <span *ngIf="item.showBadge" class="active-badge">
      <span class="green-dot"></span>{{ item.badgeLabel }}
    </span>
  </div>
</div>
```

---

## Modificación de AppointmentService

Agregar método `completarCita` en `appointment.service.ts`:

```typescript
completarCita(appointmentId: string): Observable<void> {
  return this.http.put<void>(
    `${this.vetUrl}/${appointmentId}/complete`,
    {},
    { headers: this.headers() }
  );
}
```

---

## Nuevas Rutas en app.routes.ts

```typescript
{
  path: 'veterinario/atencion-medica',
  canActivate: [authGuard, desktopOnlyGuard, roleGuard],
  data: { roles: ['ROLE_VETERINARIO'] },
  loadComponent: () =>
    import('./pages/appointments/dashboard-vet/atencion-medica/atencion-medica.component')
      .then(m => m.AtencionMedicaComponent),
},
{
  path: 'veterinario/formulario-consulta',
  canActivate: [authGuard, desktopOnlyGuard, roleGuard],
  data: { roles: ['ROLE_VETERINARIO'] },
  loadComponent: () =>
    import('./pages/appointments/dashboard-vet/formulario-consulta/formulario-consulta.component')
      .then(m => m.FormularioConsultaComponent),
},
{
  path: 'veterinario/historial-clinico',
  canActivate: [authGuard, desktopOnlyGuard, roleGuard],
  data: { roles: ['ROLE_VETERINARIO'] },
  loadComponent: () =>
    import('./pages/appointments/dashboard-vet/historial-clinico/historial-clinico.component')
      .then(m => m.HistorialClinicoComponent),
},
```

---

## Persistencia en localStorage

| Clave | Contenido | Ciclo de vida |
|---|---|---|
| `atencion_activa` | `AtencionActiva` serializado | Creado en `iniciarAtencion()`, eliminado en `cerrarAtencion()` |
| `medical_draft_{appointmentId}` | `Partial<RegistroMedico>` | Creado/actualizado en `guardarBorrador()`, eliminado en `completarAtencion()` exitoso |

---

## Propiedades de Corrección

**Propiedad 1: Consistencia del estado activo**
Para cualquier `appointmentId` válido, si `iniciarAtencion()` es llamado y luego la aplicación se recarga, `atencionActiva$` debe emitir el mismo objeto `AtencionActiva` que fue persistido.
Valida: Requisito 5.8, 5.1, 5.2

**Propiedad 2: Idempotencia del cierre**
Llamar `cerrarAtencion()` cuando ya no hay atención activa no debe lanzar errores ni modificar el estado.
Valida: Requisito 5.3

**Propiedad 3: Aislamiento de borradores**
Para dos `appointmentId` distintos A y B, `guardarBorrador()` con A no debe afectar el borrador de B, y `obtenerBorrador(B)` debe retornar el valor previo de B sin cambios.
Valida: Requisito 5.4, 5.5

**Propiedad 4: Filtrado inclusivo**
Para cualquier texto de búsqueda `q`, el conjunto de citas filtradas es siempre un subconjunto de las citas originales, y si `q` está vacío el resultado es igual al conjunto completo.
Valida: Requisito 2.5, 4.5

**Propiedad 5: Visibilidad del formulario**
El componente `FormularioConsultaComponent` nunca debe renderizar el formulario cuando `atencionActiva` es `null`; siempre debe redirigir a `/veterinario/atencion-medica`.
Valida: Requisito 3.1
