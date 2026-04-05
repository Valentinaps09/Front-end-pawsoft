import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import { AuthService } from 'src/app/services/auth';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.page.html',
  styleUrls: ['./verify-email.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
})
export class VerifyEmailPage implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  verificando = true;
  verificado = false;
  mensajeError = '';
  token: string | null = null;

  constructor() {
    addIcons({
      checkmarkCircleOutline,
      alertCircleOutline,
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.token = params['token'] || null;

      if (!this.token) {
        this.verificando = false;
        this.mensajeError = 'Token inválido o expirado.';
        return;
      }

      // Llamar al backend para verificar el email
      this.authService.verifyEmail(this.token).subscribe({
        next: () => {
          this.verificando = false;
          this.verificado = true;
        },
        error: (err) => {
          console.error('Error verificando email:', err);
          this.verificando = false;
          this.mensajeError = err.error?.message || 'No se pudo verificar el correo. El token puede haber expirado.';
        },
      });
    });
  }

  irLogin() {
    this.router.navigate(['/login']);
  }

  cerrarVentana() {
    window.close();
  }
}
