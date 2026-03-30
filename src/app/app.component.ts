import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { InactivityService } from './services/inactivity.service';
import { AccessibilityWidgetComponent } from './share/components/accessibility-widget/accessibility-widget.component';
import { ChatbotFabComponent } from './component/chatbot-fab/chatbot-fab.component';

/**
 * Componente raíz de la aplicación Pawsoft.
 *
 * Responsabilidades:
 * - Renderiza el router outlet de Ionic.
 * - Inicia/detiene el watcher de inactividad según la ruta actual.
 * - Intercepta el botón "atrás" del navegador para bloquear el acceso
 *   a rutas protegidas cuando no hay sesión activa.
 *
 * Proyecto: Pawsoft — Universidad del Quindío — Software III
 * Autoras: Valentina Porras Salazar · Helen Xiomara Giraldo Libreros
 */
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, AccessibilityWidgetComponent, ChatbotFabComponent],
})
export class AppComponent implements OnInit, OnDestroy {

  private readonly PUBLIC_ROUTES = [
    '/login',
    '/register',
    '/forgot-password',
    '/change-password-first',
    '/verify-email',
    '/auth',
  ];

  private routerSub!: Subscription;

  /**
   * Intercepta el botón "atrás" del navegador.
   * Si no hay token y la URL destino es una ruta protegida,
   * cancela la navegación y empuja /login de nuevo.
   * Se guarda como arrow function para poder removerla en ngOnDestroy.
   */
  private readonly onPopState = (): void => {
    const tieneToken = !!localStorage.getItem('token');
    const urlActual  = window.location.pathname;
    const esPublica  = this.PUBLIC_ROUTES.some(r => urlActual.startsWith(r));

    if (!tieneToken && !esPublica) {
      // Cancela la navegación hacia atrás y vuelve a /login
      window.history.pushState(null, '', '/login');
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  };

  constructor(
    private readonly inactivityService: InactivityService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    // Escucha el botón "atrás" en toda la app
    window.addEventListener('popstate', this.onPopState);

    // Empuja una entrada inicial para que el primer "atrás" sea interceptable
    window.history.pushState(null, '', window.location.href);

    // Evalúa la ruta actual al inicializar (cubre recarga de página)
    this.evaluarRuta(this.router.url);

    // Escucha navegaciones futuras
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.evaluarRuta(e.urlAfterRedirects);
      });
  }

  ngOnDestroy(): void {
    window.removeEventListener('popstate', this.onPopState);
    this.routerSub?.unsubscribe();
    this.inactivityService.stopWatching();
  }

  private evaluarRuta(url: string): void {
    const isPublic = this.PUBLIC_ROUTES.some(r => url.startsWith(r));

    if (isPublic) {
      this.inactivityService.stopWatching();
    } else {
      const hayToken = !!localStorage.getItem('token');
      if (hayToken) {
        this.inactivityService.startWatching();
      }
    }
  }
}
