import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

/**
 * InactivityService — Pawsoft
 *
 * Detecta inactividad real del usuario (mouse, teclado, scroll, touch)
 * y ejecuta logout automático tras X minutos sin actividad.
 *
 * ── Integración con el guard ─────────────────────────────────────────────────
 * Este servicio NO duplica la lógica del authGuard.
 * Solo limpia el token y navega a /login — el guard ya protege el resto.
 *
 * ── Uso ──────────────────────────────────────────────────────────────────────
 * 1. Inyectar en AppComponent (o en el layout protegido) y llamar:
 *      this.inactivityService.startWatching();
 * 2. Al hacer logout manual, llamar:
 *      this.inactivityService.stopWatching();
 *
 * ── Eventos que resetean el timer ────────────────────────────────────────────
 *   mousemove · mousedown · keydown · touchstart · touchmove · scroll · wheel
 *
 * Proyecto: Pawsoft — Universidad del Quindío — Software III
 * Autoras: Valentina Porras Salazar · Helen Xiomara Giraldo Libreros
 */
@Injectable({ providedIn: 'root' })
export class InactivityService implements OnDestroy {

  /** Minutos de inactividad antes de hacer logout automático */
  private readonly TIMEOUT_MINUTES = 3;

  private readonly TIMEOUT_MS = this.TIMEOUT_MINUTES * 60 * 1000;

  /** Eventos del DOM que se consideran "actividad del usuario" */
  private readonly ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
    'mousemove',
    'mousedown',
    'keydown',
    'touchstart',
    'touchmove',
    'scroll',
    'wheel',
  ];

  private timeoutRef: ReturnType<typeof setTimeout> | null = null;
  private boundReset!: () => void;
  private isWatching = false;

  constructor(
    private readonly router: Router,
    private readonly ngZone: NgZone,
  ) {}

  ngOnDestroy(): void {
    this.stopWatching();
  }

  // ── API pública ───────────────────────────────────────────────────────────

  /**
   * Inicia la escucha de eventos de actividad y el timer de inactividad.
   * Llamar cuando el usuario inicia sesión correctamente.
   *
   * Es idempotente: si ya está corriendo, no registra listeners duplicados.
   */
  startWatching(): void {
    if (this.isWatching) return;
    this.isWatching = true;

    // Crea la referencia bound una sola vez para poder removerla después
    this.boundReset = this.resetTimer.bind(this);

    // Registra fuera de la zona de Angular para no triggear detección de
    // cambios en cada evento del mouse/teclado (optimización de rendimiento)
    this.ngZone.runOutsideAngular(() => {
      this.ACTIVITY_EVENTS.forEach(event =>
        window.addEventListener(event, this.boundReset, { passive: true })
      );
    });

    this.resetTimer();
  }

  /**
   * Detiene el timer y remueve todos los listeners.
   * Llamar al hacer logout manual para evitar memory leaks.
   */
  stopWatching(): void {
    if (!this.isWatching) return;
    this.isWatching = false;

    this.clearTimer();

    if (this.boundReset) {
      this.ACTIVITY_EVENTS.forEach(event =>
        window.removeEventListener(event, this.boundReset)
      );
    }
  }

  // ── Lógica interna ────────────────────────────────────────────────────────

  /**
   * Reinicia el timer cada vez que se detecta actividad del usuario.
   * Corre fuera de la zona Angular — NO trigger detección de cambios.
   */
  private resetTimer(): void {
    this.clearTimer();

    this.timeoutRef = setTimeout(() => {
      // Vuelve a la zona Angular para que la navegación funcione correctamente
      this.ngZone.run(() => this.onTimeout());
    }, this.TIMEOUT_MS);
  }

  /**
   * Se ejecuta cuando el timer expira (inactividad real).
   * Limpia la sesión y delega la redirección al router.
   * El authGuard protegerá automáticamente cualquier ruta posterior.
   */
  private onTimeout(): void {
    this.stopWatching();
    localStorage.removeItem('token');

    // replaceUrl: true evita que el botón "atrás" regrese a una ruta protegida
    this.router.navigate(['/login'], {
      replaceUrl: true,
      state: { reason: 'inactivity' }, // opcional: para mostrar aviso en el login
    });
  }

  private clearTimer(): void {
    if (this.timeoutRef !== null) {
      clearTimeout(this.timeoutRef);
      this.timeoutRef = null;
    }
  }
}
