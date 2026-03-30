import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ChatbotService } from '../../services/chatbot.service';
import { ChatMessage } from '../../pages/chat-bot/chatbot.model';

@Component({
  selector: 'app-chatbot-fab',
  templateUrl: './chatbot-fab.component.html',
  styleUrls: ['./chatbot-fab.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ChatbotFabComponent {
  isOpen = false;
  messages: ChatMessage[] = [];
  inputText = '';
  isLoading = false;

  constructor(private chatbotService: ChatbotService, private sanitizer: DomSanitizer) {}

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.messages.length === 0) {
      this.addBotMessage('¡Hola! 👋 Soy tu asistente virtual. ¿En qué puedo ayudarte?');
    }
  }

  sendMessage() {
    const text = this.inputText.trim();
    if (!text || this.isLoading) return;

    this.messages.push({ role: 'user', text, timestamp: new Date() });
    this.inputText = '';
    this.isLoading = true;

    const history = this.messages.slice(0, -1);

    this.chatbotService.sendMessage(text, history).subscribe({
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
      const el = document.getElementById('chat-messages');
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
