import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AppointmentService } from './appointment.service';
import { environment } from '../environments/environment';

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
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('createAppointment', () => {
    it('should create appointment successfully', () => {
      const appointmentData = {
        petId: '123',
        appointmentDate: '2024-12-25T10:00:00',
        reason: 'Regular checkup',
        notes: 'Annual vaccination'
      };

      const mockResponse = {
        id: '456',
        petId: '123',
        appointmentDate: '2024-12-25T10:00:00',
        reason: 'Regular checkup',
        notes: 'Annual vaccination',
        status: 'SCHEDULED',
        veterinarian: {
          id: '789',
          firstName: 'Dr. Smith',
          lastName: 'Johnson'
        }
      };

      service.createAppointment(appointmentData).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/appointments`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(appointmentData);
      req.flush(mockResponse);
    });

    it('should handle appointment creation error', () => {
      const appointmentData = {
        petId: '123',
        appointmentDate: '2024-12-25T10:00:00',
        reason: 'Regular checkup',
        notes: 'Annual vaccination'
      };

      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'No veterinarian available at this time' }
      };

      service.createAppointment(appointmentData).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('No veterinarian available at this time');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/appointments`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('getAppointments', () => {
    it('should get appointments successfully', () => {
      const mockResponse = {
        content: [
          {
            id: '1',
            petId: '123',
            appointmentDate: '2024-12-25T10:00:00',
            reason: 'Regular checkup',
            status: 'SCHEDULED'
          },
          {
            id: '2',
            petId: '124',
            appointmentDate: '2024-12-26T14:00:00',
            reason: 'Vaccination',
            status: 'COMPLETED'
          }
        ],
        totalElements: 2,
        totalPages: 1,
        size: 10,
        number: 0
      };

      service.getAppointments(0, 10).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.content.length).toBe(2);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/appointments?page=0&size=10`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle get appointments error', () => {
      const mockError = {
        status: 500,
        statusText: 'Internal Server Error',
        error: { message: 'Database connection failed' }
      };

      service.getAppointments(0, 10).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/appointments?page=0&size=10`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('getAppointmentById', () => {
    it('should get appointment by ID successfully', () => {
      const appointmentId = '123';
      const mockResponse = {
        id: '123',
        petId: '456',
        appointmentDate: '2024-12-25T10:00:00',
        reason: 'Regular checkup',
        status: 'SCHEDULED',
        veterinarian: {
          id: '789',
          firstName: 'Dr. Smith',
          lastName: 'Johnson'
        },
        pet: {
          id: '456',
          name: 'Buddy',
          species: 'Dog'
        }
      };

      service.getAppointmentById(appointmentId).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.id).toBe(appointmentId);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/appointments/${appointmentId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle appointment not found error', () => {
      const appointmentId = 'nonexistent';
      const mockError = {
        status: 404,
        statusText: 'Not Found',
        error: { message: 'Appointment not found' }
      };

      service.getAppointmentById(appointmentId).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
          expect(error.error.message).toBe('Appointment not found');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/appointments/${appointmentId}`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('updateAppointment', () => {
    it('should update appointment successfully', () => {
      const appointmentId = '123';
      const updateData = {
        reason: 'Updated reason',
        notes: 'Updated notes'
      };

      const mockResponse = {
        id: '123',
        petId: '456',
        appointmentDate: '2024-12-25T10:00:00',
        reason: 'Updated reason',
        notes: 'Updated notes',
        status: 'SCHEDULED'
      };

      service.updateAppointment(appointmentId, updateData).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.reason).toBe('Updated reason');
        expect(response.notes).toBe('Updated notes');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/appointments/${appointmentId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);
      req.flush(mockResponse);
    });

    it('should handle update appointment error', () => {
      const appointmentId = '123';
      const updateData = {
        reason: 'Updated reason'
      };

      const mockError = {
        status: 403,
        statusText: 'Forbidden',
        error: { message: 'Not authorized to update this appointment' }
      };

      service.updateAppointment(appointmentId, updateData).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(403);
          expect(error.error.message).toBe('Not authorized to update this appointment');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/appointments/${appointmentId}`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel appointment successfully', () => {
      const appointmentId = '123';
      const mockResponse = { message: 'Appointment cancelled successfully' };

      service.cancelAppointment(appointmentId).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/appointments/${appointmentId}/cancel`);
      expect(req.request.method).toBe('PUT');
      req.flush(mockResponse);
    });

    it('should handle cancel appointment error', () => {
      const appointmentId = '123';
      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Appointment is already cancelled' }
      };

      service.cancelAppointment(appointmentId).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('Appointment is already cancelled');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/appointments/${appointmentId}/cancel`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('getAvailableSlots', () => {
    it('should get available slots successfully', () => {
      const date = '2024-12-25';
      const mockResponse = [
        { time: '09:00', available: true },
        { time: '10:00', available: true },
        { time: '11:00', available: false },
        { time: '14:00', available: true }
      ];

      service.getAvailableSlots(date).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.length).toBe(4);
        expect(response.filter(slot => slot.available).length).toBe(3);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/appointments/available-slots?date=${date}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle get available slots error', () => {
      const date = '2024-12-25';
      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Invalid date format' }
      };

      service.getAvailableSlots(date).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('Invalid date format');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/appointments/available-slots?date=${date}`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('getAppointmentsByStatus', () => {
    it('should get appointments by status successfully', () => {
      const status = 'SCHEDULED';
      const mockResponse = {
        content: [
          {
            id: '1',
            petId: '123',
            appointmentDate: '2024-12-25T10:00:00',
            reason: 'Regular checkup',
            status: 'SCHEDULED'
          }
        ],
        totalElements: 1,
        totalPages: 1,
        size: 10,
        number: 0
      };

      service.getAppointmentsByStatus(status, 0, 10).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.content[0].status).toBe(status);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/appointments/status/${status}?page=0&size=10`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getUpcomingAppointments', () => {
    it('should get upcoming appointments successfully', () => {
      const mockResponse = [
        {
          id: '1',
          petId: '123',
          appointmentDate: '2024-12-25T10:00:00',
          reason: 'Regular checkup',
          status: 'SCHEDULED'
        },
        {
          id: '2',
          petId: '124',
          appointmentDate: '2024-12-26T14:00:00',
          reason: 'Vaccination',
          status: 'SCHEDULED'
        }
      ];

      service.getUpcomingAppointments().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.length).toBe(2);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/appointments/upcoming`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('rescheduleAppointment', () => {
    it('should reschedule appointment successfully', () => {
      const appointmentId = '123';
      const newDateTime = '2024-12-27T15:00:00';
      const mockResponse = {
        id: '123',
        petId: '456',
        appointmentDate: '2024-12-27T15:00:00',
        reason: 'Regular checkup',
        status: 'SCHEDULED'
      };

      service.rescheduleAppointment(appointmentId, newDateTime).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.appointmentDate).toBe(newDateTime);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/appointments/${appointmentId}/reschedule`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ newDateTime });
      req.flush(mockResponse);
    });

    it('should handle reschedule appointment error', () => {
      const appointmentId = '123';
      const newDateTime = '2024-12-27T15:00:00';
      const mockError = {
        status: 409,
        statusText: 'Conflict',
        error: { message: 'Time slot is not available' }
      };

      service.rescheduleAppointment(appointmentId, newDateTime).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(409);
          expect(error.error.message).toBe('Time slot is not available');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/appointments/${appointmentId}/reschedule`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('getAppointmentHistory', () => {
    it('should get appointment history successfully', () => {
      const petId = '123';
      const mockResponse = {
        content: [
          {
            id: '1',
            petId: '123',
            appointmentDate: '2024-11-25T10:00:00',
            reason: 'Regular checkup',
            status: 'COMPLETED'
          },
          {
            id: '2',
            petId: '123',
            appointmentDate: '2024-10-25T14:00:00',
            reason: 'Vaccination',
            status: 'COMPLETED'
          }
        ],
        totalElements: 2,
        totalPages: 1,
        size: 10,
        number: 0
      };

      service.getAppointmentHistory(petId, 0, 10).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.content.length).toBe(2);
        expect(response.content.every(apt => apt.petId === petId)).toBe(true);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/appointments/history/${petId}?page=0&size=10`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getAppointmentStatistics', () => {
    it('should get appointment statistics successfully', () => {
      const mockResponse = {
        total: 150,
        scheduled: 25,
        completed: 120,
        cancelled: 5,
        today: 8,
        thisWeek: 35,
        thisMonth: 140
      };

      service.getAppointmentStatistics().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.total).toBe(150);
        expect(response.scheduled).toBe(25);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/appointments/statistics`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });
});