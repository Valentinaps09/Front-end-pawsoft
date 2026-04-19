import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ChatbotService } from './chatbot.service';
import { environment } from '../environments/environment';

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
      const mockResponse = {
        message: 'Los síntomas de la gripe en perros incluyen fiebre, tos, letargo y pérdida de apetito. Es importante consultar con un veterinario para un diagnóstico adecuado.',
        status: 'success',
        timestamp: '2024-12-20T10:00:00Z'
      };

      service.sendMessage(message).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.status).toBe('success');
        expect(response.message).toContain('síntomas');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/message`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ message });
      req.flush(mockResponse);
    });

    it('should handle chatbot error response', () => {
      const message = 'Test message';
      const mockError = {
        status: 500,
        statusText: 'Internal Server Error',
        error: { message: 'Chatbot service unavailable' }
      };

      service.sendMessage(message).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(error.error.message).toBe('Chatbot service unavailable');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/message`);
      req.flush(mockError.error, mockError);
    });

    it('should handle empty message', () => {
      const message = '';
      const mockResponse = {
        message: 'Por favor, escribe una pregunta para poder ayudarte.',
        status: 'error',
        timestamp: '2024-12-20T10:00:00Z'
      };

      service.sendMessage(message).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.status).toBe('error');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/message`);
      req.flush(mockResponse);
    });
  });

  describe('getChatHistory', () => {
    it('should get chat history successfully', () => {
      const mockResponse = {
        content: [
          {
            id: '1',
            userMessage: '¿Cómo cuidar a un cachorro?',
            botResponse: 'Los cachorros necesitan alimentación frecuente, vacunas, socialización y mucho amor.',
            timestamp: '2024-12-20T09:00:00Z',
            status: 'success'
          },
          {
            id: '2',
            userMessage: '¿Cuándo vacunar a mi perro?',
            botResponse: 'Las vacunas para perros deben comenzar entre las 6-8 semanas de edad. Consulta con tu veterinario.',
            timestamp: '2024-12-20T09:30:00Z',
            status: 'success'
          }
        ],
        totalElements: 2,
        totalPages: 1,
        size: 10,
        number: 0
      };

      service.getChatHistory(0, 10).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.content.length).toBe(2);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/history?page=0&size=10`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle chat history error', () => {
      const mockError = {
        status: 403,
        statusText: 'Forbidden',
        error: { message: 'Access denied' }
      };

      service.getChatHistory(0, 10).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(403);
          expect(error.error.message).toBe('Access denied');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/history?page=0&size=10`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('clearChatHistory', () => {
    it('should clear chat history successfully', () => {
      const mockResponse = { message: 'Chat history cleared successfully' };

      service.clearChatHistory().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/history`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });

    it('should handle clear history error', () => {
      const mockError = {
        status: 500,
        statusText: 'Internal Server Error',
        error: { message: 'Failed to clear history' }
      };

      service.clearChatHistory().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(error.error.message).toBe('Failed to clear history');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/history`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('getFeedback', () => {
    it('should submit feedback successfully', () => {
      const messageId = '123';
      const feedback = {
        rating: 5,
        comment: 'Very helpful response'
      };
      const mockResponse = { message: 'Feedback submitted successfully' };

      service.submitFeedback(messageId, feedback).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/feedback/${messageId}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(feedback);
      req.flush(mockResponse);
    });

    it('should handle feedback submission error', () => {
      const messageId = '123';
      const feedback = {
        rating: 5,
        comment: 'Very helpful response'
      };
      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Invalid feedback data' }
      };

      service.submitFeedback(messageId, feedback).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('Invalid feedback data');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/feedback/${messageId}`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('getSuggestedQuestions', () => {
    it('should get suggested questions successfully', () => {
      const mockResponse = [
        '¿Cómo cuidar a un cachorro?',
        '¿Cuándo vacunar a mi perro?',
        '¿Qué hacer si mi gato no come?',
        '¿Cómo agendar una cita?',
        '¿Cuáles son los síntomas de emergencia?'
      ];

      service.getSuggestedQuestions().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.length).toBe(5);
        expect(response[0]).toContain('cachorro');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/suggested-questions`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle suggested questions error', () => {
      const mockError = {
        status: 500,
        statusText: 'Internal Server Error',
        error: { message: 'Failed to load suggestions' }
      };

      service.getSuggestedQuestions().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(error.error.message).toBe('Failed to load suggestions');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/suggested-questions`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('reportMessage', () => {
    it('should report message successfully', () => {
      const messageId = '123';
      const reason = 'inappropriate_content';
      const mockResponse = { message: 'Message reported successfully' };

      service.reportMessage(messageId, reason).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/report/${messageId}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ reason });
      req.flush(mockResponse);
    });

    it('should handle report message error', () => {
      const messageId = '123';
      const reason = 'inappropriate_content';
      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Invalid report reason' }
      };

      service.reportMessage(messageId, reason).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('Invalid report reason');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/report/${messageId}`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('getChatbotStatus', () => {
    it('should get chatbot status successfully', () => {
      const mockResponse = {
        status: 'online',
        version: '1.0.0',
        lastUpdated: '2024-12-20T08:00:00Z',
        responseTime: 250,
        availability: 99.9
      };

      service.getChatbotStatus().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.status).toBe('online');
        expect(response.responseTime).toBe(250);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/status`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle chatbot status error', () => {
      const mockError = {
        status: 503,
        statusText: 'Service Unavailable',
        error: { message: 'Chatbot service is down' }
      };

      service.getChatbotStatus().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(503);
          expect(error.error.message).toBe('Chatbot service is down');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/status`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('searchChatHistory', () => {
    it('should search chat history successfully', () => {
      const searchTerm = 'vacuna';
      const mockResponse = {
        content: [
          {
            id: '1',
            userMessage: '¿Cuándo vacunar a mi perro?',
            botResponse: 'Las vacunas para perros deben comenzar entre las 6-8 semanas de edad.',
            timestamp: '2024-12-20T09:30:00Z',
            status: 'success'
          }
        ],
        totalElements: 1,
        totalPages: 1,
        size: 10,
        number: 0
      };

      service.searchChatHistory(searchTerm, 0, 10).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.content.length).toBe(1);
        expect(response.content[0].userMessage).toContain('vacunar');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/history/search?q=${searchTerm}&page=0&size=10`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle search with no results', () => {
      const searchTerm = 'nonexistent';
      const mockResponse = {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 10,
        number: 0
      };

      service.searchChatHistory(searchTerm, 0, 10).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.content.length).toBe(0);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/history/search?q=${searchTerm}&page=0&size=10`);
      req.flush(mockResponse);
    });
  });

  describe('getChatStatistics', () => {
    it('should get chat statistics successfully', () => {
      const mockResponse = {
        totalMessages: 1250,
        successfulResponses: 1180,
        errorResponses: 70,
        averageResponseTime: 320,
        topQuestions: [
          { question: '¿Cómo cuidar a un cachorro?', count: 45 },
          { question: '¿Cuándo vacunar?', count: 38 },
          { question: '¿Qué hacer en emergencia?', count: 32 }
        ],
        userSatisfaction: 4.2
      };

      service.getChatStatistics().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.totalMessages).toBe(1250);
        expect(response.userSatisfaction).toBe(4.2);
        expect(response.topQuestions.length).toBe(3);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/statistics`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });
});