# Plan de Implementación: Historial Clínico y Atención Médica

## Visión General

Implementación incremental del módulo clínico veterinario en Angular + Ionic (TypeScript, standalone components). Cada tarea construye sobre la anterior y termina con la integración completa del flujo `CONFIRMED → en proceso → COMPLETED`.

## Tareas

- [ ] 1. Crear interfaces TypeScript y MedicalRecordService
  - [ ] 1.1 Definir y exportar todas las interfaces en `medical-record.service.ts`
    - Crear `src/app/services/medical-record.service.ts`
    - Exportar: `AtencionActiva`, `ExamenFisico`, `Diagnostico`, `Medicamento`, `VacunaControl`, `ProximoControl`, `RegistroMedico`
    - _Requisitos: 5.1_

  - [ ] 1.2 Implementar el BehaviorSubject y restauración desde localStorage
    - Inicializar `BehaviorSubject<AtencionActiva | null>` con valor desde `localStorage` si existe
    - Exponer `atencionActiva$` como observable público
    - _Requisitos: 5.1, 5.8_

  - [ ]* 1.3 Escribir property test: Consistencia del estado activo (Propiedad 1)
    - **Propiedad 1: Consistencia del estado activo**
    - **Valida: Requisitos 5.8, 5.1, 5.2**
    - Simular `iniciarAtencion()` + recarga (re-instanciar servicio con localStorage poblado) y verificar que `atencionActiva$` emite el mismo objeto

  - [ ] 1.4 Implementar `iniciarAtencion()`, `cerrarAtencion()`, `guardarBorrador()`, `obtenerBorrador()`
    - `iniciarAtencion(appointment: RecepAppointmentResponse)`: mapear a `AtencionActiva`, persistir en `localStorage`, emitir en subject
    - `cerrarAtencion()`: eliminar de `localStorage`, emitir `null`
    - `guardarBorrador(registro)`: persistir bajo clave `medical_draft_{appointmentId}`
    - `obtenerBorrador(appointmentId)`: recuperar desde `localStorage`, retornar `null` si no existe
    - _Requisitos: 5.2, 5.3, 5.4, 5.5_

  - [ ]* 1.5 Escribir property test: Idempotencia del cierre (Propiedad 2)
    - **Propiedad 2: Idempotencia del cierre**
    - **Valida: Requisito 5.3**

  - [ ]* 1.6 Escribir property test: Aislamiento de borradores (Propiedad 3)
    - **Propiedad 3: Aislamiento de borradores**
    - **Valida: Requisitos 5.4, 5.5**

  - [ ] 1.7 Implementar `completarAtencion()` y `obtenerHistorial()`
    - `completarAtencion(registro)`: `POST /api/vet/medical-records`, al éxito eliminar borrador de `localStorage`
    - `obtenerHistorial()`: `GET /api/vet/medical-records`
    - _Requisitos: 5.6, 5.7_

- [ ] 2. Agregar `completarCita()` en AppointmentService y nuevas rutas
  - [ ] 2.1 Agregar método `completarCita(appointmentId: string): Observable<void>` en `appointment.service.ts`
    - `PUT /api/vet/appointments/{id}/complete`
    - _Requisitos: 3.11_

  - [ ] 2.2 Registrar las tres rutas nuevas en `app.routes.ts`
    - `/veterinario/atencion-medica` con `authGuard`, `desktopOnlyGuard`, `roleGuard(['ROLE_VETERINARIO'])`
    - `/veterinario/formulario-consulta` con los mismos guards
    - `/veterinario/historial-clinico` con los mismos guards
    - Usar `loadComponent` con importación dinámica para cada ruta
    - _Requisitos: 6.1, 6.2, 6.3, 6.4_

- [ ] 3. Checkpoint — Verificar servicio y rutas
  - Asegurar que todos los tests pasen, consultar al usuario si surgen dudas.

- [ ] 4. Implementar Vista Atención Médica
  - [ ] 4.1 Crear `atencion-medica.component.ts` con lógica del componente
    - Crear directorio `src/app/pages/appointments/dashboard-vet/atencion-medica/`
    - Standalone component con imports: `CommonModule`, `FormsModule`, `AppSidebarComponent`
    - Cargar `userName` y `userRole` desde `localStorage`
    - Suscribirse a `medicalRecordService.atencionActiva$`
    - Llamar `appointmentService.getVetAppointments()` y filtrar solo `status === 'CONFIRMED'`
    - Implementar `aplicarFiltros()` por texto y por estado (todas/pendiente/en_proceso)
    - Implementar `iniciarAtencion()` y `continuarAtencion()`
    - Manejar error con `errorMsg` y botón de reintento
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [ ] 4.2 Crear `atencion-medica.component.html`
    - Layout `dashboard-layout` con `app-sidebar`
    - Topbar con título y fecha
    - Fila de filtros: input búsqueda + select estado
    - Grid de tarjetas con: emoji especie, nombre mascota, especie, propietario, número cita, hora, motivo
    - Badge de estado: naranja "Pendiente" / verde "En proceso"
    - Botón "Iniciar atención →" o "Continuar →" según estado
    - Mensaje de error con botón reintentar
    - _Requisitos: 2.2, 2.3, 2.4, 2.9_

  - [ ] 4.3 Crear `atencion-medica.component.scss`
    - Reutilizar variables de color del `dashboard-vet` existente
    - Estilos para `.cita-card`, `.estado-badge` (naranja/verde), `.btn-iniciar`, `.btn-continuar`
    - _Requisitos: 2.3_

  - [ ]* 4.4 Escribir property test: Filtrado inclusivo (Propiedad 4)
    - **Propiedad 4: Filtrado inclusivo**
    - **Valida: Requisitos 2.5, 4.5**
    - Para cualquier `searchText`, el resultado filtrado es subconjunto del original; con texto vacío el resultado es igual al original

- [ ] 5. Implementar Vista Formulario de Consulta
  - [ ] 5.1 Crear `formulario-consulta.component.ts` con lógica del componente
    - Crear directorio `src/app/pages/appointments/dashboard-vet/formulario-consulta/`
    - Standalone component con imports: `CommonModule`, `FormsModule`, `AppSidebarComponent`
    - En `ngOnInit`: suscribirse a `atencionActiva$`; si `null` → redirigir a `/veterinario/atencion-medica`
    - Si existe atención: cargar borrador con `obtenerBorrador(appointmentId)`
    - Implementar debounce de 2 segundos en `onFormChange()` → `guardarBorrador()`
    - Implementar `agregarMedicamento()` y `eliminarMedicamento(index)`
    - Implementar `cerrarAtencion()`: llamar `completarAtencion()` + `completarCita()` + `cerrarAtencion()` + navegar
    - En error: mostrar `errorMsg` sin limpiar datos ni `atencionActiva`
    - Limpiar timer en `ngOnDestroy()`
    - _Requisitos: 3.1, 3.2, 3.6, 3.9, 3.10, 3.11, 3.12_

  - [ ] 5.2 Crear `formulario-consulta.component.html`
    - Topbar: botón "← Volver", título, indicador de estado guardado (`sin_cambios` | `guardando...` | `✓ Guardado`)
    - Banner mascota: emoji, nombre, especie, edad, sexo, propietario, motivo, botón "Guardar borrador"
    - Sección "Examen físico": inputs peso, temperatura, frecuencia cardíaca + textarea observaciones
    - Sección "Diagnóstico": inputs principal, secundario + textarea notas clínicas
    - Sección "Tratamiento y medicamentos": lista dinámica con inputs nombre/dosis/vía + botón eliminar + botón "Agregar medicamento"
    - Sección "Vacunas y controles": lista con estado badge + checkbox `aplicadaHoy` + input fecha próximo control
    - Botón "Cerrar atención ✓" con estado `isSubmitting`
    - _Requisitos: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ] 5.3 Crear `formulario-consulta.component.scss`
    - Estilos para `.banner-mascota`, `.seccion-form`, `.medicamento-item`, `.vacuna-item`
    - Estilos para `.estado-guardado` (colores según estado)
    - _Requisitos: 3.8_

  - [ ]* 5.4 Escribir property test: Visibilidad del formulario (Propiedad 5)
    - **Propiedad 5: Visibilidad del formulario**
    - **Valida: Requisito 3.1**
    - Verificar que con `atencionActiva === null` siempre se redirige y nunca se renderiza el formulario

- [ ] 6. Checkpoint — Verificar flujo atención médica → formulario
  - Asegurar que todos los tests pasen, consultar al usuario si surgen dudas.

- [ ] 7. Implementar Vista Historial Clínico
  - [ ] 7.1 Crear `historial-clinico.component.ts` con lógica del componente
    - Crear directorio `src/app/pages/appointments/dashboard-vet/historial-clinico/`
    - Standalone component con imports: `CommonModule`, `FormsModule`, `AppSidebarComponent`
    - Llamar `medicalRecordService.obtenerHistorial()` en `ngOnInit`
    - Poblar `especiesDisponibles` con valores únicos de los registros
    - Implementar `aplicarFiltros()`: por texto, rango de fechas y especie
    - Implementar `toggleExpand(appointmentId)` con `Set<string>`
    - Manejar error con `errorMsg` y botón de reintento
    - _Requisitos: 4.1, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ] 7.2 Crear `historial-clinico.component.html`
    - Topbar con título
    - Fila de filtros: input búsqueda, input fecha inicio, input fecha fin, select especie
    - Lista de registros expandibles: header colapsado (emoji, nombre, especie, propietario, fecha, diagnóstico principal) + chevron
    - Detalle expandido (solo lectura): examen físico, diagnóstico completo, medicamentos, vacunas
    - Mensaje de error con botón reintentar
    - _Requisitos: 4.2, 4.3, 4.4_

  - [ ] 7.3 Crear `historial-clinico.component.scss`
    - Estilos para `.registro-item`, `.registro-header`, `.registro-detalle`
    - Animación de expansión/colapso
    - _Requisitos: 4.2_

- [ ] 8. Modificar Sidebar para sección CLÍNICO
  - [ ] 8.1 Actualizar `app-sidebar.component.ts`
    - Inyectar `MedicalRecordService`
    - Agregar interfaz `ClinicMenuItem` y propiedad `clinicItems`
    - Suscribirse a `atencionActiva$` en `ngOnInit`
    - Implementar `buildClinicItems()`: ítem "Formulario consulta" con `disabled = !hayAtencion`, badge verde con nombre mascota cuando hay atención activa
    - Implementar `onClinicItemClick(item)`: respetar `disabled`
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ] 8.2 Actualizar `app-sidebar.component.html`
    - Agregar bloque `*ngIf="userRole === 'ROLE_VETERINARIO'"` con sección "CLÍNICO"
    - Renderizar `clinicItems` con ícono 🔒 cuando `disabled`, punto verde y nombre mascota cuando hay atención activa
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ] 8.3 Actualizar `app-sidebar.component.scss`
    - Estilos para `.sidebar-section`, `.section-label`, `.active-badge`, `.green-dot`
    - Estilo visual para ítem deshabilitado (opacidad reducida, cursor not-allowed)
    - _Requisitos: 1.3, 1.4_

- [ ] 9. Checkpoint final — Integración completa
  - Asegurar que todos los tests pasen y el flujo completo funcione: sidebar → atención médica → formulario → cerrar atención → historial.
  - Consultar al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los checkpoints validan el progreso incremental
- Los property tests validan propiedades universales del servicio y los filtros

## Endpoints pendientes de implementar en el backend

Los siguientes endpoints no existen aún en el backend y deben
crearse antes de conectar el frontend. Kiro puede usar como
referencia los métodos confirmAppointment() y markNoShow() que
ya existen en AppointmentService.java — siguen el mismo patrón.

1. PUT /api/vet/appointments/{id}/complete
   → Cambia el status de la cita a COMPLETED
   → Referencia: mismo patrón que confirmAppointment() y markNoShow()
   → Consumido en: tarea 2.1 (completarCita en appointment.service.ts)

2. POST /api/vet/medical-records
   → Recibe y persiste el RegistroMedico completo
   → Consumido en: tarea 1.7 (completarAtencion en medical-record.service.ts)

3. GET /api/vet/medical-records
   → Retorna los registros médicos del vet autenticado
   → Solo registros asociados a citas con status COMPLETED
   → Consumido en: tarea 1.7 (obtenerHistorial en medical-record.service.ts)