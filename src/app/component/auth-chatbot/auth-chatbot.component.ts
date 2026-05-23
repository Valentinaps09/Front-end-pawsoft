import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UiStateService } from '../../services/ui-state.service';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

@Component({
  selector: 'app-auth-chatbot',
  templateUrl: './auth-chatbot.component.html',
  styleUrls: ['./auth-chatbot.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AuthChatbotComponent implements OnInit {
  @Input() context: 'login' | 'register' | 'forgot-password' = 'login';

  isOpen = false;
  messages: ChatMessage[] = [];
  inputText = '';
  isLoading = false;
  accessibilityPanelOpen = false;

  private readonly SYSTEM_PROMPT = `Eres un asistente virtual de autenticación para Pawsoft, una aplicación de gestión veterinaria.

REGLAS ESTRICTAS:
1. SOLO puedes responder preguntas sobre:
   - Cómo iniciar sesión
   - Cómo registrarse
   - Cómo recuperar contraseña
   - Problemas con el código OTP/2FA
   - Verificación de correo electrónico
   - Problemas con reCAPTCHA

2. Si te preguntan sobre CUALQUIER otro tema (mascotas, citas, veterinarios, funcionalidades de la app, etc.), debes responder:
   "Lo siento, solo puedo ayudarte con preguntas sobre inicio de sesión, registro y recuperación de contraseña. Una vez que inicies sesión, tendrás acceso al chatbot principal que puede responder todas tus preguntas sobre Pawsoft."

3. Sé breve, claro y directo.
4. Usa un tono amigable pero profesional.
5. Si no sabes algo sobre autenticación, admítelo.

INFORMACIÓN ÚTIL:
- El sistema usa autenticación de dos factores (2FA) con código OTP enviado por correo
- Los usuarios deben verificar su correo después de registrarse
- El sistema usa reCAPTCHA para seguridad
- Hay roles: Cliente, Veterinario, Recepcionista, Admin`;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private uiStateService: UiStateService
  ) {
    this.uiStateService.accessibilityPanelOpen$.subscribe(isOpen => {
      this.accessibilityPanelOpen = isOpen;
      if (isOpen && this.isOpen) {
        // Opcional: cerrar el chat cuando se abre accesibilidad
        // this.isOpen = false;
      }
    });
  }

  ngOnInit() {
    console.log('[AUTH-CHATBOT] Inicializando con contexto:', this.context);
    // Mensaje inicial según contexto
    const mensajeInicial = this.getMensajeInicial();
    this.addBotMessage(mensajeInicial);
  }

  private getMensajeInicial(): string {
    switch (this.context) {
      case 'login':
        return '¡Hola! 👋 Soy tu asistente de autenticación. ¿Tienes problemas para iniciar sesión?';
      case 'register':
        return '¡Hola! 👋 Soy tu asistente de registro. ¿Necesitas ayuda para crear tu cuenta?';
      case 'forgot-password':
        return '¡Hola! 👋 Soy tu asistente de recuperación. ¿Necesitas ayuda para recuperar tu contraseña?';
      default:
        return '¡Hola! 👋 ¿En qué puedo ayudarte con la autenticación?';
    }
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  sendMessage() {
    const text = this.inputText.trim();
    if (!text || this.isLoading) return;

    this.messages.push({ role: 'user', text, timestamp: new Date() });
    this.inputText = '';
    this.isLoading = true;

    const history = this.messages.map(m => ({
      role: m.role === 'model' ? 'assistant' : m.role,
      content: m.text
    }));

    // Construir el body para Groq
    const body = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: this.SYSTEM_PROMPT },
        ...history.slice(-10), // Últimos 10 mensajes
        { role: 'user', content: text }
      ],
      max_tokens: 300,
      temperature: 0.7
    };

    // Llamar al endpoint público del backend
    this.http.post<any>(`${environment.apiUrl}/api/chatbot/public-chat`, body)
      .subscribe({
        next: (res) => {
          this.addBotMessage(res.reply);
          this.isLoading = false;
          this.scrollToBottom();
        },
        error: () => {
          this.addBotMessage('Lo siento, no pude conectarme. Intenta más tarde.');
          this.isLoading = false;
        }
      });
  }

  private addBotMessage(text: string) {
    this.messages.push({ role: 'model', text, timestamp: new Date() });
    this.scrollToBottom();
  }

  private scrollToBottom() {
    setTimeout(() => {
      const el = document.getElementById('auth-chat-messages');
      if (el) el.scrollTop = el.scrollHeight;
    }, 100);
  }

  handleKey(event: KeyboardEvent) {
    if (event.key === 'Enter') this.sendMessage();
  }

  formatMessage(text: string): SafeHtml {
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>')
      .replace(/^[-•]\s(.+)$/gm, '<li>$1</li>')
      .replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
