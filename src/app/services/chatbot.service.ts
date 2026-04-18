import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ChatMessage, ChatRequest, ChatResponse, MedicalFormSuggestionRequest, MedicalFormSuggestionResponse } from '../pages/chat-bot/chatbot.model';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private apiUrl = `${environment.apiUrl}/api/chatbot/chat`;
  private medicalSuggestionsUrl = `${environment.apiUrl}/api/chatbot/medical-form-suggestions`;

  constructor(private http: HttpClient) {}

  sendMessage(message: string, history: ChatMessage[]): Observable<ChatResponse> {
    const payload: ChatRequest = {
      message,
      history: history.map(m => ({ role: m.role, text: m.text }))
    };
    
    // El interceptor de token se encargará de agregar el Authorization header automáticamente
    return this.http.post<ChatResponse>(this.apiUrl, payload).pipe(
      catchError(error => {
        console.error('Chatbot error:', error);
        return of({
          reply: 'El servicio de chat no está disponible en este momento. Intenta más tarde.',
          success: false
        } as ChatResponse);
      })
    );
  }

  getMedicalFormSuggestions(request: MedicalFormSuggestionRequest): Observable<MedicalFormSuggestionResponse> {
    return this.http.post<MedicalFormSuggestionResponse>(this.medicalSuggestionsUrl, request).pipe(
      catchError(error => {
        console.error('Medical suggestions error:', error);
        return of({
          suggestedDiagnosis: 'Error obteniendo sugerencias médicas',
          differentialDiagnoses: [],
          recommendedTreatment: 'Servicio no disponible',
          medications: [],
          complementaryExams: [],
          prognosis: 'No disponible',
          ownerRecommendations: [],
          success: false,
          errorMessage: 'El servicio de sugerencias médicas no está disponible en este momento.'
        } as MedicalFormSuggestionResponse);
      })
    );
  }
}
