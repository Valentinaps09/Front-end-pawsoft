# Documento de Requisitos

## Introducción

Este módulo extiende el panel veterinario de PawSoft con un flujo completo de atención médica. Cubre tres vistas nuevas dentro del panel del veterinario: gestión de atenciones activas, formulario de consulta clínica y visualización del historial clínico. El flujo sigue el ciclo de vida de una cita: `CONFIRMED → en proceso → COMPLETED`, y se integra con el sidebar existente mediante una nueva sección "CLÍNICO".

El proyecto usa Angular + Ionic con componentes standalone y TypeScript. Las nuevas vistas siguen la misma estructura visual y de colores del `dashboard-vet` existente.

---

## Glosario

- **Sistema**: La aplicación frontend PawSoft (Angular + Ionic).
- **Veterinario**: Usuario autenticado con rol `ROLE_VETERINARIO`.
- **Cita_Confirmada**: Cita con estado `CONFIRMED` recuperada desde el backend.
- **Atencion_Activa**: Estado en memoria (o `localStorage`) que indica que el veterinario inició la atención de una cita específica; incluye el `appointmentId` y los datos de la mascota.
- **Registro_Medico**: Objeto que agrupa los datos clínicos capturados durante una consulta: examen físico, diagnóstico, tratamiento y vacunas.
- **Medical_Record_Service**: Servicio Angular (`medical-record.service.ts`) responsable de gestionar el estado de la atención activa y las operaciones CRUD de registros médicos.
- **Sidebar**: Componente `app-sidebar` compartido que muestra la navegación lateral del panel.
- **Vista_Atencion**: Componente en `pages/appointments/dashboard-vet/atencion-medica/`.
- **Vista_Formulario**: Componente en `pages/appointments/dashboard-vet/formulario-consulta/`.
- **Vista_Historial**: Componente en `pages/appointments/dashboard-vet/historial-clinico/`.
- **Appointment_Service**: Servicio Angular existente (`appointment.service.ts`) que expone `getVetAppointments()` y la actualización de estado de citas.
- **Estado_Pendiente**: Cita `CONFIRMED` sin atención activa iniciada.
- **Estado_En_Proceso**: Cita `CONFIRMED` con atención activa iniciada por el veterinario.

---

## Requisitos

### Requisito 1: Sección "CLÍNICO" en el Sidebar

**User Story:** Como veterinario, quiero ver una sección "CLÍNICO" en el sidebar con accesos directos a las tres vistas clínicas, para navegar rápidamente entre ellas sin salir del panel.

#### Criterios de Aceptación

1. THE **Sidebar** SHALL mostrar una sección con etiqueta "CLÍNICO" exclusivamente cuando `userRole === 'ROLE_VETERINARIO'`.
2. THE **Sidebar** SHALL incluir tres ítems en la sección CLÍNICO: "Atención médica" (ruta `/veterinario/atencion-medica`), "Formulario consulta" (ruta `/veterinario/formulario-consulta`) y "Historial clínico" (ruta `/veterinario/historial-clinico`).
3. WHILE no existe una **Atencion_Activa**, THE **Sidebar** SHALL mostrar el ítem "Formulario consulta" con `disabled = true` y el ícono de candado 🔒.
4. WHEN el **Veterinario** inicia una atención, THE **Sidebar** SHALL cambiar el ítem "Formulario consulta" a `disabled = false`, mostrar un indicador verde (punto) y el nombre de la mascota en atención.
5. WHEN el **Veterinario** cierra una atención, THE **Sidebar** SHALL volver a mostrar el ítem "Formulario consulta" con `disabled = true` y sin indicador de mascota.
6. THE **Sidebar** SHALL mantener el ítem "Atención médica" e "Historial clínico" siempre habilitados (`disabled = false`) para el rol `ROLE_VETERINARIO`.

---

### Requisito 2: Vista de Atención Médica

**User Story:** Como veterinario, quiero ver la lista de citas confirmadas del día con su estado de atención, para saber cuáles están pendientes y cuáles ya están en proceso.

#### Criterios de Aceptación

1. WHEN el **Veterinario** navega a `/veterinario/atencion-medica`, THE **Vista_Atencion** SHALL cargar y mostrar únicamente las citas con estado `CONFIRMED` obtenidas desde **Appointment_Service**.
2. THE **Vista_Atencion** SHALL mostrar cada cita como una tarjeta con: nombre de la mascota, especie, nombre del propietario, número de cita, hora, motivo de consulta e indicador de estado.
3. THE **Vista_Atencion** SHALL mostrar el indicador de estado en color naranja con etiqueta "Pendiente" para citas `CONFIRMED` sin **Atencion_Activa**, y en color verde con etiqueta "En proceso" para la cita con **Atencion_Activa** activa.
4. THE **Vista_Atencion** SHALL mostrar el botón "Iniciar atención →" en tarjetas con estado "Pendiente" y el botón "Continuar →" en la tarjeta con estado "En proceso".
5. THE **Vista_Atencion** SHALL incluir un campo de búsqueda que filtre las tarjetas por nombre de mascota o nombre de propietario en tiempo real (al escribir cada carácter).
6. THE **Vista_Atencion** SHALL incluir un selector de filtro que permita mostrar todas las citas, solo las "Pendiente" o solo las "En proceso".
7. WHEN el **Veterinario** hace clic en "Iniciar atención →", THE **Medical_Record_Service** SHALL registrar la **Atencion_Activa** con el `appointmentId` y los datos de la mascota, y THE **Sistema** SHALL navegar a `/veterinario/formulario-consulta`.
8. WHEN el **Veterinario** hace clic en "Continuar →", THE **Sistema** SHALL navegar a `/veterinario/formulario-consulta` sin modificar la **Atencion_Activa** existente.
9. IF **Appointment_Service** retorna un error al cargar las citas, THEN THE **Vista_Atencion** SHALL mostrar un mensaje de error descriptivo y un botón para reintentar la carga.

---

### Requisito 3: Formulario de Consulta

**User Story:** Como veterinario, quiero registrar los datos clínicos de la consulta en un formulario estructurado, para documentar el examen físico, diagnóstico, tratamiento y vacunas de la mascota.

#### Criterios de Aceptación

1. WHEN el **Veterinario** navega a `/veterinario/formulario-consulta` sin **Atencion_Activa**, THE **Sistema** SHALL redirigir automáticamente a `/veterinario/atencion-medica`.
2. WHILE existe una **Atencion_Activa**, THE **Vista_Formulario** SHALL mostrar un banner superior con: avatar/emoji de la mascota, nombre, especie, edad, sexo, nombre del propietario y motivo de consulta.
3. THE **Vista_Formulario** SHALL organizar el formulario en cuatro secciones: "Examen físico", "Diagnóstico", "Tratamiento y medicamentos" y "Vacunas y controles".
4. THE **Vista_Formulario** SHALL incluir en la sección "Examen físico" los campos: peso (kg, numérico), temperatura (°C, numérico), frecuencia cardíaca (lpm, numérico) y observaciones generales (texto libre).
5. THE **Vista_Formulario** SHALL incluir en la sección "Diagnóstico" los campos: diagnóstico principal (texto), diagnóstico secundario (texto, opcional) y notas clínicas (texto libre, opcional).
6. THE **Vista_Formulario** SHALL incluir en la sección "Tratamiento y medicamentos" una lista dinámica donde cada ítem contiene: nombre del medicamento, dosis y vía de administración; con un botón "Agregar medicamento" para añadir nuevos ítems y un botón de eliminar por ítem.
7. THE **Vista_Formulario** SHALL incluir en la sección "Vacunas y controles" el esquema vacunal de la mascota con el estado de cada vacuna, checkboxes para marcar vacunas aplicadas en la consulta y un campo de fecha para el próximo control.
8. THE **Vista_Formulario** SHALL mostrar en la barra superior un botón "← Volver", el título de la vista y un indicador de estado de guardado automático.
9. WHEN el **Veterinario** modifica cualquier campo del formulario, THE **Medical_Record_Service** SHALL guardar el borrador en `localStorage` dentro de los 2 segundos siguientes al último cambio (debounce), y THE **Vista_Formulario** SHALL actualizar el indicador de guardado automático.
10. WHEN el **Veterinario** hace clic en "Guardar borrador", THE **Medical_Record_Service** SHALL persistir el **Registro_Medico** parcial en `localStorage` y THE **Vista_Formulario** SHALL mostrar confirmación visual de guardado.
11. WHEN el **Veterinario** hace clic en "Cerrar atención ✓", THE **Medical_Record_Service** SHALL enviar el **Registro_Medico** completo al backend, THE **Appointment_Service** SHALL actualizar el estado de la cita a `COMPLETED`, THE **Medical_Record_Service** SHALL eliminar la **Atencion_Activa**, y THE **Sistema** SHALL navegar a `/veterinario/atencion-medica`.
12. IF el backend retorna un error al cerrar la atención, THEN THE **Vista_Formulario** SHALL mostrar un mensaje de error descriptivo sin limpiar los datos del formulario ni la **Atencion_Activa**.

---

### Requisito 4: Historial Clínico

**User Story:** Como veterinario, quiero consultar el historial clínico de todas las mascotas atendidas, para revisar registros médicos anteriores de forma rápida y filtrada.

#### Criterios de Aceptación

1. WHEN el **Veterinario** navega a `/veterinario/historial-clinico`, THE **Vista_Historial** SHALL cargar y mostrar únicamente los **Registro_Medico** asociados a citas con estado `COMPLETED`.
2. THE **Vista_Historial** SHALL presentar los registros en una lista expandible donde cada ítem muestra en estado colapsado: nombre de la mascota, especie, nombre del propietario, fecha de la consulta y diagnóstico principal.
3. WHEN el **Veterinario** expande un ítem de la lista, THE **Vista_Historial** SHALL mostrar todos los campos del **Registro_Medico**: examen físico completo, diagnóstico (principal y secundario), lista de medicamentos y vacunas aplicadas.
4. THE **Vista_Historial** SHALL ser de solo lectura; THE **Sistema** SHALL no permitir editar ningún campo de los registros mostrados.
5. THE **Vista_Historial** SHALL incluir un campo de búsqueda que filtre los registros por nombre de mascota o nombre de propietario en tiempo real.
6. THE **Vista_Historial** SHALL incluir un filtro por rango de fechas (fecha inicio y fecha fin) que muestre solo los registros dentro del rango seleccionado.
7. THE **Vista_Historial** SHALL incluir un filtro por especie que muestre solo los registros de la especie seleccionada.
8. IF **Medical_Record_Service** retorna un error al cargar el historial, THEN THE **Vista_Historial** SHALL mostrar un mensaje de error descriptivo y un botón para reintentar la carga.

---

### Requisito 5: Servicio de Registros Médicos

**User Story:** Como desarrollador, quiero un servicio centralizado que gestione el estado de la atención activa y las operaciones de registros médicos, para mantener la lógica de negocio separada de los componentes de vista.

#### Criterios de Aceptación

1. THE **Medical_Record_Service** SHALL exponer un `BehaviorSubject<AtencionActiva | null>` observable llamado `atencionActiva$` que emita el estado actual de la atención en curso.
2. THE **Medical_Record_Service** SHALL exponer el método `iniciarAtencion(appointment: RecepAppointmentResponse): void` que persista la **Atencion_Activa** en `localStorage` y emita el nuevo valor en `atencionActiva$`.
3. THE **Medical_Record_Service** SHALL exponer el método `cerrarAtencion(): void` que elimine la **Atencion_Activa** de `localStorage` y emita `null` en `atencionActiva$`.
4. THE **Medical_Record_Service** SHALL exponer el método `guardarBorrador(registro: Partial<RegistroMedico>): void` que persista el borrador en `localStorage` bajo la clave `medical_draft_{appointmentId}`.
5. THE **Medical_Record_Service** SHALL exponer el método `obtenerBorrador(appointmentId: string): Partial<RegistroMedico> | null` que recupere el borrador desde `localStorage`.
6. THE **Medical_Record_Service** SHALL exponer el método `completarAtencion(registro: RegistroMedico): Observable<any>` que envíe el registro al endpoint `POST /api/vet/medical-records` y, al completarse con éxito, elimine el borrador de `localStorage`.
7. THE **Medical_Record_Service** SHALL exponer el método `obtenerHistorial(): Observable<RegistroMedico[]>` que consulte el endpoint `GET /api/vet/medical-records` y retorne la lista de registros completados.
8. WHEN la aplicación se inicializa, THE **Medical_Record_Service** SHALL restaurar la **Atencion_Activa** desde `localStorage` si existe, para mantener el estado entre recargas de página.

---

### Requisito 6: Enrutamiento de las Vistas Clínicas

**User Story:** Como desarrollador, quiero que las tres vistas clínicas estén registradas en el router de Angular con los guards apropiados, para garantizar que solo el veterinario autenticado pueda acceder a ellas.

#### Criterios de Aceptación

1. THE **Sistema** SHALL registrar la ruta `/veterinario/atencion-medica` con los guards `authGuard`, `desktopOnlyGuard` y `roleGuard` con `data: { roles: ['ROLE_VETERINARIO'] }`.
2. THE **Sistema** SHALL registrar la ruta `/veterinario/formulario-consulta` con los guards `authGuard`, `desktopOnlyGuard` y `roleGuard` con `data: { roles: ['ROLE_VETERINARIO'] }`.
3. THE **Sistema** SHALL registrar la ruta `/veterinario/historial-clinico` con los guards `authGuard`, `desktopOnlyGuard` y `roleGuard` con `data: { roles: ['ROLE_VETERINARIO'] }`.
4. THE **Sistema** SHALL usar `loadComponent` con importación dinámica para cada una de las tres rutas, siguiendo el patrón de lazy loading existente en `app.routes.ts`.
