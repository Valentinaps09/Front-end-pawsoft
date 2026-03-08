import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-solo-escritorio',
  standalone: true,
  imports: [CommonModule, IonContent, IonButton],
  templateUrl: './solo-escritorio.component.html',
  styleUrls: ['./solo-escritorio.component.scss'],
})
export class SoloEscritorioComponent {
  constructor(private router: Router) {}

  volver(): void {
    this.router.navigate(['/login']);
  }
}
