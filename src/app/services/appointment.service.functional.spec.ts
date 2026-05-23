import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AppointmentService, AppointmentRequest, AppointmentResponse, RecepAppointmentResponse } from './appointment.service';
import { environment } from '../../environments/environment';

describe('AppointmentService - Pruebas Funcionales (FE-APT-01 a FE-APT-18)', () => {
  let service: AppointmentService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AppointmentService]
    });

    service = TestBed.inject(AppointmentService);
    httpMock = TestBed.inject(HttpTestingController);
    
    // Mock localStorage token
    localStorage.setItem('token', 'mock-jwt-token');
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-APT-01: Crear cita exitosamente
  // ═══════════════════════════════════════════════════════════════
  describe('FE-APT-01: Crear cita exitosamente', () => {
    it('debe crear una cita exitosamente', () => {
      const appointmentData: AppointmentRequest = {
        petId: 1,
        date: '2024-12-25',
        time: '10:00',
        reason: 'Consulta general',
        vetId: 1
      };

      const mockResponse: AppointmentResponse = {
        id: '123',
        petName: 'Luna',
        petEmoji: '🐕',
        dateFormatted: '25 de Diciembre, 2024',
        time: '10:00',
        reason: 'Consulta general',
        vetName: 'Dr. García',
        status: 'upcoming'
      };

      service.createAppointment(appointmentData).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.status).toBe('upcoming');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/appointments`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(appointmentData);
      expect(req.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token');
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-APT-02: Obtener citas del cliente
  // ═══════════════════════════════════════════════════════════════
  describe('FE-APT-02: Obtener citas del cliente', () => {
    it('debe obtener lista de citas del cliente', () => {
      const mockResponse: AppointmentResponse[] = [
        {
          id: '1',
          petName: 'Luna',
          petEmoji: '🐕',
          dateFormatted: '25 de Diciembre, 2024',
          time: '10:00',
          reason: 'Consulta general',
          vetName: 'Dr. García',
          status: 'upcoming'
        },
        {
          id: '2',
          petName: 'Max',
          petEmoji: '🐱',
          dateFormatted: '26 de Diciembre, 2024',
          time: '14:00',
          reason: 'Vacunación',
          vetName: 'Dra. López',
          status: 'confirmed'
        }
      ];

      service.getMyAppointments().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.length).toBe(2);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/appointments`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token');
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-APT-03: Obtener todas las citas del cliente
  // ═══════════════════════════════════════════════════════════════
  describe('FE-APT-03: Obtener todas las citas del cliente', () => {
    it('debe obtener historial completo de citas', () => {
      const mockResponse: AppointmentResponse[] = [
        {
          id: '1',
          petName: 'Luna',
          time: '10:00',
          reason: 'Consulta general',
          vetName: 'Dr. García',
          status: 'completed'
        },
        {
          id: '2',
          petName: 'Max',
          time: '14:00',
          reason: 'Vacunación',
          vetName: 'Dra. López',
          status: 'upcoming'
        }
      ];

      service.getAllMyAppointments().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.length).toBe(2);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/appointments/all`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-APT-04: Cancelar cita
  // ═══════════════════════════════════════════════════════════════
  describe('FE-APT-04: Cancelar cita', () => {
    it('debe cancelar una cita exitosamente', () => {
      const appointmentId = '123';

      service.cancelAppointment(appointmentId).subscribe(response => {
        expect(response).toBeFalsy(); // void response
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/appointments/${appointmentId}/cancel`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token');
      req.flush(null);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-APT-05: Obtener slots ocupados para cliente
  // ═══════════════════════════════════════════════════════════════
  describe('FE-APT-05: Obtener slots ocupados para cliente', () => {
    it('debe obtener horarios ocupados de un veterinario', () => {
      const vetId = 1;
      const date = '2024-12-25';
      const mockResponse = ['09:00', '10:00', '15:00'];

      service.getOccupiedSlots(vetId, date).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.length).toBe(3);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/appointments/slots?vetId=${vetId}&date=${date}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-APT-06: Obtener slots ocupados para recepcionista
  // ═══════════════════════════════════════════════════════════════
  describe('FE-APT-06: Obtener slots ocupados para recepcionista', () => {
    it('debe obtener horarios ocupados desde endpoint de recepcionista', () => {
      const vetId = 1;
      const date = '2024-12-25';
      const mockResponse = ['09:00', '11:00', '16:00'];

      service.getOccupiedSlotsRecep(vetId, date).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.length).toBe(3);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/recepcionista/appointments/slots?vetId=${vetId}&date=${date}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-APT-07: Obtener citas del veterinario
  // ═══════════════════════════════════════════════════════════════
  describe('FE-APT-07: Obtener citas del veterinario', () => {
    it('debe obtener citas asignadas al veterinario', () => {
      const mockResponse: RecepAppointmentResponse[] = [
        {
          id: 1,
          date: '2024-12-25',
          time: '10:00',
          reason: 'Consulta general',
          status: 'CONFIRMED',
          cancelReason: null,
          clientId: 1,
          clientName: 'Juan Pérez',
          clientEmail: 'juan@test.com',
          petId: 1,
          petName: 'Luna',
          petSpecies: 'Perro',
          petPhotoUrl: null,
          petBreed: 'Golden Retriever',
          petBirthday: '2020-05-15',
          vetId: 1,
          vetName: 'Dr. García',
          vetPhotoUrl: null,
          notes: null
        }
      ];

      service.getVetAppointments().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.length).toBe(1);
        expect(response[0].status).toBe('CONFIRMED');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/vet/appointments`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-APT-08: Obtener citas de hoy del veterinario
  // ═══════════════════════════════════════════════════════════════
  describe('FE-APT-08: Obtener citas de hoy del veterinario', () => {
    it('debe obtener citas del día actual', () => {
      const mockResponse: RecepAppointmentResponse[] = [
        {
          id: 1,
          date: new Date().toISOString().split('T')[0],
          time: '10:00',
          reason: 'Consulta general',
          status: 'CONFIRMED',
          cancelReason: null,
          clientId: 1,
          clientName: 'Juan Pérez',
          clientEmail: 'juan@test.com',
          petId: 1,
          petName: 'Luna',
          petSpecies: 'Perro',
          petPhotoUrl: null,
          petBreed: 'Golden Retriever',
          petBirthday: '2020-05-15',
          vetId: 1,
          vetName: 'Dr. García',
          vetPhotoUrl: null,
          notes: null
        }
      ];

      service.getTodayAppointments().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.length).toBe(1);
        expect(response[0].date).toBe(new Date().toISOString().split('T')[0]);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/vet/appointments/today`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-APT-09: Iniciar atención de cita
  // ═══════════════════════════════════════════════════════════════
  describe('FE-APT-09: Iniciar atención de cita', () => {
    it('debe iniciar atención de una cita', () => {
      const appointmentId = 1;

      service.startAppointment(appointmentId).subscribe(response => {
        expect(response).toBeFalsy(); // void response
      });

      const req = httpMock.expectOne(`${apiUrl}/api/vet/appointments/${appointmentId}/start`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(null);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-APT-10: Cancelar atención iniciada
  // ═══════════════════════════════════════════════════════════════
  describe('FE-APT-10: Cancelar atención iniciada', () => {
    it('debe cancelar una atención ya iniciada', () => {
      const appointmentId = 1;

      service.cancelStartedAppointment(appointmentId).subscribe(response => {
        expect(response).toBeFalsy(); // void response
      });

      const req = httpMock.expectOne(`${apiUrl}/api/vet/appointments/${appointmentId}/cancel-start`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(null);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-APT-11: Completar cita
  // ═══════════════════════════════════════════════════════════════
  describe('FE-APT-11: Completar cita', () => {
    it('debe marcar una cita como completada', () => {
      const appointmentId = 1;

      service.completeAppointment(appointmentId).subscribe(response => {
        expect(response).toBeFalsy(); // void response
      });

      const req = httpMock.expectOne(`${apiUrl}/api/vet/appointments/${appointmentId}/complete`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(null);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-APT-12: Limpiar citas en progreso
  // ═══════════════════════════════════════════════════════════════
  describe('FE-APT-12: Limpiar citas en progreso', () => {
    it('debe limpiar citas que quedaron en progreso', () => {
      service.cleanupInProgressAppointments().subscribe(response => {
        expect(response).toBeFalsy(); // void response
      });

      const req = httpMock.expectOne(`${apiUrl}/api/vet/appointments/cleanup/in-progress`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(null);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-APT-13: Error al crear cita - horario ocupado
  // ═══════════════════════════════════════════════════════════════
  describe('FE-APT-13: Error al crear cita - horario ocupado', () => {
    it('debe manejar error cuando el horario está ocupado', () => {
      const appointmentData: AppointmentRequest = {
        petId: 1,
        date: '2024-12-25',
        time: '10:00',
        reason: 'Consulta general',
        vetId: 1
      };

      const mockError = {
        status: 409,
        statusText: 'Conflict',
        error: { message: 'El horario seleccionado ya está ocupado' }
      };

      service.createAppointment(appointmentData).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(409);
          expect(error.error.message).toBe('El horario seleccionado ya está ocupado');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/appointments`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-APT-14: Error al crear cita - mascota no encontrada
  // ═══════════════════════════════════════════════════════════════
  describe('FE-APT-14: Error al crear cita - mascota no encontrada', () => {
    it('debe manejar error cuando la mascota no existe', () => {
      const appointmentData: AppointmentRequest = {
        petId: 999,
        date: '2024-12-25',
        time: '10:00',
        reason: 'Consulta general',
        vetId: 1
      };

      const mockError = {
        status: 404,
        statusText: 'Not Found',
        error: { message: 'Mascota no encontrada' }
      };

      service.createAppointment(appointmentData).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(404);
          expect(error.error.message).toBe('Mascota no encontrada');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/appointments`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-APT-15: Error al cancelar cita - cita no encontrada
  // ═══════════════════════════════════════════════════════════════
  describe('FE-APT-15: Error al cancelar cita - cita no encontrada', () => {
    it('debe manejar error cuando la cita no existe', () => {
      const appointmentId = '999';

      const mockError = {
        status: 404,
        statusText: 'Not Found',
        error: { message: 'Cita no encontrada' }
      };

      service.cancelAppointment(appointmentId).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(404);
          expect(error.error.message).toBe('Cita no encontrada');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/appointments/${appointmentId}/cancel`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-APT-16: Error al iniciar atención - cita ya iniciada
  // ═══════════════════════════════════════════════════════════════
  describe('FE-APT-16: Error al iniciar atención - cita ya iniciada', () => {
    it('debe manejar error cuando la cita ya está en progreso', () => {
      const appointmentId = 1;

      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'La cita ya está en progreso' }
      };

      service.startAppointment(appointmentId).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('La cita ya está en progreso');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/vet/appointments/${appointmentId}/start`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-APT-17: Validación de fecha pasada
  // ═══════════════════════════════════════════════════════════════
  describe('FE-APT-17: Validación de fecha pasada', () => {
    it('debe rechazar citas en fechas pasadas', () => {
      const appointmentData: AppointmentRequest = {
        petId: 1,
        date: '2020-01-01',
        time: '10:00',
        reason: 'Consulta general',
        vetId: 1
      };

      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'No se pueden agendar citas en fechas pasadas' }
      };

      service.createAppointment(appointmentData).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('No se pueden agendar citas en fechas pasadas');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/appointments`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-APT-18: Autorización requerida
  // ═══════════════════════════════════════════════════════════════
  describe('FE-APT-18: Autorización requerida', () => {
    it('debe requerir token de autorización válido', () => {
      localStorage.removeItem('token');

      const appointmentData: AppointmentRequest = {
        petId: 1,
        date: '2024-12-25',
        time: '10:00',
        reason: 'Consulta general',
        vetId: 1
      };

      service.createAppointment(appointmentData).subscribe(response => {
        // La petición se hace sin token
        expect(response).toBeDefined();
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/appointments`);
      expect(req.request.headers.get('Authorization')).toBe('Bearer ');
      req.flush({});
    });
  });
});