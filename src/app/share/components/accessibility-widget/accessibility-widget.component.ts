import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccessibilityService } from 'src/app/services/accessibility.service';

@Component({
  selector: 'app-accessibility-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './accessibility-widget.component.html',
  styleUrls: ['./accessibility-widget.component.scss']
})
export class AccessibilityWidgetComponent {
  
  isOpen = false;

  constructor(readonly accessibilityService: AccessibilityService) {}

  togglePanel(): void {
    this.isOpen = !this.isOpen;
  }

  closePanel(): void {
    this.isOpen = false;
  }
}
