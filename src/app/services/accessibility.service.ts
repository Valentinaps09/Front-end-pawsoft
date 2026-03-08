import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type Theme = 'light' | 'dark';
export type FontSize = 'normal' | 'large' | 'xlarge';
export type Language = 'es' | 'en';
export type ContrastLevel = 'normal' | 'medium' | 'high';

@Injectable({ providedIn: 'root' })
export class AccessibilityService {

  private readonly KEY = 'pawsoft-accessibility';

  private prefs = {
    theme: 'light' as Theme,
    fontSize: 'normal' as FontSize,
    language: 'es' as Language,
    disableInterruptions: false,
    voiceEnabled: false,
    contrastLevel: 'normal' as ContrastLevel,
    underlineLinks: true
  };

  constructor(private translate: TranslateService) {
    // Carga preferencias del localStorage
    this.cargarPreferencias();

    // Detecta preferencias del sistema
    this.detectarPreferenciasSistema();

    // Aplica tema y fuente desde las preferencias
    this.aplicarTodo();

    // Inicializa ngx-translate con el idioma guardado
    this.translate.setDefaultLang(this.prefs.language);
    this.translate.use(this.prefs.language);
  }

  /* ---------------------- SETTERS ---------------------- */

  setTheme(theme: Theme): void {
    this.prefs.theme = theme;
    this.guardar();
    this.aplicarTema();
  }

  setFontSize(size: FontSize): void {
    this.prefs.fontSize = size;
    this.guardar();
    this.aplicarFuente();
  }

  setLanguage(lang: Language): void {
    this.prefs.language = lang;
    this.guardar();
    this.translate.use(lang);
  }

  setReduceMotion(enabled: boolean): void {
    this.prefs.disableInterruptions = enabled;
    this.guardar();
    this.aplicarDisableInterruptions();
  }

  setDisableInterruptions(enabled: boolean): void {
    this.prefs.disableInterruptions = enabled;
    this.guardar();
    this.aplicarDisableInterruptions();
  }

  setVoiceEnabled(enabled: boolean): void {
    this.prefs.voiceEnabled = enabled;
    this.guardar();
  }

  setHighContrast(enabled: boolean): void {
    this.prefs.contrastLevel = enabled ? 'high' : 'normal';
    this.guardar();
    this.aplicarContraste();
  }

  setContrastLevel(level: ContrastLevel): void {
    this.prefs.contrastLevel = level;
    this.guardar();
    this.aplicarContraste();
  }

  setUnderlineLinks(enabled: boolean): void {
    this.prefs.underlineLinks = enabled;
    this.guardar();
    this.aplicarUnderlineLinks();
  }

  // Método para leer texto en voz alta
  speak(text: string): void {
    if (!this.prefs.voiceEnabled) return;
    
    if ('speechSynthesis' in window) {
      // Cancela cualquier lectura en curso
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.prefs.language === 'es' ? 'es-ES' : 'en-US';
      utterance.rate = 1;
      utterance.pitch = 1;
      
      window.speechSynthesis.speak(utterance);
    }
  }

  // Método para detener la lectura
  stopSpeaking(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /* ---------------------- GETTERS ---------------------- */

  getTheme(): Theme { return this.prefs.theme; }
  getFontSize(): FontSize { return this.prefs.fontSize; }
  getLanguage(): Language { return this.prefs.language; }
  getReduceMotion(): boolean { return this.prefs.disableInterruptions; }
  getDisableInterruptions(): boolean { return this.prefs.disableInterruptions; }
  getVoiceEnabled(): boolean { return this.prefs.voiceEnabled; }
  getHighContrast(): boolean { return this.prefs.contrastLevel !== 'normal'; }
  getContrastLevel(): ContrastLevel { return this.prefs.contrastLevel; }
  getUnderlineLinks(): boolean { return this.prefs.underlineLinks; }

  /* ---------------------- PRIVADOS ---------------------- */

  private detectarPreferenciasSistema(): void {
    // Detectar preferencia de tema oscuro del sistema
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      if (!localStorage.getItem(this.KEY)) {
        this.prefs.theme = 'dark';
      }
    }

    // Detectar preferencia de movimiento reducido del sistema
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.prefs.disableInterruptions = true;
    }

    // Detectar preferencia de alto contraste del sistema
    if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
      this.prefs.contrastLevel = 'high';
    }
  }

  private aplicarTodo(): void {
    this.aplicarTema();
    this.aplicarFuente();
    this.aplicarDisableInterruptions();
    this.aplicarContraste();
    this.aplicarUnderlineLinks();
  }

  private aplicarTema(): void {
    const body = document.body;
    body.classList.remove('theme-light', 'theme-dark');
    body.classList.add(`theme-${this.prefs.theme}`);
  }

  private aplicarFuente(): void {
    const body = document.body;
    body.classList.remove('font-normal', 'font-large', 'font-xlarge');
    body.classList.add(`font-${this.prefs.fontSize}`);
  }

  private aplicarReduceMotion(): void {
    const body = document.body;
    if (this.prefs.disableInterruptions) {
      body.classList.add('disable-interruptions');
    } else {
      body.classList.remove('disable-interruptions');
    }
  }

  private aplicarDisableInterruptions(): void {
    const body = document.body;
    if (this.prefs.disableInterruptions) {
      body.classList.add('disable-interruptions');
    } else {
      body.classList.remove('disable-interruptions');
    }
  }

  private aplicarContraste(): void {
    const body = document.body;
    body.classList.remove('contrast-normal', 'contrast-medium', 'contrast-high');
    body.classList.add(`contrast-${this.prefs.contrastLevel}`);
  }

  private aplicarUnderlineLinks(): void {
    const body = document.body;
    if (this.prefs.underlineLinks) {
      body.classList.add('underline-links');
    } else {
      body.classList.remove('underline-links');
    }
  }

  private guardar(): void {
    localStorage.setItem(this.KEY, JSON.stringify(this.prefs));
  }

  private cargarPreferencias(): void {
    const saved = localStorage.getItem(this.KEY);
    if (saved) {
      this.prefs = { ...this.prefs, ...JSON.parse(saved) };
    }
  }
}
