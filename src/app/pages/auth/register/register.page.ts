import { Component, NgZone, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonItem, IonLabel,
  IonInput, IonButton, IonIcon, IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eyeOutline, eyeOffOutline, alertCircleOutline, mailOutline, refreshOutline, arrowBackOutline } from 'ionicons/icons';
import { OtpModalComponent } from '../../../component/otp-modal/otp-modal.component';
import { PoliticaModalComponent } from '../../../component/politica-modal/politica-modal.component';
import { AuthService } from "../../../services/auth";

declare const grecaptcha: any;

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent, IonItem, IonLabel,
    IonInput, IonButton, IonIcon, IonSpinner,
    OtpModalComponent,
    PoliticaModalComponent,
  ],
})
export class RegisterPage implements OnInit {

  private router      = inject(Router);
  private authService = inject(AuthService);
  private ngZone      = inject(NgZone);

  @ViewChild(OtpModalComponent) otpModal!: OtpModalComponent;

  nombre     = '';
  correo     = '';
  telefono   = '';
  contrasena = '';
  mostrarPass    = false;
  mostrarError   = false;
  mensajeError   = '';
  mostrarOtp     = false;
  mostrarPolitica  = false;
  aceptaPolitica   = false;

  // ── Estado verificación pendiente ─────────────────────────────
  /** true cuando el registro fue exitoso y se está esperando verificación del correo */
  verificacionPendiente = false;
  /** correo al que se envió el enlace de verificación */
  correoRegistrado      = '';
  /** true mientras se está reenviando el correo */
  reenviando            = false;
  /** mensaje de éxito/error del reenvío */
  mensajeReenvio        = '';
  /** tipo del mensaje de reenvío: 'ok' | 'error' | '' */
  tipoReenvio: 'ok' | 'error' | '' = '';
  // ─────────────────────────────────────────────────────────────

  errores: {
    nombre:     string;
    correo:     string;
    telefono:   string;
    contrasena: string;
  } = { nombre: '', correo: '', telefono: '', contrasena: '' };

  tocado: {
    nombre:     boolean;
    correo:     boolean;
    telefono:   boolean;
    contrasena: boolean;
  } = { nombre: false, correo: false, telefono: false, contrasena: false };

  siteKey        = '6Lc8A4EsAAAAALRBXHH98TRFskX6urHK28txP555';
  recaptchaToken = '';

  constructor() {
    addIcons({ eyeOutline, eyeOffOutline, alertCircleOutline, mailOutline, refreshOutline, arrowBackOutline });
  }

  ngOnInit(): void {
    this.mostrarPass    = false;
    this.mostrarError   = false;
    this.recaptchaToken = '';
    this.errores        = { nombre: '', correo: '', telefono: '', contrasena: '' };
    this.tocado         = { nombre: false, correo: false, telefono: false, contrasena: false };
    this.renderRecaptcha();
  }

  ionViewWillEnter(): void {
    // Solo limpiamos el formulario si NO estamos en estado de verificación pendiente
    if (!this.verificacionPendiente) {
      this.nombre        = '';
      this.correo        = '';
      this.telefono      = '';
      this.contrasena    = '';
      this.aceptaPolitica = false;
      this.errores       = { nombre: '', correo: '', telefono: '', contrasena: '' };
      this.tocado        = { nombre: false, correo: false, telefono: false, contrasena: false };
    }
  }

  // ── Validaciones ─────────────────────────────────────────────

  validarNombre(): void {
    this.tocado.nombre  = true;
    const partes        = this.nombre.trim().split(/\s+/);
    if (!this.nombre.trim()) {
      this.errores.nombre = 'El nombre es obligatorio.';
    } else if (partes.length !== 2) {
      this.errores.nombre = 'Ingresa exactamente un nombre y un apellido (ej: Juan Pérez).';
    } else if (partes.some(p => p.length < 2)) {
      this.errores.nombre = 'Cada palabra debe tener al menos 2 caracteres.';
    } else {
      this.errores.nombre = '';
    }
  }


  limitarNombre(event: Event): void {
    const input = event.target as HTMLInputElement;
    const partes = input.value.split(/\s+/).filter(p => p.length > 0);
    if (partes.length > 2) {
      input.value = partes.slice(0, 2).join(' ');
      this.nombre = input.value;
    }
    this.validarNombre();
  }

  validarCorreo(): void {
    this.tocado.correo  = true;
    const emailRegex    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.errores.correo = !this.correo || !emailRegex.test(this.correo)
      ? 'Ingresa un correo electrónico válido.'
      : '';
  }

  validarTelefono(): void {
    this.tocado.telefono  = true;
    const telRegex        = /^3[0-9]{9}$/;
    if (!this.telefono) {
      this.errores.telefono = 'El teléfono es obligatorio.';
    } else if (!telRegex.test(this.telefono)) {
      this.errores.telefono = 'Debe empezar por 3 y tener 10 dígitos (ej: 3001234567).';
    } else {
      this.errores.telefono = '';
    }
  }

  validarContrasena(): void {
    this.tocado.contrasena = true;
    const p = this.contrasena;
    if (!p) { this.errores.contrasena = 'La contraseña es obligatoria.'; return; }
    const faltan: string[] = [];
    if (p.length < 8)             faltan.push('mínimo 8 caracteres');
    if (!/[A-Z]/.test(p))         faltan.push('una mayúscula');
    if (!/[0-9]/.test(p))         faltan.push('un número');
    if (!/[^A-Za-z0-9]/.test(p))  faltan.push('un carácter especial');
    this.errores.contrasena = faltan.length ? 'Falta: ' + faltan.join(', ') + '.' : '';
  }

  soloNumeros(event: Event): void {
    const input   = event.target as HTMLInputElement;
    input.value   = input.value.replace(/\D/g, '');
    this.telefono = input.value;
    this.validarTelefono();
  }

  // ── Indicador de fuerza ───────────────────────────────────────

  get fuerzaPct(): string {
    const len = this.contrasena.length;
    if (len === 0) return '0%';
    if (len < 6)   return '25%';
    if (len < 8)   return '50%';
    const hasUpper   = /[A-Z]/.test(this.contrasena);
    const hasNumber  = /[0-9]/.test(this.contrasena);
    const hasSpecial = /[^A-Za-z0-9]/.test(this.contrasena);
    const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (score === 3) return '100%';
    if (score === 2) return '75%';
    return '50%';
  }

  get fuerzaClase(): string {
    const pct = this.fuerzaPct;
    if (pct === '100%') return 'fuerte';
    if (pct === '75%')  return 'buena';
    if (pct === '50%')  return 'media';
    return 'debil';
  }

  get fuerzaTexto(): string {
    const map: Record<string, string> = {
      fuerte: 'Contraseña fuerte',
      buena:  'Contraseña buena',
      media:  'Contraseña media',
      debil:  'Contraseña débil',
    };
    return map[this.fuerzaClase];
  }

  // ── Registro ──────────────────────────────────────────────────

  registrar(): void {
    this.validarNombre();
    this.validarCorreo();
    this.validarTelefono();
    this.validarContrasena();

    const hayErrores = Object.values(this.errores).some(e => e !== '');
    if (hayErrores) return;

    if (!this.recaptchaToken) {
      this.setError('Completa la verificación reCAPTCHA.');
      return;
    }

    this.authService.register(
      this.nombre.trim(),
      this.correo.trim(),
      this.contrasena,
      this.telefono.trim(),
      this.recaptchaToken,
    ).subscribe({
      next: () => {
        this.recaptchaToken   = '';
        this.resetRecaptcha();
        // ✅ FIX: En lugar de navegar a login, mostramos la pantalla de verificación pendiente
        this.correoRegistrado      = this.correo.trim();
        this.verificacionPendiente = true;
        this.mensajeReenvio        = '';
        this.tipoReenvio           = '';
      },
      error: (err) => {
        this.recaptchaToken = '';
        this.resetRecaptcha();
        const msg = err.error?.message || err.error || 'Error al registrar. Intenta de nuevo.';
        this.setError(typeof msg === 'string' ? msg : 'Error al registrar. Intenta de nuevo.');
      },
    });
  }

  // ── Verificación pendiente ─────────────────────────────────────

  /**
   * Vuelve al formulario de registro para que el usuario corrija sus datos.
   * Limpia el estado de verificación pendiente.
   */
  volverEditar(): void {
    this.verificacionPendiente = false;
    this.mensajeReenvio        = '';
    this.tipoReenvio           = '';
    // Re-renderiza el reCAPTCHA porque fue destruido al ocultar el formulario
    setTimeout(() => this.renderRecaptcha(), 100);
  }

  /**
   * Reenvía el correo de verificación al correo registrado.
   * Requiere que el backend tenga el endpoint POST /auth/resend-verification?email=...
   */
  reenviarVerificacion(): void {
    if (this.reenviando || !this.correoRegistrado) return;
    this.reenviando     = true;
    this.mensajeReenvio = '';
    this.tipoReenvio    = '';

    this.authService.resendVerificationEmail(this.correoRegistrado).subscribe({
      next: () => {
        this.reenviando     = false;
        this.mensajeReenvio = '✅ Correo reenviado. Revisa tu bandeja de entrada.';
        this.tipoReenvio    = 'ok';
      },
      error: () => {
        this.reenviando     = false;
        this.mensajeReenvio = '❌ No se pudo reenviar el correo. Intenta más tarde.';
        this.tipoReenvio    = 'error';
      },
    });
  }

  // ── Política de datos ─────────────────────────────────────────

  abrirPolitica(): void {
    this.mostrarPolitica = true;
  }

  cerrarPolitica(): void {
    this.mostrarPolitica = false;
  }

  // ── reCAPTCHA ─────────────────────────────────────────────────

  private renderRecaptcha(): void {
    const interval = setInterval(() => {
      if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
        clearInterval(interval);
        grecaptcha.render('recaptcha-register', {
          sitekey: this.siteKey,
          callback: (token: string) => {
            this.ngZone.run(() => { this.recaptchaToken = token; });
          },
          'expired-callback': () => {
            this.ngZone.run(() => { this.recaptchaToken = ''; });
          },
        });
      }
    }, 200);
  }

  private resetRecaptcha(): void {
    if (typeof grecaptcha !== 'undefined' && grecaptcha.reset) {
      grecaptcha.reset();
    }
  }

  // ── OTP ───────────────────────────────────────────────────────

  handleOtpValidado(code: string): void {
    if (code === '123456') {
      this.otpModal.showSuccess();
    } else {
      this.otpModal.showError();
    }
  }

  handleSuccessRedirect(): void {
    this.mostrarOtp = false;
    this.router.navigate(['/login']);
  }

  irLogin(): void {
    this.router.navigate(['/login']);
  }

  private setError(msg: string): void {
    this.mensajeError = msg;
    this.mostrarError = true;
    setTimeout(() => (this.mostrarError = false), 3500);
  }
}
