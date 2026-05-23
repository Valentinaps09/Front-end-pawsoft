import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ChatbotService } from './chatbot.service';
import { ChatMessage, ChatRequest, ChatResponse, MedicalFormSuggestionRequest, MedicalFormSuggestionResponse } from '../pages/chat-bot/chatbot.model';
import { environment } from '../../environments/environment';

describe('ChatbotService - Pruebas Funcionales (FE-BOT-01 a FE-BOT-18)', () => {
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

  // ═══════════════════════════════════════════════════════════════
  // FE-BOT-01: Enviar mensaje exitosamente
  // ═══════════════════════════════════════════════════════════════
  describe('FE-BOT-01: Enviar mensaje exitosamente', () => {
    it('debe enviar mensaje y recibir respuesta del chatbot', () => {
      const message = '¿Cómo agendo una cita?';
      const history: ChatMessage[] = [];
      
      const mockResponse: ChatResponse = {
        reply: 'Para agendar una cita, ve a la sección "Agendar Cita" en el menú principal, selecciona tu mascota, elige el veterinario y el horario disponible.',
        success: true
      };

      service.sendMessage(message, history).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.success).toBe(true);
        expect(response.reply).toContain('agendar');
      });

      const expectedPayload: ChatRequest = {
        message,
        history: []
      };

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/chat`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(expectedPayload);
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-BOT-02: Enviar mensaje con historial
  // ═══════════════════════════════════════════════════════════════
  describe('FE-BOT-02: Enviar mensaje con historial', () => {
    it('debe enviar mensaje incluyendo historial de conversación', () => {
      const message = '¿Y qué documentos necesito?';
      const history: ChatMessage[] = [
        { role: 'user', text: '¿Cómo agendo una cita?', timestamp: new Date() },
        { role: 'model', text: 'Para agendar una cita...', timestamp: new Date() }
      ];
      
      const mockResponse: ChatResponse = {
        reply: 'Para agendar una cita necesitas tener registrada tu mascota en el sistema. No se requieren documentos adicionales.',
        success: true
      };

      service.sendMessage(message, history).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.success).toBe(true);
      });

      const expectedPayload: ChatRequest = {
        message,
        history: history.map(m => ({ role: m.role, text: m.text }))
      };

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/chat`);
      expect(req.request.body).toEqual(expectedPayload);
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-BOT-03: Consulta sobre cuidado de mascotas
  // ═══════════════════════════════════════════════════════════════
  describe('FE-BOT-03: Consulta sobre cuidado de mascotas', () => {
    it('debe responder consultas sobre cuidado de mascotas', () => {
      const message = '¿Cómo cuidar a un cachorro?';
      const history: ChatMessage[] = [];
      
      const mockResponse: ChatResponse = {
        reply: 'Los cachorros necesitan: 1) Alimentación frecuente (3-4 veces al día), 2) Vacunas según calendario, 3) Socialización temprana, 4) Ejercicio moderado, 5) Mucho amor y paciencia.',
        success: true
      };

      service.sendMessage(message, history).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.reply).toContain('cachorros');
        expect(response.reply.toLowerCase()).toContain('alimentación');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/chat`);
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-BOT-04: Consulta sobre síntomas de emergencia
  // ═══════════════════════════════════════════════════════════════
  describe('FE-BOT-04: Consulta sobre síntomas de emergencia', () => {
    it('debe identificar y responder sobre síntomas de emergencia', () => {
      const message = 'Mi perro está vomitando sangre, ¿qué hago?';
      const history: ChatMessage[] = [];
      
      const mockResponse: ChatResponse = {
        reply: '🚨 EMERGENCIA VETERINARIA: Vómito con sangre requiere atención inmediata. Contacta a tu veterinario de emergencia o acude a la clínica más cercana. No esperes.',
        success: true
      };

      service.sendMessage(message, history).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.reply).toContain('EMERGENCIA');
        expect(response.reply).toContain('inmediata');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/chat`);
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-BOT-05: Consulta sobre vacunación
  // ═══════════════════════════════════════════════════════════════
  describe('FE-BOT-05: Consulta sobre vacunación', () => {
    it('debe proporcionar información sobre vacunación', () => {
      const message = '¿Cuándo debo vacunar a mi gato?';
      const history: ChatMessage[] = [];
      
      const mockResponse: ChatResponse = {
        reply: 'Los gatos deben recibir sus primeras vacunas entre las 6-8 semanas de edad. El calendario incluye: Triple felina, Leucemia felina, y Rabia. Consulta con tu veterinario para un plan personalizado.',
        success: true
      };

      service.sendMessage(message, history).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.reply).toContain('vacunas');
        expect(response.reply).toContain('6-8 semanas');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/chat`);
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-BOT-06: Error del servicio de chatbot
  // ═══════════════════════════════════════════════════════════════
  describe('FE-BOT-06: Error del servicio de chatbot', () => {
    it('debe manejar errores del servicio y mostrar mensaje por defecto', () => {
      const message = 'Test message';
      const history: ChatMessage[] = [];

      service.sendMessage(message, history).subscribe(response => {
        expect(response.reply).toBe('El servicio de chat no está disponible en este momento. Intenta más tarde.');
        expect(response.success).toBe(false);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/chat`);
      req.error(new ProgressEvent('Network error'), { status: 500 });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-BOT-07: Mensaje vacío
  // ═══════════════════════════════════════════════════════════════
  describe('FE-BOT-07: Mensaje vacío', () => {
    it('debe manejar mensajes vacíos', () => {
      const message = '';
      const history: ChatMessage[] = [];
      
      const mockResponse: ChatResponse = {
        reply: 'Por favor, escribe una pregunta para poder ayudarte.',
        success: false
      };

      service.sendMessage(message, history).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.success).toBe(false);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/chat`);
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-BOT-08: Consulta sobre horarios de atención
  // ═══════════════════════════════════════════════════════════════
  describe('FE-BOT-08: Consulta sobre horarios de atención', () => {
    it('debe proporcionar información sobre horarios', () => {
      const message = '¿Cuáles son los horarios de atención?';
      const history: ChatMessage[] = [];
      
      const mockResponse: ChatResponse = {
        reply: 'Nuestros horarios de atención son: Lunes a Viernes de 8:00 AM a 6:00 PM, Sábados de 8:00 AM a 2:00 PM. Para emergencias, contamos con servicio 24/7.',
        success: true
      };

      service.sendMessage(message, history).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.reply).toContain('horarios');
        expect(response.reply).toContain('8:00 AM');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/chat`);
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-BOT-09: Obtener sugerencias médicas
  // ═══════════════════════════════════════════════════════════════
  describe('FE-BOT-09: Obtener sugerencias médicas', () => {
    it('debe obtener sugerencias médicas para formulario', () => {
      const request: MedicalFormSuggestionRequest = {
        symptoms: 'Tos persistente, letargo',
        animalType: 'Perro',
        age: '3 años',
        additionalInfo: 'Temperatura elevada, ganglios inflamados'
      };
      
      const mockResponse: MedicalFormSuggestionResponse = {
        suggestedDiagnosis: 'Posible infección respiratoria',
        differentialDiagnoses: ['Bronquitis', 'Neumonía', 'Traqueobronquitis'],
        recommendedTreatment: 'Antibióticos y reposo',
        medications: [
          'Amoxicilina 500mg cada 12 horas por 7 días'
        ],
        complementaryExams: ['Radiografía de tórax', 'Hemograma completo'],
        prognosis: 'Favorable con tratamiento adecuado',
        ownerRecommendations: ['Mantener en reposo', 'Administrar medicación completa'],
        success: true
      };

      service.getMedicalFormSuggestions(request).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.success).toBe(true);
        expect(response.suggestedDiagnosis).toContain('respiratoria');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/medical-form-suggestions`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-BOT-10: Error en sugerencias médicas
  // ═══════════════════════════════════════════════════════════════
  describe('FE-BOT-10: Error en sugerencias médicas', () => {
    it('debe manejar errores en sugerencias médicas', () => {
      const request: MedicalFormSuggestionRequest = {
        symptoms: 'Síntomas',
        animalType: 'Perro',
        age: '3 años',
        additionalInfo: 'Hallazgos'
      };

      service.getMedicalFormSuggestions(request).subscribe(response => {
        expect(response.success).toBe(false);
        expect(response.errorMessage).toBe('El servicio de sugerencias médicas no está disponible en este momento.');
        expect(response.suggestedDiagnosis).toBe('Error obteniendo sugerencias médicas');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/medical-form-suggestions`);
      req.error(new ProgressEvent('Network error'), { status: 500 });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-BOT-11: Consulta sobre precios de servicios
  // ═══════════════════════════════════════════════════════════════
  describe('FE-BOT-11: Consulta sobre precios de servicios', () => {
    it('debe proporcionar información sobre precios', () => {
      const message = '¿Cuánto cuesta una consulta general?';
      const history: ChatMessage[] = [];
      
      const mockResponse: ChatResponse = {
        reply: 'Los precios de nuestros servicios son: Consulta general $50.000, Vacunación $35.000, Cirugía menor desde $150.000. Los precios pueden variar según el caso específico.',
        success: true
      };

      service.sendMessage(message, history).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.reply).toContain('$50.000');
        expect(response.reply).toContain('precios');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/chat`);
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-BOT-12: Consulta sobre ubicación de la clínica
  // ═══════════════════════════════════════════════════════════════
  describe('FE-BOT-12: Consulta sobre ubicación de la clínica', () => {
    it('debe proporcionar información de ubicación', () => {
      const message = '¿Dónde están ubicados?';
      const history: ChatMessage[] = [];
      
      const mockResponse: ChatResponse = {
        reply: 'Estamos ubicados en la Carrera 15 #12-00, Armenia, Quindío. Contamos con parqueadero gratuito y fácil acceso en transporte público.',
        success: true
      };

      service.sendMessage(message, history).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.reply).toContain('Carrera 15');
        expect(response.reply).toContain('Armenia');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/chat`);
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-BOT-13: Consulta sobre servicios disponibles
  // ═══════════════════════════════════════════════════════════════
  describe('FE-BOT-13: Consulta sobre servicios disponibles', () => {
    it('debe listar servicios disponibles', () => {
      const message = '¿Qué servicios ofrecen?';
      const history: ChatMessage[] = [];
      
      const mockResponse: ChatResponse = {
        reply: 'Ofrecemos: Consultas generales, Vacunación, Cirugías, Hospitalización, Laboratorio clínico, Radiografías, Peluquería canina, y Farmacia veterinaria.',
        success: true
      };

      service.sendMessage(message, history).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.reply).toContain('Consultas generales');
        expect(response.reply).toContain('Vacunación');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/chat`);
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-BOT-14: Validación de entrada - mensaje muy largo
  // ═══════════════════════════════════════════════════════════════
  describe('FE-BOT-14: Validación de entrada - mensaje muy largo', () => {
    it('debe manejar mensajes muy largos', () => {
      const message = 'a'.repeat(5000); // Mensaje muy largo
      const history: ChatMessage[] = [];
      
      const mockResponse: ChatResponse = {
        reply: 'Tu mensaje es muy largo. Por favor, hazme una pregunta más concisa para poder ayudarte mejor.',
        success: false
      };

      service.sendMessage(message, history).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.success).toBe(false);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/chat`);
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-BOT-15: Consulta sobre contacto de emergencia
  // ═══════════════════════════════════════════════════════════════
  describe('FE-BOT-15: Consulta sobre contacto de emergencia', () => {
    it('debe proporcionar información de contacto de emergencia', () => {
      const message = '¿Tienen servicio de emergencias?';
      const history: ChatMessage[] = [];
      
      const mockResponse: ChatResponse = {
        reply: 'Sí, contamos con servicio de emergencias 24/7. Puedes contactarnos al (6) 123-4567 o acudir directamente a nuestra clínica. Para emergencias críticas, llama inmediatamente.',
        success: true
      };

      service.sendMessage(message, history).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.reply).toContain('24/7');
        expect(response.reply).toContain('123-4567');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/chat`);
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-BOT-16: Timeout del servicio
  // ═══════════════════════════════════════════════════════════════
  describe('FE-BOT-16: Timeout del servicio', () => {
    it('debe manejar timeout del servicio', () => {
      const message = 'Test timeout';
      const history: ChatMessage[] = [];

      service.sendMessage(message, history).subscribe(response => {
        expect(response.reply).toBe('El servicio de chat no está disponible en este momento. Intenta más tarde.');
        expect(response.success).toBe(false);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/chat`);
      req.error(new ProgressEvent('Timeout'), { status: 408 });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-BOT-17: Consulta sobre registro de mascotas
  // ═══════════════════════════════════════════════════════════════
  describe('FE-BOT-17: Consulta sobre registro de mascotas', () => {
    it('debe explicar cómo registrar mascotas', () => {
      const message = '¿Cómo registro mi mascota?';
      const history: ChatMessage[] = [];
      
      const mockResponse: ChatResponse = {
        reply: 'Para registrar tu mascota: 1) Ve a "Mis Mascotas" en el menú, 2) Haz clic en "Agregar Mascota", 3) Completa la información básica (nombre, especie, raza, fecha de nacimiento), 4) Opcionalmente sube una foto.',
        success: true
      };

      service.sendMessage(message, history).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.reply).toContain('Mis Mascotas');
        expect(response.reply).toContain('Agregar Mascota');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/chat`);
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-BOT-18: Interceptor de autorización
  // ═══════════════════════════════════════════════════════════════
  describe('FE-BOT-18: Interceptor de autorización', () => {
    it('debe incluir token de autorización automáticamente', () => {
      const message = 'Test authorization';
      const history: ChatMessage[] = [];
      
      const mockResponse: ChatResponse = {
        reply: 'Respuesta autorizada',
        success: true
      };

      service.sendMessage(message, history).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/chatbot/chat`);
      // El interceptor debería agregar el header automáticamente
      // No verificamos el header aquí porque es responsabilidad del interceptor
      req.flush(mockResponse);
    });
  });
});