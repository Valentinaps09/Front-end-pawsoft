import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AppointmentService, AppointmentRequest, AppointmentResponse, RecepAppointmentResponse } from './appointment.service';
import { environment } from '../../environments/environment';

describe('AppointmentService', () => {
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
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('getMyAppointments', () => {
    it('should get my appointments successfully', () => {
      const mockResponse: AppointmentResponse[] = [
        {
          id: '1',
          petName: 'Rocky',
          petEmoji: '🐕',
          time: '10:00',
          reason: 'Consulta general',
          vetName: 'Dr. Ana Perez',
          status: 'upcoming'
        }
      ];

      service.getMyAppointments().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.length).toBe(1);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/appointments`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
      req.flush(mockResponse);
    });
  });

  describe('getAllMyAppointments', () => {
    it('should get all my appointments successfully', () => {
      const mockResponse: AppointmentResponse[] = [
        {
          id: '1',
          petName: 'Rocky',
          time: '10:00',
          reason: 'Consulta general',
          vetName: 'Dr. Ana Perez',
          status: 'completed'
        },
        {
          id: '2',
          petName: 'Luna',
          time: '14:00',
          reason: 'Vacunación',
          vetName: 'Dr. Carlos Lopez',
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

  describe('createAppointment', () => {
    it('should create appointment successfully', () => {
      const appointmentData: AppointmentRequest = {
        petId: 1,
        date: '2026-05-15',
        time: '10:00',
        reason: 'Consulta general',
        vetId: 1
      };

      const mockResponse: AppointmentResponse = {
        id: '123',
        petName: 'Rocky',
        time: '10:00',
        reason: 'Consulta general',
        vetName: 'Dr. Ana Perez',
        status: 'upcoming'
      };

      service.createAppointment(appointmentData).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/appointments`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(appointmentData);
      req.flush(mockResponse);
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel appointment successfully', () => {
      const appointmentId = '123';

      service.cancelAppointment(appointmentId).subscribe(response => {
        expect(response).toBeFalsy();
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/appointments/${appointmentId}/cancel`);
      expect(req.request.method).toBe('PUT');
      req.flush(null);
    });
  });

  describe('getOccupiedSlots', () => {
    it('should get occupied slots successfully', () => {
      const vetId = 1;
      const date = '2026-05-15';
      const mockResponse = ['10:00', '11:00', '14:00'];

      service.getOccupiedSlots(vetId, date).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.length).toBe(3);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/appointments/slots?vetId=${vetId}&date=${date}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getOccupiedSlotsRecep', () => {
    it('should get occupied slots for receptionist successfully', () => {
      const vetId = 1;
      const date = '2026-05-15';
      const mockResponse = ['09:00', '10:00', '15:00'];

      service.getOccupiedSlotsRecep(vetId, date).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/recepcionista/appointments/slots?vetId=${vetId}&date=${date}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getVetAppointments', () => {
    it('should get vet appointments successfully', () => {
      const mockResponse: RecepAppointmentResponse[] = [
        {
          id: 1,
          date: '2026-05-15',
          time: '10:00',
          reason: 'Consulta general',
          status: 'CONFIRMED',
          cancelReason: null,
          clientId: 1,
          clientName: 'Juan Perez',
          clientEmail: 'juan@example.com',
          petId: 1,
          petName: 'Rocky',
          petSpecies: 'Perro',
          petPhotoUrl: null,
          petBreed: 'Labrador',
          petBirthday: '2020-01-01',
          vetId: 1,
          vetName: 'Dr. Ana Perez',
          vetPhotoUrl: null,
          notes: null
        }
      ];

      service.getVetAppointments().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/vet/appointments`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getTodayAppointments', () => {
    it('should get today appointments successfully', () => {
      const mockResponse: RecepAppointmentResponse[] = [
        {
          id: 1,
          date: '2026-05-14',
          time: '10:00',
          reason: 'Consulta general',
          status: 'CONFIRMED',
          cancelReason: null,
          clientId: 1,
          clientName: 'Juan Perez',
          clientEmail: 'juan@example.com',
          petId: 1,
          petName: 'Rocky',
          petSpecies: 'Perro',
          petPhotoUrl: null,
          petBreed: 'Labrador',
          petBirthday: '2020-01-01',
          vetId: 1,
          vetName: 'Dr. Ana Perez',
          vetPhotoUrl: null,
          notes: null
        }
      ];

      service.getTodayAppointments().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/vet/appointments/today`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('startAppointment', () => {
    it('should start appointment successfully', () => {
      const appointmentId = 1;

      service.startAppointment(appointmentId).subscribe(response => {
        expect(response).toBeFalsy();
      });

      const req = httpMock.expectOne(`${apiUrl}/api/vet/appointments/${appointmentId}/start`);
      expect(req.request.method).toBe('POST');
      req.flush(null);
    });
  });

  describe('cancelStartedAppointment', () => {
    it('should cancel started appointment successfully', () => {
      const appointmentId = 1;

      service.cancelStartedAppointment(appointmentId).subscribe(response => {
        expect(response).toBeFalsy();
      });

      const req = httpMock.expectOne(`${apiUrl}/api/vet/appointments/${appointmentId}/cancel-start`);
      expect(req.request.method).toBe('POST');
      req.flush(null);
    });
  });

  describe('completeAppointment', () => {
    it('should complete appointment successfully', () => {
      const appointmentId = 1;

      service.completeAppointment(appointmentId).subscribe(response => {
        expect(response).toBeFalsy();
      });

      const req = httpMock.expectOne(`${apiUrl}/api/vet/appointments/${appointmentId}/complete`);
      expect(req.request.method).toBe('POST');
      req.flush(null);
    });
  });

  describe('cleanupInProgressAppointments', () => {
    it('should cleanup in-progress appointments successfully', () => {
      service.cleanupInProgressAppointments().subscribe(response => {
        expect(response).toBeFalsy();
      });

      const req = httpMock.expectOne(`${apiUrl}/api/vet/appointments/cleanup/in-progress`);
      expect(req.request.method).toBe('POST');
      req.flush(null);
    });
  });
});
