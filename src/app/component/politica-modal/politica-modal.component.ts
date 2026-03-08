import { Component, Input, Output, EventEmitter, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import {IonButton, IonIcon} from "@ionic/angular/standalone";

@Component({
  selector: 'app-politica-modal',
  templateUrl: './politica-modal.component.html',
  styleUrls: ['./politica-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PoliticaModalComponent {
  @Input()  isVisible = false;
  @Output() closed    = new EventEmitter<void>();
  @Output() aceptado  = new EventEmitter<void>();

  constructor() {
    addIcons({ closeOutline });
  }

  cerrar(): void {
    this.closed.emit();
  }

  aceptarYCerrar(): void {
    this.aceptado.emit();
    this.closed.emit();
  }
}
