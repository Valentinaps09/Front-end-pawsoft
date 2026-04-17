import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { desktopOnlyGuard } from './guards/device.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },

  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/auth/register/register.page').then(m => m.RegisterPage),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/auth/forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/auth/reset-password/reset-password.page').then(m => m.ResetPasswordPage),
  },
  {
    path: 'auth/verify-email',
    loadComponent: () =>
      import('./pages/auth/verify-email/verify-email.page').then(m => m.VerifyEmailPage),
  },

  {
    path: 'change-password-first',
    loadComponent: () =>
      import('./pages/auth/change-password-first/change-password-first.page')
        .then(m => m.ChangePasswordFirstPage),
  },

  // ── Página de bloqueo móvil (sin guards, debe ser siempre accesible) ───────
  {
    path: 'solo-escritorio',
    loadComponent: () =>
      import('./pages/solo-escritorio/solo-escritorio.component')
        .then(m => m.SoloEscritorioComponent),
  },

  // ── Cliente (authGuard + roleGuard — mobile-first) ────────────────────────
  {
    path: 'dashboard-cliente',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_CLIENTE'] },
    loadComponent: () =>
      import('./pages/appointments/dashboard-cliente/dashboard-cliente.component')
        .then(m => m.DashboardClienteComponent),
  },

  {
    path: 'perfil-cliente',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_CLIENTE'] },
    loadComponent: () =>
      import('./pages/perfil-cliente/perfil-cliente.component')
        .then(m => m.PerfilClienteComponent),
  },

  {
    path: 'pet',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_CLIENTE'] },
    loadComponent: () =>
      import('./pages/pet/pet.component').then(m => m.PetComponent),
  },

  {
    path: 'contacto',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_CLIENTE'] },
    loadComponent: () =>
      import('./pages/contacto/contacto.component').then(m => m.ContactoComponent),
  },

  {
    path: 'mis-citas',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_CLIENTE'] },
    loadComponent: () =>
      import('./pages/mis-citas/mis-citas.component').then(m => m.MisCitasComponent),
  },

  {
    path: 'mis-pagos',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_CLIENTE'] },
    loadComponent: () =>
      import('./pages/mis-pagos/mis-pagos.component').then(m => m.MisPagosComponent),
  },

  // ── Roles desktop-only (authGuard + desktopOnlyGuard + roleGuard) ─────────
  {
    path: 'dashboard-admin',
    canActivate: [authGuard, desktopOnlyGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] },
    loadComponent: () =>
      import('./pages/appointments/dashboard-admin/dashboard-admin.component')
        .then(m => m.DashboardAdminComponent),
  },

  {
    path: 'dashboard-admin/servicios',
    canActivate: [authGuard, desktopOnlyGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] },
    loadComponent: () =>
      import('./pages/dashboard-admin-servicios/dashboard-admin-servicios.component')
        .then(m => m.DashboardAdminServiciosComponent),
  },

  {
    path: 'dashboard-admin/pagos',
    canActivate: [authGuard, desktopOnlyGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] },
    loadComponent: () =>
      import('./pages/admin-payments/admin-payments.component')
        .then(m => m.AdminPaymentsComponent),
  },

  {
    path: 'dashboard-admin/auditoria',
    canActivate: [authGuard, desktopOnlyGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] },
    loadComponent: () =>
      import('./pages/admin-audit/admin-audit.component')
        .then(m => m.AdminAuditComponent),
  },

  {
    path: 'dashboard-admin/hospitalizaciones',
    canActivate: [authGuard, desktopOnlyGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] },
    loadComponent: () =>
      import('./pages/admin-hospitalizaciones/admin-hospitalizaciones.component')
        .then(m => m.AdminHospitalizacionesComponent),
  },

  {
    path: 'dashboard-vet',
    canActivate: [authGuard, desktopOnlyGuard, roleGuard],
    data: { roles: ['ROLE_VETERINARIO'] },
    loadComponent: () =>
      import('./pages/appointments/dashboard-vet/dashboard-vet.component')
        .then(m => m.DashboardVetComponent),
  },

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

  {
    path: 'veterinario/hospitalizaciones',
    canActivate: [authGuard, desktopOnlyGuard, roleGuard],
    data: { roles: ['ROLE_VETERINARIO'] },
    loadComponent: () =>
      import('./pages/appointments/dashboard-vet/hospitalizaciones/hospitalizaciones.component')
        .then(m => m.HospitalizacionesComponent),
  },

  {
    path: 'dashboard-rec',
    canActivate: [authGuard, desktopOnlyGuard, roleGuard],
    data: { roles: ['ROLE_RECEPCIONISTA'] },
    loadComponent: () =>
      import('./pages/appointments/dashboard-rec/dashboard-rec.component')
        .then(m => m.DashboardRecComponent),
  },

  // ── Fallback ──────────────────────────────────────────────────────────────
  {
    path: '**',
    redirectTo: 'login',
  },
];
