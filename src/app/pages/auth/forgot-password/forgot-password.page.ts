import {Component, inject} from '@angular/core';
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
  lockClosedOutline,
  mailOutline,
  alertCircleOutline,
  arrowBackOutline,
} from 'ionicons/icons';
import {AuthService} from "../../../services/auth";

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
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
export class ForgotPasswordPage {

  private router = inject(Router);
  private authService = inject(AuthService);

  correo       = '';
  enviado      = false;
  mostrarError = false;

  constructor() {
    addIcons({ lockClosedOutline, mailOutline, alertCircleOutline, arrowBackOutline });
  }

  ionViewWillEnter() {
    this.correo       = '';
    this.enviado      = false;
    this.mostrarError = false;
  }

  continuar() {
    const email = this.correo?.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) {
      this.mostrarError = true;
      setTimeout(() => (this.mostrarError = false), 3000);
      return;
    }

    this.authService.requestPasswordReset(email).subscribe({
      next: () => {
        this.enviado = true;
      },
      error: () => {
        this.enviado = true;
      }
    });
  }

  volverLogin() {
    this.router.navigate(['/login']);
  }
}
