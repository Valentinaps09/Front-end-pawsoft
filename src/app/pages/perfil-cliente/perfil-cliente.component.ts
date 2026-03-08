import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppSidebarComponent } from 'src/app/share/components/app-sidebar/app-sidebar.component';
import { ProfileService } from 'src/app/services/profile.service';
import { AccessibilityService, Theme, FontSize } from 'src/app/services/accessibility.service';

@Component({
  selector: 'app-perfil-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent],
  templateUrl: './perfil-cliente.component.html',
  styleUrls: ['./perfil-cliente.component.scss']
})
export class PerfilClienteComponent implements OnInit {

  userName = '';
  userRole = '';

  /* ── Datos del perfil ── */
  name  = '';
  email = '';
  phone = '';

  /* ── Cambio de contraseña (opcional) ── */
  newPassword     = '';
  confirmPassword = '';
  showNewPass     = false;
  showConfirmPass = false;

  /* ── Errores de campo ── */
  emailError = '';
  phoneError = '';
  passError  = '';

  /* ── Tocado (para mostrar error solo si interactuó) ── */
  emailTocado = false;
  phoneTocado = false;
  passTocado  = false;

  /* ── Estados ── */
  loadingProfile = false;
  sendingCode    = false;

  /* ── Modal verificación ── */
  showVerifyModal  = false;
  verificationCode = '';
  verifyingCode    = false;
  verifyError      = '';

  /* ── Snapshot para enviar al backend ── */
  private pendingEmail       = '';
  private pendingPhone       = '';
  private pendingNewPassword = '';

  /* ── Mensajes globales ── */
  successMessage = '';
  errorMessage   = '';

  constructor(
    readonly router: Router,
    private readonly profileService: ProfileService,
    readonly accessibilityService: AccessibilityService
  ) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('email') || 'Usuario';
    this.userRole = localStorage.getItem('rol')   || 'ROLE_CLIENTE';
    this.loadProfile();
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
     CONTRASEÑA
  ══════════════════════════════ */

  onPassBlur(): void {
    this.passTocado = true;
    this.validarPass();
  }

  private validarPass(): void {
    if (!this.newPassword && !this.confirmPassword) {
      this.passError = '';
      return;
    }
    if (this.newPassword.length < 8) {
      this.passError = 'Mínimo 8 caracteres.';
      return;
    }
    if (!this.isPasswordStrong(this.newPassword)) {
      this.passError = 'Debe tener mayúscula, número y carácter especial (@$!%*?&).';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passError = 'Las contraseñas no coinciden.';
      return;
    }
    this.passError = '';
  }

  private isPasswordStrong(pass: string): boolean {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(pass);
  }

  /* ══════════════════════════════
     GUARDAR (paso 1 — pedir código)
  ══════════════════════════════ */

  get formularioValido(): boolean {
    this.validarEmail();
    this.validarTelefono();
    this.validarPass();
    return !this.emailError && !this.phoneError && !this.passError;
  }

  requestSave(): void {
    // Marcar todos como tocados para mostrar errores
    this.emailTocado = true;
    this.phoneTocado = true;
    this.passTocado  = true;

    this.validarEmail();
    this.validarTelefono();
    this.validarPass();

    if (this.emailError || this.phoneError || this.passError) {
      this.errorMessage = 'Corrige los errores antes de continuar.';
      return;
    }

    this.clearMessages();

    this.pendingEmail       = this.email.trim();
    this.pendingPhone       = this.phone.trim();
    this.pendingNewPassword = this.newPassword;

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
      newPassword: this.pendingNewPassword || undefined
    }).subscribe({
      next: () => {
        localStorage.setItem('email', this.pendingEmail);
        this.userName = this.pendingEmail;

        this.verifyingCode   = false;
        this.showVerifyModal = false;
        this.newPassword     = '';
        this.confirmPassword = '';
        this.passError       = '';
        this.successMessage  = '¡Perfil actualizado correctamente!';
        setTimeout(() => this.successMessage = '', 4000);
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
    this.successMessage = '';
    this.errorMessage   = '';
  }
}
