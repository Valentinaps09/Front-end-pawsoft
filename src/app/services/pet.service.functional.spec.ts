import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PetService, Pet } from './pet.service';
import { environment } from '../../environments/environment';

describe('PetService - Pruebas Funcionales (FE-PET-01 a FE-PET-19)', () => {
  let service: PetService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PetService]
    });

    service = TestBed.inject(PetService);
    httpMock = TestBed.inject(HttpTestingController);
    
    // Mock localStorage token
    localStorage.setItem('token', 'mock-jwt-token');
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-PET-01: Crear mascota exitosamente
  // ═══════════════════════════════════════════════════════════════
  describe('FE-PET-01: Crear mascota exitosamente', () => {
    it('debe crear una mascota exitosamente', () => {
      const petData: Pet = {
        name: 'Luna',
        species: 'Perro',
        breed: 'Golden Retriever',
        birthDate: '2020-05-15',
        sex: 'Hembra'
      };

      const mockResponse: Pet = {
        id: 1,
        name: 'Luna',
        species: 'Perro',
        breed: 'Golden Retriever',
        birthDate: '2020-05-15',
        sex: 'Hembra',
        ownerEmail: 'usuario@test.com',
        photoUrl: undefined,
        isDeceased: false,
        isHospitalized: false
      };

      service.createPet(petData).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.name).toBe('Luna');
        expect(response.species).toBe('Perro');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/pets`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(petData);
      expect(req.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token');
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-PET-02: Obtener mis mascotas
  // ═══════════════════════════════════════════════════════════════
  describe('FE-PET-02: Obtener mis mascotas', () => {
    it('debe obtener lista de mascotas del usuario', () => {
      const mockResponse: Pet[] = [
        {
          id: 1,
          name: 'Luna',
          species: 'Perro',
          breed: 'Golden Retriever',
          birthDate: '2020-05-15',
          sex: 'Hembra',
          ownerEmail: 'usuario@test.com',
          isDeceased: false,
          isHospitalized: false
        },
        {
          id: 2,
          name: 'Max',
          species: 'Gato',
          breed: 'Persa',
          birthDate: '2019-03-10',
          sex: 'Macho',
          ownerEmail: 'usuario@test.com',
          isDeceased: false,
          isHospitalized: false
        }
      ];

      service.getMyPets().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.length).toBe(2);
        expect(response[0].name).toBe('Luna');
        expect(response[1].name).toBe('Max');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/pets`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token');
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-PET-03: Actualizar mascota exitosamente
  // ═══════════════════════════════════════════════════════════════
  describe('FE-PET-03: Actualizar mascota exitosamente', () => {
    it('debe actualizar información de mascota', () => {
      const petId = 1;
      const updateData: Pet = {
        name: 'Luna Actualizada',
        species: 'Perro',
        breed: 'Golden Retriever',
        birthDate: '2020-05-15',
        sex: 'Hembra'
      };

      const mockResponse: Pet = {
        id: 1,
        name: 'Luna Actualizada',
        species: 'Perro',
        breed: 'Golden Retriever',
        birthDate: '2020-05-15',
        sex: 'Hembra',
        ownerEmail: 'usuario@test.com',
        isDeceased: false,
        isHospitalized: false
      };

      service.updatePet(petId, updateData).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.name).toBe('Luna Actualizada');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/pets/${petId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-PET-04: Eliminar mascota exitosamente
  // ═══════════════════════════════════════════════════════════════
  describe('FE-PET-04: Eliminar mascota exitosamente', () => {
    it('debe eliminar una mascota', () => {
      const petId = 1;

      service.deletePet(petId).subscribe(response => {
        expect(response).toBeFalsy(); // void response
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/pets/${petId}`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token');
      req.flush(null);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-PET-05: Subir foto de mascota exitosamente
  // ═══════════════════════════════════════════════════════════════
  describe('FE-PET-05: Subir foto de mascota exitosamente', () => {
    it('debe subir foto a Cloudinary', () => {
      const file = new File(['test'], 'pet-photo.jpg', { type: 'image/jpeg' });
      const mockResponse = {
        secure_url: 'https://res.cloudinary.com/pawsoft/image/upload/v123/pawsoft/pets/pet-photo.jpg'
      };

      service.uploadPhoto(file).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.secure_url).toContain('cloudinary.com');
      });

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${environment.cloudinary.cloudName}/image/upload`;
      const req = httpMock.expectOne(cloudinaryUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-PET-06: Validación de datos requeridos
  // ═══════════════════════════════════════════════════════════════
  describe('FE-PET-06: Validación de datos requeridos', () => {
    it('debe rechazar mascota sin nombre', () => {
      const petData: Pet = {
        name: '',
        species: 'Perro',
        breed: 'Golden Retriever',
        birthDate: '2020-05-15',
        sex: 'Hembra'
      };

      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'El nombre de la mascota es requerido' }
      };

      service.createPet(petData).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('El nombre de la mascota es requerido');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/pets`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-PET-07: Validación de especie válida
  // ═══════════════════════════════════════════════════════════════
  describe('FE-PET-07: Validación de especie válida', () => {
    it('debe rechazar especie inválida', () => {
      const petData: Pet = {
        name: 'Luna',
        species: 'Dinosaurio',
        breed: 'T-Rex',
        birthDate: '2020-05-15',
        sex: 'Hembra'
      };

      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Especie no válida' }
      };

      service.createPet(petData).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('Especie no válida');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/pets`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-PET-08: Validación de fecha de nacimiento
  // ═══════════════════════════════════════════════════════════════
  describe('FE-PET-08: Validación de fecha de nacimiento', () => {
    it('debe rechazar fecha de nacimiento futura', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const petData: Pet = {
        name: 'Luna',
        species: 'Perro',
        breed: 'Golden Retriever',
        birthDate: futureDate.toISOString().split('T')[0],
        sex: 'Hembra'
      };

      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'La fecha de nacimiento no puede ser futura' }
      };

      service.createPet(petData).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('La fecha de nacimiento no puede ser futura');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/pets`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-PET-09: Error al crear mascota - límite excedido
  // ═══════════════════════════════════════════════════════════════
  describe('FE-PET-09: Error al crear mascota - límite excedido', () => {
    it('debe rechazar cuando se excede el límite de mascotas', () => {
      const petData: Pet = {
        name: 'Luna',
        species: 'Perro',
        breed: 'Golden Retriever',
        birthDate: '2020-05-15',
        sex: 'Hembra'
      };

      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Has alcanzado el límite máximo de mascotas registradas' }
      };

      service.createPet(petData).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toContain('límite máximo');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/pets`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-PET-10: Error al actualizar mascota no encontrada
  // ═══════════════════════════════════════════════════════════════
  describe('FE-PET-10: Error al actualizar mascota no encontrada', () => {
    it('debe manejar error cuando la mascota no existe', () => {
      const petId = 999;
      const updateData: Pet = {
        name: 'Luna',
        species: 'Perro',
        breed: 'Golden Retriever',
        birthDate: '2020-05-15',
        sex: 'Hembra'
      };

      const mockError = {
        status: 404,
        statusText: 'Not Found',
        error: { message: 'Mascota no encontrada' }
      };

      service.updatePet(petId, updateData).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(404);
          expect(error.error.message).toBe('Mascota no encontrada');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/pets/${petId}`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-PET-11: Error al eliminar mascota con citas activas
  // ═══════════════════════════════════════════════════════════════
  describe('FE-PET-11: Error al eliminar mascota con citas activas', () => {
    it('debe rechazar eliminación de mascota con citas activas', () => {
      const petId = 1;

      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'No se puede eliminar una mascota con citas activas' }
      };

      service.deletePet(petId).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toContain('citas activas');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/pets/${petId}`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-PET-12: Error de autorización
  // ═══════════════════════════════════════════════════════════════
  describe('FE-PET-12: Error de autorización', () => {
    it('debe manejar error de autorización', () => {
      localStorage.removeItem('token');

      service.getMyPets().subscribe(response => {
        // La petición se hace sin token
        expect(response).toBeDefined();
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/pets`);
      expect(req.request.headers.get('Authorization')).toBe('Bearer ');
      req.flush([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-PET-13: Subir foto - archivo muy grande
  // ═══════════════════════════════════════════════════════════════
  describe('FE-PET-13: Subir foto - archivo muy grande', () => {
    it('debe rechazar archivo muy grande', () => {
      const file = new File(['x'.repeat(10000000)], 'large-photo.jpg', { type: 'image/jpeg' });
      
      const mockError = {
        status: 413,
        statusText: 'Payload Too Large',
        error: { message: 'El archivo es muy grande. Máximo 5MB permitido.' }
      };

      service.uploadPhoto(file).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(413);
          expect(error.error.message).toContain('muy grande');
        }
      });

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${environment.cloudinary.cloudName}/image/upload`;
      const req = httpMock.expectOne(cloudinaryUrl);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-PET-14: Subir foto - formato inválido
  // ═══════════════════════════════════════════════════════════════
  describe('FE-PET-14: Subir foto - formato inválido', () => {
    it('debe rechazar formato de archivo inválido', () => {
      const file = new File(['test'], 'document.pdf', { type: 'application/pdf' });
      
      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Formato de archivo no válido. Solo se permiten imágenes.' }
      };

      service.uploadPhoto(file).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toContain('Formato');
        }
      });

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${environment.cloudinary.cloudName}/image/upload`;
      const req = httpMock.expectOne(cloudinaryUrl);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-PET-15: Crear mascota con perfil médico inicial
  // ═══════════════════════════════════════════════════════════════
  describe('FE-PET-15: Crear mascota con perfil médico inicial', () => {
    it('debe crear mascota con perfil médico inicial', () => {
      const petData: Pet = {
        name: 'Luna',
        species: 'Perro',
        breed: 'Golden Retriever',
        birthDate: '2020-05-15',
        sex: 'Hembra',
        medicalProfileInitial: {
          bloodType: 'DEA 1.1+',
          knownAllergies: 'Ninguna conocida',
          chronicConditions: 'Ninguna',
          currentMedications: 'Ninguna',
          additionalNotes: 'Muy amigable'
        }
      };

      const mockResponse: Pet = {
        id: 1,
        name: 'Luna',
        species: 'Perro',
        breed: 'Golden Retriever',
        birthDate: '2020-05-15',
        sex: 'Hembra',
        ownerEmail: 'usuario@test.com',
        isDeceased: false,
        isHospitalized: false
      };

      service.createPet(petData).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.name).toBe('Luna');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/pets`);
      expect(req.request.body.medicalProfileInitial).toBeDefined();
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-PET-16: Validación de sexo válido
  // ═══════════════════════════════════════════════════════════════
  describe('FE-PET-16: Validación de sexo válido', () => {
    it('debe rechazar sexo inválido', () => {
      const petData: Pet = {
        name: 'Luna',
        species: 'Perro',
        breed: 'Golden Retriever',
        birthDate: '2020-05-15',
        sex: 'Indefinido'
      };

      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Sexo debe ser Macho o Hembra' }
      };

      service.createPet(petData).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toContain('Macho o Hembra');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/pets`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-PET-17: Mascota fallecida
  // ═══════════════════════════════════════════════════════════════
  describe('FE-PET-17: Mascota fallecida', () => {
    it('debe manejar mascota marcada como fallecida', () => {
      const mockResponse: Pet[] = [
        {
          id: 1,
          name: 'Luna',
          species: 'Perro',
          breed: 'Golden Retriever',
          birthDate: '2020-05-15',
          sex: 'Hembra',
          ownerEmail: 'usuario@test.com',
          isDeceased: true,
          isHospitalized: false
        }
      ];

      service.getMyPets().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response[0].isDeceased).toBe(true);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/pets`);
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-PET-18: Mascota hospitalizada
  // ═══════════════════════════════════════════════════════════════
  describe('FE-PET-18: Mascota hospitalizada', () => {
    it('debe manejar mascota marcada como hospitalizada', () => {
      const mockResponse: Pet[] = [
        {
          id: 1,
          name: 'Luna',
          species: 'Perro',
          breed: 'Golden Retriever',
          birthDate: '2020-05-15',
          sex: 'Hembra',
          ownerEmail: 'usuario@test.com',
          isDeceased: false,
          isHospitalized: true
        }
      ];

      service.getMyPets().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response[0].isHospitalized).toBe(true);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/pets`);
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-PET-19: Error de conexión de red
  // ═══════════════════════════════════════════════════════════════
  describe('FE-PET-19: Error de conexión de red', () => {
    it('debe manejar errores de conexión', () => {
      service.getMyPets().subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(0);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/pets`);
      req.error(new ProgressEvent('Network error'), { status: 0 });
    });
  });
});