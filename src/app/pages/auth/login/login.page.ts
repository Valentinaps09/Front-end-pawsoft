import { CommonModule, Location } from '@angular/common';
import { Component, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationStart, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eyeOutline, eyeOffOutline, refreshOutline, mailOutline } from 'ionicons/icons';

import { AuthService, LoginResponse } from '../../../services/auth';
import { OtpModalComponent } from '../../../component/otp-modal/otp-modal.component';

declare const grecaptcha: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner,
    OtpModalComponent,
  ],
})
export class LoginPage implements OnInit, OnDestroy {

  private authService = inject(AuthService);
  private router      = inject(Router);
  private ngZone      = inject(NgZone);
  private location    = inject(Location);

  // ── Estado del formulario ──────────────────────────────────────
  email    = '';
  password = '';
  errorMsg = '';
  cargando = false;

  // ── Estado del modal OTP ───────────────────────────────────────
  mostrarOtp    = false;
  correoUsuario = '';
  mostrarPass   = false;

  // ── reCAPTCHA ──────────────────────────────────────────────────
  siteKey        = '6Lc8A4EsAAAAALRBXHH98TRFskX6urHK28txP555';
  recaptchaToken = '';

  // ── Sesión expirada ────────────────────────────────────────────
  sessionExpiredMsg = '';

  // ── Reenvío verificación de cuenta ────────────────────────────
  /** Se llena cuando el backend responde "debes verificar tu correo" */
  correoSinVerificar  = '';
  reenviandoVerif     = false;
  mensajeReenvioVerif = '';

  @ViewChild(OtpModalComponent) otpModal!: OtpModalComponent;

  private subscriptions: Subscription[] = [];

  private onPopState = (): void => {
    window.history.pushState(null, '', '/login');
  };

  constructor() {
    addIcons({ eyeOutline, eyeOffOutline, refreshOutline, mailOutline });
  }

  // ── Ciclo de vida ──────────────────────────────────────────────

  ngOnInit(): void {
    this.mostrarPass    = false;
    this.errorMsg       = '';
    this.recaptchaToken = '';
    this.renderRecaptcha();

    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state?.['reason'] === 'inactivity') {
      this.sessionExpiredMsg = 'Tu sesión expiró por inactividad. Por favor, inicia sesión de nuevo.';
    } else {
      this.sessionExpiredMsg = '';
    }

    window.history.pushState(null, '', '/login');
    window.addEventListener('popstate', this.onPopState);

    const navSub = this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe(() => {
      this.email              = '';
      this.password           = '';
      this.errorMsg           = '';
      this.mostrarPass        = false;
      this.correoSinVerificar = '';
      this.mensajeReenvioVerif = '';
    });

    this.subscriptions.push(navSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    window.removeEventListener('popstate', this.onPopState);
  }

  // ── reCAPTCHA ──────────────────────────────────────────────────

  private renderRecaptcha(): void {
    let attempts = 0;
    const maxAttempts = 50;

    const interval = setInterval(() => {
      attempts++;

      if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
        clearInterval(interval);

        try {
          grecaptcha.render('recaptcha-container', {
            sitekey: this.siteKey,
            callback: (token: string) => {
              this.ngZone.run(() => { this.recaptchaToken = token; });
            },
            'expired-callback': () => {
              this.ngZone.run(() => { this.recaptchaToken = ''; });
            },
            'error-callback': () => {
              this.ngZone.run(() => {
                this.recaptchaToken = '';
                this.errorMsg = 'Error al cargar reCAPTCHA. Por favor, recarga la página.';
              });
            },
          });
        } catch {
          this.errorMsg = 'Error al cargar reCAPTCHA. Por favor, recarga la página.';
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        this.errorMsg = 'No se pudo cargar reCAPTCHA. Por favor, desactiva tu bloqueador de anuncios y recarga la página.';
      }
    }, 200);
  }

  private resetRecaptcha(): void {
    if (typeof grecaptcha !== 'undefined' && grecaptcha.reset) {
      grecaptcha.reset();
    }
  }

  // ── Fase 1: Login ──────────────────────────────────────────────

  login(): void {
    if (!this.recaptchaToken) {
      this.errorMsg = 'Por favor, completa el reCAPTCHA antes de continuar.';
      return;
    }
    this.errorMsg            = '';
    this.sessionExpiredMsg   = '';
    this.correoSinVerificar  = '';
    this.mensajeReenvioVerif = '';
    this.cargando            = true;

    const sub = this.authService.login(this.email, this.password, this.recaptchaToken).subscribe({
      next: () => {
        this.cargando       = false;
        this.correoUsuario  = this.email;
        localStorage.setItem('email_pendiente', this.email);
        this.password       = '';
        this.recaptchaToken = '';
        this.resetRecaptcha();
        this.mostrarOtp     = true;
      },
      error: (err: unknown) => {
        this.cargando       = false;
        this.recaptchaToken = '';
        this.resetRecaptcha();

        const msg = this.extraerMensajeError(err) ?? 'Credenciales inválidas o error de conexión';
        this.errorMsg = msg;

        // ✅ Si el error es "correo no verificado", ofrecemos el botón de reenvío
        if (msg.toLowerCase().includes('verificar tu correo')) {
          this.correoSinVerificar = this.email;
        } else {
          this.correoSinVerificar = '';
        }
      },
    });

    this.subscriptions.push(sub);
  }

  // ── Reenvío verificación de cuenta desde login ─────────────────

  /**
   * Permite a un usuario que nunca verificó su correo solicitar un nuevo
   * enlace directamente desde la pantalla de login, sin necesidad de
   * volver a registrarse ni abrir la terminal.
   */
  reenviarVerificacionDesdeLogin(): void {
    if (!this.correoSinVerificar || this.reenviandoVerif) return;

    this.reenviandoVerif     = true;
    this.mensajeReenvioVerif = '';

    const sub = this.authService.resendVerificationEmail(this.correoSinVerificar).subscribe({
      next: () => {
        this.reenviandoVerif     = false;
        this.mensajeReenvioVerif = '✅ Correo reenviado. Revisa tu bandeja de entrada.';
      },
      error: () => {
        this.reenviandoVerif     = false;
        this.mensajeReenvioVerif = '❌ No se pudo reenviar. Intenta más tarde.';
      },
    });

    this.subscriptions.push(sub);
  }

  // ── Fase 2: Verificación OTP ───────────────────────────────────

  handleOtpValidado(code: string): void {
    this.errorMsg = '';

    const sub = this.authService.verify2FA(this.correoUsuario, code).subscribe({
      next: (response: LoginResponse) => {
        if (!response?.token || !response?.role) {
          this.errorMsg = 'Respuesta inválida del servidor.';
          this.otpModal?.stopLoading();
          return;
        }

        this.authService.guardarSesion(response.token, response.role, this.correoUsuario);

        if (response.mustChangePassword) {
          localStorage.setItem('mustChangePassword', 'true');
        } else {
          localStorage.removeItem('mustChangePassword');
        }

        localStorage.removeItem('email_pendiente');
        this.otpModal?.showSuccess();
      },
      error: (err: unknown) => {
        const msg =
          this.extraerMensajeError(err) ??
          'Código inválido, expirado o error en el servidor';

        this.errorMsg = msg;

        const msgLower = msg.toLowerCase();

        const esBloqueo =
          msgLower.includes('espera 1 minuto') ||
          msgLower.includes('intenta nuevamente en 1 minuto') ||
          msgLower.includes('antes de volver a intentarlo');

        if (esBloqueo) {
          this.otpModal?.showLocked(1);
          return;
        }

        const match = msg.match(/intentos restantes[:\s]+(\d+)/i);
        if (match) {
          this.otpModal?.showErrorConIntentos(parseInt(match[1], 10));
        } else {
          this.otpModal?.showError();
        }
      },
    });

    this.subscriptions.push(sub);
  }

  // ── Redirección tras éxito del modal ───────────────────────────

  handleSuccessRedirect(): void {
    this.mostrarOtp = false;
    const mustChange = localStorage.getItem('mustChangePassword') === 'true';
    const role       = localStorage.getItem('rol') ?? '';

    if (mustChange) {
      this.router.navigate(['/change-password-first']);
    } else {
      this.redirigirPorRol(role);
    }
  }

  private redirigirPorRol(role: string): void {
    switch (role) {
      case 'ROLE_VETERINARIO':   this.router.navigate(['/dashboard-vet']);     break;
      case 'ROLE_RECEPCIONISTA': this.router.navigate(['/dashboard-rec']);     break;
      case 'ROLE_ADMIN':         this.router.navigate(['/dashboard-admin']);   break;
      default:                   this.router.navigate(['/dashboard-cliente']); break;
    }
  }

  // ── Eventos del modal OTP ──────────────────────────────────────

  handleOtpCerrado(): void {
    this.mostrarOtp = false;
    localStorage.removeItem('email_pendiente');
  }

  handleReenvio(): void {
    if (!this.correoUsuario) return;
    this.errorMsg = '';
    this.cargando = true;

    const sub = this.authService.resend2FA(this.correoUsuario).subscribe({
      next: () => {
        this.cargando = false;
      },
      error: (err: unknown) => {
        this.cargando = false;
        const msg = this.extraerMensajeError(err) ?? 'Error al reenviar el código. Intenta más tarde.';
        this.errorMsg = msg;

        const match = msg.match(/espera[r]?\s+(\d+)\s*s/i)
          ?? msg.match(/(\d+)\s*segundo/i);
        if (match) {
          this.otpModal?.showCooldown(parseInt(match[1], 10));
        }
      },
    });

    this.subscriptions.push(sub);
  }

  // ── Navegación auxiliar ────────────────────────────────────────

  recuperarContrasena(): void { void this.router.navigate(['/forgot-password']); }
  irRegistro():          void { void this.router.navigate(['/register']); }

  // ── Utilidades ─────────────────────────────────────────────────

  private extraerMensajeError(err: unknown): string | null {
    const anyErr  = err as { error?: unknown; message?: unknown } | null;
    const backend = anyErr?.error;
    if (backend && typeof backend === 'object') {
      const msg = (backend as { message?: unknown }).message;
      if (typeof msg === 'string' && msg.trim()) return msg;
    }
    if (typeof backend === 'string' && backend.trim()) return backend;
    if (typeof anyErr?.message === 'string' && anyErr.message.trim()) return anyErr.message;
    return null;
  }
}
