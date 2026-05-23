import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ChatbotService } from './chatbot.service';
import { environment } from '../../environments/environment';
import { ChatMessage, ChatResponse, MedicalFormSuggestionRequest, MedicalFormSuggestionResponse } from '../pages/chat-bot/chatbot.model';

describe('ChatbotService', () => {
  let service: ChatbotService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ChatbotService]
    });
    service = TestBed.inject(ChatbotService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('sendMessage', () => {
    it('should send message successfully', () => {
      const message = '¿Cuáles son los síntomas de la gripe en perros?';
      const history: ChatMessage[] = [];
      const mockResponse: ChatResponse = {
        reply: 'Los síntomas de la gripe en perros incluyen...',
        success: true
      };

      service.sendMessage(message, history).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.success).toBe(true);
        expect(response.reply).toContain('síntomas');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/chat`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.message).toBe(message);
      expect(req.request.body.history).toEqual([]);
      req.flush(mockResponse);
    });

    it('should handle error when sending message', () => {
      const message = 'Test message';
      const history: ChatMessage[] = [];

      service.sendMessage(message, history).subscribe(response => {
        expect(response.success).toBe(false);
        expect(response.reply).toContain('no está disponible');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/chat`);
      req.error(new ProgressEvent('error'));
    });

    it('should send message with history', () => {
      const message = '¿Y qué tratamiento recomiendas?';
      const history: ChatMessage[] = [
        { role: 'user', text: '¿Cuáles son los síntomas de la gripe en perros?', timestamp: new Date() },
        { role: 'model', text: 'Los síntomas incluyen...', timestamp: new Date() }
      ];
      const mockResponse: ChatResponse = {
        reply: 'El tratamiento recomendado es...',
        success: true
      };

      service.sendMessage(message, history).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/chat`);
      expect(req.request.body.history.length).toBe(2);
      req.flush(mockResponse);
    });
  });

  describe('getMedicalFormSuggestions', () => {
    it('should get medical form suggestions successfully', () => {
      const request: MedicalFormSuggestionRequest = {
        symptoms: 'Tos, fiebre, decaimiento',
        animalType: 'Perro',
        age: '5 años',
        weight: '25kg',
        breed: 'Labrador',
        additionalInfo: 'Temperatura elevada, mucosas pálidas'
      };

      const mockResponse: MedicalFormSuggestionResponse = {
        suggestedDiagnosis: 'Infección respiratoria aguda',
        differentialDiagnoses: ['Bronquitis', 'Neumonía'],
        recommendedTreatment: 'Antibióticos y reposo',
        medications: ['Amoxicilina 500mg cada 12 horas por 7 días'],
        complementaryExams: ['Radiografía de tórax', 'Hemograma completo'],
        prognosis: 'Favorable con tratamiento adecuado',
        ownerRecommendations: ['Mantener al perro en reposo', 'Asegurar hidratación adecuada'],
        success: true
      };

      service.getMedicalFormSuggestions(request).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.success).toBe(true);
        expect(response.suggestedDiagnosis).toBe('Infección respiratoria aguda');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/medical-form-suggestions`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockResponse);
    });

    it('should handle error when getting medical suggestions', () => {
      const request: MedicalFormSuggestionRequest = {
        symptoms: 'Tos',
        animalType: 'Perro',
        age: '5 años',
        breed: 'Labrador',
        additionalInfo: 'Normal'
      };

      service.getMedicalFormSuggestions(request).subscribe(response => {
        expect(response.success).toBe(false);
        expect(response.errorMessage).toContain('no está disponible');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/medical-form-suggestions`);
      req.error(new ProgressEvent('error'));
    });
  });
});
