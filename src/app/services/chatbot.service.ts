import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ChatMessage, ChatRequest, ChatResponse } from '../pages/chat-bot/chatbot.model';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private apiUrl = `${environment.apiUrl}/api/chatbot/chat`;

  constructor(private http: HttpClient) {}

  sendMessage(message: string, history: ChatMessage[]): Observable<ChatResponse> {
    const payload: ChatRequest = {
      message,
      history: history.map(m => ({ role: m.role, text: m.text }))
    };
    return this.http.post<ChatResponse>(this.apiUrl, payload);
  }
}
