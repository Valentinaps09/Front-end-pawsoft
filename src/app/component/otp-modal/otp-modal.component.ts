import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  ViewChildren
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  mailOutline,
  alertCircleOutline,
  closeOutline,
  checkmarkCircleOutline,
  timeOutline
} from 'ionicons/icons';

/**
 * Componente modal reutilizable para verificación OTP (2FA).
 *
 * Flujo esperado:
 * 1. El padre muestra el modal con [isVisible]="true".
 * 2. El usuario ingresa el código de 6 dígitos.
 * 3. Al presionar Validar, emite (validate) con el código.
 * 4. El padre llama al backend y según la respuesta llama al método correspondiente:
 *
 *    ✅ Correcto                       → showSuccess()
 *    ❌ Incorrecto con intentos info   → showErrorConIntentos(restantes)
 *    ❌ Incorrecto sin info            → showError()
 *    🔒 Bloqueado (minutos)           → showLocked(minutos)
 *    ⏳ Cooldown entre reenvíos        → showCooldown(segundosRestantes)
 *    📵 Límite de reenvíos alcanzado  → showReenviosBloqueados(minutos)
 *
 * Reglas de negocio alineadas con el backend:
 * - El código expira en 3 minutos.
 * - El usuario puede reenviar pasados 60 segundos.
 * - Máximo 5 reenvíos antes de bloqueo gradual.
 * - Máximo 3 intentos fallidos antes de bloqueo gradual.
 * - Bloqueo gradual: 5 min × número de bloqueos acumulados.
 */
@Component({
  selector: 'app-otp-modal',
  templateUrl: './otp-modal.component.html',
  styleUrls: ['./otp-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon, IonSpinner],
})
export class OtpModalComponent implements OnInit, OnDestroy {

  /** Controla la visibilidad del modal */
  @Input() isVisible = false;

  /** Correo del usuario — se enmascara en pantalla */
  @Input() email = '';

  /** Emite el código OTP completo al presionar Validar */
  @Output() validate       = new EventEmitter<string>();

  /** Emite cuando el usuario cierra el modal */
  @Output() closed         = new EventEmitter<void>();

  /** Emite cuando el usuario solicita reenviar el código */
  @Output() resend         = new EventEmitter<void>();

  /** Emite cuando termina la animación de éxito y hay que navegar */
  @Output() successRedirect = new EventEmitter<void>();

  @ViewChildren('otpInputs') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  otpValues: string[] = ['', '', '', '', '', ''];

  hasError   = false;
  isLoading  = false;
  isSuccess  = false;

  /**
   * true cuando el usuario está bloqueado por exceso de intentos fallidos
   * o por exceso de reenvíos. Durante este estado los inputs se deshabilitan.
   */
  isLocked   = false;

  /**
   * true durante el cooldown entre reenvíos (espera de 60 s).
   * Solo bloquea el botón de reenvío, no los inputs.
   */
  isCooldown = false;

  randomId = Math.random().toString(36).substring(2);

  /** Mensaje dinámico mostrado en el área de error de los inputs */
  errorMessage = 'Código incorrecto. Intenta de nuevo.';

  /** Mensaje mostrado cuando hay bloqueo (intentos o reenvíos) */
  lockMessage  = '';

  /** Mensaje mostrado durante cooldown de reenvío */
  cooldownMessage = '';

  /** Segundos restantes para el countdown de reenvío (60 s) */
  countdown   = 60;

  /** Segundos restantes del bloqueo activo — se muestra en pantalla */
  lockSeconds = 0;

  /** Segundos restantes del cooldown de reenvío — se muestra en pantalla */
  cooldownSeconds = 0;

  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private lockInterval:      ReturnType<typeof setInterval> | null = null;
  private cooldownInterval:  ReturnType<typeof setInterval> | null = null;

  constructor() {
    addIcons({ mailOutline, alertCircleOutline, closeOutline, checkmarkCircleOutline, timeOutline });
  }

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.clearCountdown();
    this.clearLock();
    this.clearCooldownInterval();
  }

  // ─── Computed ───────────────────────────────────────────

  /** Enmascara el correo: ejem****@correo.com */
  get maskedEmail(): string {
    if (!this.email) return '';
    const [local, domain] = this.email.split('@');
    return `${local.slice(0, 4)}****@${domain}`;
  }

  /** Verdadero cuando los 6 dígitos están completos */
  get isComplete(): boolean {
    return this.otpValues.every(v => v !== '');
  }

  // ─── Interacción con inputs ──────────────────────────────

  onDigitInput(event: Event, index: number): void {
    if (this.isLocked) return;

    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');

    if (value.length > 1) input.value = value[0];

    this.otpValues[index] = value[0] ?? '';
    input.value = this.otpValues[index];
    this.hasError = false;

    if (this.otpValues[index] && index < 5) {
      this.focusInput(index + 1);
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    if (this.isLocked) return;

    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      if (this.otpValues[index]) {
        this.otpValues[index] = '';
        input.value = '';
      } else if (index > 0) {
        this.otpValues[index - 1] = '';
        this.setInputValue(index - 1, '');
        this.focusInput(index - 1);
      }
      return;
    }

    if (event.key === 'ArrowLeft'  && index > 0) this.focusInput(index - 1);
    if (event.key === 'ArrowRight' && index < 5) this.focusInput(index + 1);
  }

  onPaste(event: ClipboardEvent): void {
    if (this.isLocked) return;

    event.preventDefault();
    const digits = (event.clipboardData?.getData('text') ?? '')
      .replace(/\D/g, '').slice(0, 6).split('');

    digits.forEach((d, i) => { if (i < 6) this.otpValues[i] = d; });
    this.syncInputsFromValues();

    setTimeout(() => this.focusInput(Math.min(digits.length - 1, 5)), 0);
  }

  // ─── Acciones ────────────────────────────────────────────

  validar(): void {
    if (this.isLocked || !this.isComplete || this.isLoading) return;
    this.isLoading = true;
    const code = this.otpValues.join('');
    this.validate.emit(code);
  }

  /**
   * Llamar desde el padre cuando el backend confirma código CORRECTO.
   * Muestra animación de éxito y emite successRedirect tras 2 segundos.
   */
  showSuccess(): void {
    this.isLoading = false;
    this.isSuccess = true;
    this.clearCountdown();
    this.clearLock();
    this.clearCooldownInterval();

    setTimeout(() => {
      this.successRedirect.emit();
      this.resetModal();
    }, 2000);
  }

  /**
   * Llamar desde el padre cuando el código es INCORRECTO
   * y el backend no informa cuántos intentos quedan.
   */
  showError(): void {
    this.errorMessage = 'Código incorrecto. Intenta de nuevo.';
    this.aplicarError();
  }

  /**
   * Llamar desde el padre cuando el código es INCORRECTO
   * y el backend informa cuántos intentos quedan antes de bloqueo.
   *
   * @param restantes número de intentos restantes que devuelve el backend
   */
  showErrorConIntentos(restantes: number): void {
    this.errorMessage = `Código incorrecto. Intentos restantes: ${restantes}`;
    this.aplicarError();
  }

  /**
   * Llamar desde el padre cuando la cuenta queda bloqueada temporalmente
   * por exceso de intentos fallidos de verificación.
   *
   * El bloqueo es gradual: el backend envía los minutos exactos
   * (5 × bloqueosAcumulados). Se muestra cuenta regresiva en pantalla.
   *
   * @param minutos minutos de bloqueo que devuelve el backend
   */
  showLocked(minutos: number): void {
    this.isLoading  = false;
    this.isLocked   = true;
    this.lockSeconds = Math.max(1, minutos * 60);
    this.lockMessage = `Demasiados intentos fallidos. Bloqueado por ${minutos} minuto(s).`;

    this.limpiarInputs();
    this.clearLock();

    this.lockInterval = setInterval(() => {
      this.lockSeconds--;
      if (this.lockSeconds <= 0) {
        this.clearLock();
        this.isLocked    = false;
        this.lockMessage = '';
      }
    }, 1000);
  }

  /**
   * Llamar desde el padre cuando el usuario intenta reenviar demasiado pronto.
   * El backend responde con los segundos exactos que debe esperar.
   *
   * Durante este cooldown solo se bloquea el botón de reenvío,
   * los inputs de código siguen activos.
   *
   * @param segundos segundos de espera que devuelve el backend
   */
  showCooldown(segundos: number): void {
    this.isLoading       = false;
    this.isCooldown      = true;
    this.cooldownSeconds = Math.max(1, segundos);
    this.cooldownMessage = `Debes esperar ${this.cooldownSeconds}s para reenviar.`;

    this.clearCooldownInterval();

    this.cooldownInterval = setInterval(() => {
      this.cooldownSeconds--;
      this.cooldownMessage = `Debes esperar ${this.cooldownSeconds}s para reenviar.`;

      if (this.cooldownSeconds <= 0) {
        this.clearCooldownInterval();
        this.isCooldown      = false;
        this.cooldownMessage = '';
        // Reinicia el countdown visual del botón reenviar
        this.startCountdown();
      }
    }, 1000);
  }

  /**
   * Llamar desde el padre cuando el usuario supera el límite de reenvíos
   * y el backend aplica un bloqueo gradual.
   *
   * A diferencia de showLocked(), aquí el bloqueo fue causado por reenvíos,
   * no por intentos fallidos — el mensaje es diferente.
   *
   * @param minutos minutos de bloqueo gradual que devuelve el backend
   */
  showReenviosBloqueados(minutos: number): void {
    this.isLoading   = false;
    this.isLocked    = true;
    this.lockSeconds = Math.max(1, minutos * 60);
    this.lockMessage = `Límite de reenvíos alcanzado. Bloqueado por ${minutos} minuto(s).`;

    this.limpiarInputs();
    this.clearCountdown();
    this.clearLock();

    this.lockInterval = setInterval(() => {
      this.lockSeconds--;
      if (this.lockSeconds <= 0) {
        this.clearLock();
        this.isLocked    = false;
        this.lockMessage = '';
        this.startCountdown();
      }
    }, 1000);
  }

  stopLoading(): void {
    this.isLoading = false;
  }

  cerrar(): void {
    this.resetModal();
    this.closed.emit();
  }

  reenviarCodigo(): void {
    if (this.isLocked || this.isCooldown || this.countdown > 0) return;

    this.limpiarInputs();
    this.hasError        = false;
    this.cooldownMessage = '';

    // El countdown visual se reiniciará cuando el padre confirme el reenvío
    // o cuando showCooldown() lo gestione si hay restricción del backend.
    this.resend.emit();

    setTimeout(() => this.focusInput(0), 100);
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('otp-overlay')) {
      this.cerrar();
    }
  }

  // ─── Helpers privados ────────────────────────────────────

  /**
   * Lógica común para mostrar estado de error en los inputs.
   * Limpia los dígitos, activa la animación shake y la apaga tras 3 s.
   */
  private aplicarError(): void {
    this.isLoading = false;
    this.hasError  = true;

    this.limpiarInputs();
    setTimeout(() => this.focusInput(0), 100);
    setTimeout(() => (this.hasError = false), 3000);
  }

  /** Vacía los inputs tanto en el modelo como en el DOM */
  private limpiarInputs(): void {
    this.otpValues = ['', '', '', '', '', ''];
    this.syncInputsFromValues();
  }

  private focusInput(index: number): void {
    const el = this.otpInputs?.toArray()?.[index]?.nativeElement;
    el?.focus();
    el?.select?.();
  }

  private setInputValue(index: number, value: string): void {
    const el = this.otpInputs?.toArray()?.[index]?.nativeElement;
    if (el) el.value = value;
  }

  private syncInputsFromValues(): void {
    (this.otpInputs?.toArray() ?? []).forEach((ref, i) => {
      ref.nativeElement.value = this.otpValues[i] ?? '';
    });
  }

  /** Inicia el countdown visual de 60 s antes de habilitar el botón reenviar */
  private startCountdown(): void {
    this.clearCountdown();
    this.countdown = 60;
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) this.clearCountdown();
    }, 1000);
  }

  private clearCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.countdown = 0;
  }

  private clearLock(): void {
    if (this.lockInterval) {
      clearInterval(this.lockInterval);
      this.lockInterval = null;
    }
  }

  private clearCooldownInterval(): void {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }
  }

  private resetModal(): void {
    this.limpiarInputs();
    this.hasError        = false;
    this.isLoading       = false;
    this.isSuccess       = false;
    this.isLocked        = false;
    this.isCooldown      = false;
    this.lockSeconds     = 0;
    this.cooldownSeconds = 0;
    this.lockMessage     = '';
    this.cooldownMessage = '';
    this.errorMessage    = 'Código incorrecto. Intenta de nuevo.';
    this.clearLock();
    this.clearCooldownInterval();
  }
}
