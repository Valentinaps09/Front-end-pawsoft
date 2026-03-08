import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  keyOutline,
  eyeOutline,
  eyeOffOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { AuthService } from 'src/app/services/auth';

@Component({
  selector: 'app-change-password-first',
  templateUrl: './change-password-first.page.html',
  styleUrls: ['./change-password-first.page.scss'],
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
  ],
})
export class ChangePasswordFirstPage {
  private router      = inject(Router);
  private authService = inject(AuthService);

  nuevaPass     = '';
  confirmarPass = '';
  mostrarPass1  = false;
  mostrarPass2  = false;
  mostrarError  = false;
  mensajeError  = '';
  cambiado      = false;

  constructor() {
    addIcons({ keyOutline, eyeOutline, eyeOffOutline, alertCircleOutline, checkmarkCircleOutline });
  }

  get fuerzaPct(): string {
    const len = this.nuevaPass.length;
    if (len === 0) return '0%';
    if (len < 6)   return '25%';
    if (len < 8)   return '50%';
    const score = [
      /[A-Z]/.test(this.nuevaPass),
      /[0-9]/.test(this.nuevaPass),
      /[^A-Za-z0-9]/.test(this.nuevaPass)
    ].filter(Boolean).length;
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

  cambiarContrasena(): void {
    if (this.nuevaPass.length < 8) {
      this.setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (this.nuevaPass !== this.confirmarPass) {
      this.setError('Las contraseñas no coinciden.');
      return;
    }

    const email = localStorage.getItem('email') || '';

    this.authService.changePasswordFirst(email, this.nuevaPass).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        localStorage.removeItem('mustChangePassword');
        this.cambiado = true;
      },
      error: (err) => {
        this.setError(err?.error?.message || 'No se pudo cambiar la contraseña.');
      }
    });
  }

  irDashboard(): void {
    const rol = localStorage.getItem('rol');
    switch (rol) {
      case 'ROLE_ADMIN':        this.router.navigate(['/dashboard-admin']); break;
      case 'ROLE_VETERINARIO':  this.router.navigate(['/dashboard-vet']);   break;
      case 'ROLE_RECEPCIONISTA':this.router.navigate(['/dashboard-rec']);   break;
      default:                  this.router.navigate(['/login']);            break;
    }
  }

  private setError(msg: string): void {
    this.mensajeError = msg;
    this.mostrarError = true;
    setTimeout(() => (this.mostrarError = false), 3500);
  }
}
