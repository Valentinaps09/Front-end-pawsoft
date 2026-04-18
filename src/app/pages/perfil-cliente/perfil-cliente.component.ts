import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppSidebarComponent } from 'src/app/share/components/app-sidebar/app-sidebar.component';
import { ProfileService } from 'src/app/services/profile.service';
import { AccessibilityService, Theme, FontSize } from 'src/app/services/accessibility.service';
import { AuthService } from 'src/app/services/auth';

@Component({
  selector: 'app-perfil-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent],
  templateUrl: './perfil-cliente.component.html',
  styleUrls: ['./perfil-cliente.component.scss']
})
export class PerfilClienteComponent implements OnInit, OnDestroy {

  userName = '';
  userRole = '';

  /* ── Datos del perfil ── */
  name  = '';
  email = '';
  phone = '';

  /* ── Cambio de contraseña (opcional) ── */
  currentPassword = '';
  newPassword     = '';
  confirmPassword = '';
  showCurrentPass = false;
  showNewPass     = false;
  showConfirmPass = false;
  passwordValidated = false;

  /* ── Errores de campo ── */
  emailError = '';
  phoneError = '';
  passError  = '';
  currentPassError = '';

  /* ── Tocado (para mostrar error solo si interactuó) ── */
  emailTocado = false;
  phoneTocado = false;
  passTocado  = false;
  currentPassTocado = false;

  /* ── Estados ── */
  loadingProfile = false;
  sendingCode    = false;
  validatingCurrentPassword = false;
  private passwordValidationTimeout: any = null;

  /* ── Modal verificación ── */
  showVerifyModal  = false;
  verificationCode = '';
  verifyingCode    = false;
  verifyError      = '';

  /* ── Modal éxito ── */
  showSuccessModal = false;
  successModalMessage = 'Los cambios se guardaron correctamente';

  /* ── Snapshot para enviar al backend ── */
  private pendingEmail       = '';
  private pendingPhone       = '';
  private pendingCurrentPassword = '';
  private pendingNewPassword = '';
  private emailActual        = '';

  /* ── Mensajes globales ── */
  errorMessage   = '';

  constructor(
    readonly router: Router,
    private readonly profileService: ProfileService,
    readonly accessibilityService: AccessibilityService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('email') || 'Usuario';
    this.userRole = localStorage.getItem('rol')   || 'ROLE_CLIENTE';
    this.loadProfile();
  }

  ngOnDestroy(): void {
    if (this.passwordValidationTimeout) {
      clearTimeout(this.passwordValidationTimeout);
    }
  }

  /* ══════════════════════════════
     CARGA PERFIL
  ══════════════════════════════ */

  loadProfile(): void {
    this.loadingProfile = true;
    this.profileService.getProfile().subscribe({
      next: (data) => {
        this.name  = data.name  ?? '';
        this.email = data.email ?? '';
        // Normaliza el teléfono: quita +57, espacios, guiones
        this.phone = this.normalizarTelefono(data.phone ?? '');
        this.loadingProfile = false;
      },
      error: () => {
        this.email = localStorage.getItem('email') || '';
        this.loadingProfile = false;
      }
    });
  }

  /* ══════════════════════════════
     TELÉFONO — solo dígitos, máx 10
  ══════════════════════════════ */

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Elimina todo lo que no sea dígito
    let valor = input.value.replace(/\D/g, '');
    // Máximo 10 dígitos (Colombia)
    if (valor.length > 10) valor = valor.slice(0, 10);
    this.phone = valor;
    input.value = valor;
    this.phoneTocado = true;
    this.validarTelefono();
  }

  private normalizarTelefono(tel: string): string {
    // Quita +57, espacios, guiones, paréntesis
    let limpio = tel.replace(/[\s\-\(\)]/g, '').replace(/^\+57/, '');
    // Solo dígitos
    limpio = limpio.replace(/\D/g, '');
    return limpio.slice(0, 10);
  }

  private validarTelefono(): void {
    const p = this.phone;
    if (!p) {
      this.phoneError = '';   // opcional — no obligatorio
      return;
    }
    if (p.length !== 10) {
      this.phoneError = 'El teléfono debe tener exactamente 10 dígitos.';
      return;
    }
    // Colombia: celulares empiezan en 3, fijos en 6
    if (!/^[36]\d{9}$/.test(p)) {
      this.phoneError = 'Número colombiano inválido (debe empezar en 3 o 6).';
      return;
    }
    this.phoneError = '';
  }

  /* ══════════════════════════════
     CORREO
  ══════════════════════════════ */

  onEmailBlur(): void {
    this.emailTocado = true;
    this.validarEmail();
  }

  private validarEmail(): void {
    const e = this.email.trim();
    if (!e) {
      this.emailError = 'El correo es obligatorio.';
      return;
    }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!re.test(e)) {
      this.emailError = 'Ingresa un correo electrónico válido.';
      return;
    }
    this.emailError = '';
  }

  /* ══════════════════════════════
     CONTRASEÑA ACTUAL
  ══════════════════════════════ */

  onCurrentPassInput(): void {
    this.currentPassTocado = true;
    this.passwordValidated = false;
    this.currentPassError = '';

    // Limpiar timeout anterior si existe
    if (this.passwordValidationTimeout) {
      clearTimeout(this.passwordValidationTimeout);
    }

    // Si no hay contraseña, no validar
    if (!this.currentPassword.trim()) {
      this.passwordValidated = false;
      return;
    }

    // Validar después de 500ms de que el usuario deje de escribir
    this.passwordValidationTimeout = setTimeout(() => {
      this.validarCurrentPassword();
    }, 500);
  }

  private validarCurrentPassword(): void {
    if (!this.currentPassword.trim()) {
      this.currentPassError = '';
      this.passwordValidated = false;
      return;
    }

    this.validatingCurrentPassword = true;
    this.profileService.validateCurrentPassword({ currentPassword: this.currentPassword }).subscribe({
      next: (response) => {
        this.validatingCurrentPassword = false;
        if (response.valid) {
          this.currentPassError = '';
          this.passwordValidated = true;
        } else {
          this.currentPassError = 'Contraseña actual incorrecta.';
          this.passwordValidated = false;
        }
      },
      error: () => {
        this.validatingCurrentPassword = false;
        this.currentPassError = 'Error al validar la contraseña.';
        this.passwordValidated = false;
      }
    });
  }

  /* ══════════════════════════════
     CONTRASEÑA NUEVA
  ══════════════════════════════ */

  onPassBlur(): void {
    this.passTocado = true;
    this.validarPass();
  }

  onPassInput(): void {
    this.passTocado = true;
    this.validarPass();
  }

  private validarPass(): void {
    // Si no hay contraseña actual, no validar las nuevas
    if (!this.currentPassword && !this.newPassword && !this.confirmPassword) { 
      this.passError = ''; 
      return; 
    }
    
    // Si hay contraseña actual pero no está validada, no permitir continuar
    if (this.currentPassword && !this.passwordValidated) {
      this.passError = 'Primero valida tu contraseña actual.';
      return;
    }
    
    // Si no hay nueva contraseña pero sí actual, requerir nueva contraseña
    if (this.currentPassword && !this.newPassword) {
      this.passError = 'Ingresa tu nueva contraseña.';
      return;
    }
    
    const p = this.newPassword;
    const faltan: string[] = [];
    if (p.length < 8)             faltan.push('mínimo 8 caracteres');
    if (!/[A-Z]/.test(p))         faltan.push('una mayúscula');
    if (!/[0-9]/.test(p))         faltan.push('un número');
    if (!/[^A-Za-z0-9]/.test(p))  faltan.push('un carácter especial');
    if (faltan.length)             { this.passError = 'Falta: ' + faltan.join(', ') + '.'; return; }
    if (p !== this.confirmPassword){ this.passError = 'Las contraseñas no coinciden.'; return; }
    this.passError = '';
  }

  private isPasswordStrong(pass: string): boolean {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])[A-Za-z\d\S]{8,}$/.test(pass);
  }

  /* ══════════════════════════════
     GUARDAR (paso 1 — pedir código)
  ══════════════════════════════ */

  get formularioValido(): boolean {
    this.validarEmail();
    this.validarTelefono();
    this.validarPass();
    return !this.emailError && !this.phoneError && !this.passError && !this.currentPassError;
  }

  requestSave(): void {
    // Marcar todos como tocados para mostrar errores
    this.emailTocado = true;
    this.phoneTocado = true;
    this.passTocado  = true;
    this.currentPassTocado = true;

    this.validarEmail();
    this.validarTelefono();
    this.validarPass();

    if (this.emailError || this.phoneError || this.passError || this.currentPassError) {
      this.errorMessage = 'Corrige los errores antes de continuar.';
      return;
    }

    this.clearMessages();

    this.pendingEmail       = this.email.trim();
    this.pendingPhone       = this.phone.trim();
    this.pendingCurrentPassword = this.currentPassword;
    this.pendingNewPassword = this.newPassword;

    // Guardamos el email actual antes de cualquier cambio
    this.emailActual = localStorage.getItem('email') ?? this.email;

    this.sendingCode = true;
    this.profileService.requestVerification().subscribe({
      next: () => {
        this.sendingCode      = false;
        this.showVerifyModal  = true;
        this.verificationCode = '';
        this.verifyError      = '';
      },
      error: () => {
        this.sendingCode  = false;
        this.errorMessage = 'No se pudo enviar el código. Intenta de nuevo.';
      }
    });
  }

  /* ══════════════════════════════
     VERIFICAR Y GUARDAR (paso 2)
  ══════════════════════════════ */

  confirmVerifyAndSave(): void {
    if (!this.verificationCode.trim()) {
      this.verifyError = 'Ingresa el código de verificación.';
      return;
    }

    this.verifyingCode = true;
    this.verifyError   = '';

    this.profileService.verifyAndSave({
      code:        this.verificationCode.trim(),
      email:       this.pendingEmail,
      phone:       this.pendingPhone ?? '',
      currentPassword: this.pendingCurrentPassword || undefined,
      newPassword: this.pendingNewPassword || undefined
    }).subscribe({
      next: () => {
        const emailCambio = this.pendingEmail !== (this.emailActual ?? '');

        this.verifyingCode   = false;
        this.showVerifyModal = false;
        this.currentPassword = '';
        this.newPassword     = '';
        this.confirmPassword = '';
        this.passwordValidated = false;
        this.passError       = '';
        this.currentPassError = '';

        if (emailCambio) {
          // El JWT tiene el email viejo — hay que volver a hacer login
          this.verifyingCode   = false;
          this.showVerifyModal = false;
          this.successModalMessage = 'Correo actualizado. Serás redirigido al login';
          this.showSuccessModal = true;
          this.currentPassword = '';
          this.newPassword     = '';
          this.confirmPassword = '';
          this.passwordValidated = false;
          this.passError       = '';
          this.currentPassError = '';
          
          setTimeout(() => {
            this.showSuccessModal = false;
            localStorage.clear();
            this.router.navigate(['/login']);
          }, 2500);
        } else {
          localStorage.setItem('email', this.pendingEmail);
          this.userName       = this.pendingEmail;
          this.verifyingCode   = false;
          this.showVerifyModal = false;
          this.successModalMessage = 'Los cambios se guardaron correctamente';
          this.showSuccessModal = true;
          this.currentPassword = '';
          this.newPassword     = '';
          this.confirmPassword = '';
          this.passwordValidated = false;
          this.passError       = '';
          this.currentPassError = '';
          
          setTimeout(() => {
            this.showSuccessModal = false;
          }, 2000);
        }
      },
      error: (err) => {
        this.verifyingCode = false;
        this.verifyError   = err?.error?.message || 'Código incorrecto o expirado.';
      }
    });
  }

  closeVerifyModal(): void {
    this.showVerifyModal  = false;
    this.verificationCode = '';
    this.verifyError      = '';
  }

  /* ══════════════════════════════
     HELPERS — barra de fortaleza
  ══════════════════════════════ */

  get passwordStrengthPct(): string {
    const p = this.newPassword;
    if (!p) return '0%';
    if (p.length < 6) return '25%';
    const score = [/[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
    if (p.length >= 8 && score === 3) return '100%';
    if (score >= 2) return '75%';
    return '50%';
  }

  get passwordStrengthClass(): string {
    const map: Record<string,string> = {
      '100%': 'fuerte', '75%': 'buena', '50%': 'media', '25%': 'debil', '0%': ''
    };
    return map[this.passwordStrengthPct] ?? '';
  }

  get passwordStrengthLabel(): string {
    const map: Record<string,string> = {
      fuerte: 'Contraseña fuerte', buena: 'Contraseña buena',
      media:  'Contraseña media',  debil: 'Contraseña débil'
    };
    return map[this.passwordStrengthClass] ?? '';
  }

  private clearMessages(): void {
    this.errorMessage   = '';
  }

  logout(): void {
    this.authService.logout();
  }
}
