import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth';
import { MedicalRecordService, AtencionActiva } from '../../../services/medical-record.service';

interface MenuItem {
  icon: string;
  label: string;
  route?: string;
  tab?: string;
  disabled?: boolean;
  badge?: number | string;
  subLabel?: string;
  activeDot?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app-sidebar.component.html',
  styleUrls: ['./app-sidebar.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AppSidebarComponent implements OnInit, OnChanges, OnDestroy {
  @Input() userRole: string = 'ROLE_CLIENTE';
  @Input() userName: string = '';
  @Input() activeTab: string = '';
  @Output() tabChange = new EventEmitter<string>();

  menuItems: MenuItem[] = [];
  clinicItems: MenuItem[] = [];
  userInitials: string = '';
  currentUrl: string = '';

  private atencionSub?: Subscription;

  constructor(
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly authService: AuthService,
    private readonly medicalRecordService: MedicalRecordService,
  ) {}

  ngOnInit(): void {
    this.currentUrl = this.router.url.split('?')[0];
    this.refrescarDesdStorage();

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentUrl = event.urlAfterRedirects.split('?')[0];
      this.cdr.detectChanges();
    });

    // Suscribirse al estado de atención activa para actualizar sección CLÍNICO
    this.atencionSub = this.medicalRecordService.atencionActiva$.subscribe(activa => {
      this.buildClinicItems(activa);
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.atencionSub?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userRole'] || changes['userName']) {
      const storageRole  = localStorage.getItem('rol');
      const storageEmail = localStorage.getItem('email');

      this.userRole  = storageRole  || this.userRole  || 'ROLE_CLIENTE';
      this.userName  = storageEmail || this.userName  || '';

      this.userInitials = this.calcularIniciales(this.userName);
      this.loadMenuByRole();
    }
  }

  private refrescarDesdStorage(): void {
    const storageRole  = localStorage.getItem('rol');
    const storageEmail = localStorage.getItem('email');

    if (storageRole)  this.userRole = storageRole;
    if (storageEmail) this.userName = storageEmail;

    this.userInitials = this.calcularIniciales(this.userName);
    this.loadMenuByRole();
  }

  private calcularIniciales(userName: string): string {
    if (!userName) return '??';
    if (userName.includes('@')) {
      return userName.split('@')[0].substring(0, 2).toUpperCase();
    }
    return userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  private loadMenuByRole(): void {
    switch (this.userRole) {
      case 'ROLE_CLIENTE':
        this.menuItems = [
          { icon: '📅', label: 'Mis Citas',         route: '/dashboard-cliente' },
          { icon: '🐾', label: 'Mis Mascotas',       route: '/pet' },
          { icon: '📞', label: 'Contacto',           route: '/contacto' },
          { icon: '👤', label: 'Mi Perfil',          route: '/perfil-cliente' },
        ];
        break;

      case 'ROLE_VETERINARIO':
        this.menuItems = [
          { icon: '🏠', label: 'Dashboard', route: '/dashboard-vet' },
        ];
        break;

      case 'ROLE_RECEPCIONISTA':
        this.menuItems = [
          { icon: '🏠', label: 'Inicio',          route: '/dashboard-rec', tab: 'inicio' },
        ];
        break;

      case 'ROLE_ADMIN':
        this.menuItems = [
          { icon: '🏠', label: 'Dashboard',  route: '/dashboard-admin' },
          { icon: '🩺', label: 'Servicios',  route: '/dashboard-admin/servicios' },
          { icon: '💰', label: 'Pagos',      route: 'dashboard-admin/pagos' },
        ];
        break;

      default:
        this.menuItems = [];
    }
  }

  private buildClinicItems(activa: AtencionActiva | null): void {
    if (this.userRole !== 'ROLE_VETERINARIO') {
      this.clinicItems = [];
      return;
    }
    this.clinicItems = [
      {
        icon: '🩺',
        label: 'Atención médica',
        route: '/veterinario/atencion-medica',
        disabled: false,
      },
      {
        icon: '📋',
        label: 'Formulario consulta',
        route: '/veterinario/formulario-consulta',
        disabled: !activa,
        activeDot: !!activa,
        subLabel: activa ? activa.petName : undefined,
      },
      {
        icon: '📁',
        label: 'Historial clínico',
        route: '/veterinario/historial-clinico',
        disabled: false,
      },
    ];
  }

  onClinicItemClick(item: MenuItem): void {
    if (item.disabled) return;
    if (item.route) {
      this.currentUrl = item.route;
      this.cdr.detectChanges();
      this.router.navigate([item.route]);
    }
  }

  onItemClick(item: MenuItem): void {
    if (item.disabled) return;

    if (item.tab) {
      this.tabChange.emit(item.tab);
      this.currentUrl = item.route ?? '';
      this.router.navigate([item.route!]);
    } else if (item.route) {
      this.currentUrl = item.route;
      this.cdr.detectChanges();
      this.router.navigate([item.route]);
    }
  }

  isActive(item: MenuItem): boolean {
    if (item.tab) {
      return this.activeTab === item.tab;
    }
    return this.currentUrl === (item.route ?? '___');
  }

  getRoleLabel(): string {
    const labels: { [key: string]: string } = {
      'ROLE_CLIENTE':       'Cliente',
      'ROLE_VETERINARIO':   'Veterinario',
      'ROLE_RECEPCIONISTA': 'Recepcionista',
      'ROLE_ADMIN':         'Administrador'
    };
    return labels[this.userRole] || 'Usuario';
  }

  logout(): void {
    this.authService.logout();
  }
}
