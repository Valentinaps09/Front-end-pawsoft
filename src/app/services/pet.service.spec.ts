import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PetService } from './pet.service';
import { environment } from '../environments/environment';

describe('PetService', () => {
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
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('createPet', () => {
    it('should create pet successfully', () => {
      const petData = {
        name: 'Buddy',
        species: 'Dog',
        breed: 'Golden Retriever',
        age: 3,
        weight: 25.5,
        color: 'Golden'
      };

      const mockResponse = {
        id: '123',
        name: 'Buddy',
        species: 'Dog',
        breed: 'Golden Retriever',
        age: 3,
        weight: 25.5,
        color: 'Golden',
        owner: {
          id: '456',
          firstName: 'John',
          lastName: 'Doe'
        },
        isActive: true,
        createdAt: '2024-12-20T10:00:00Z'
      };

      service.createPet(petData).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.name).toBe('Buddy');
        expect(response.species).toBe('Dog');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/pets`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(petData);
      req.flush(mockResponse);
    });

    it('should handle pet creation error', () => {
      const petData = {
        name: 'Buddy',
        species: 'Dog',
        breed: 'Golden Retriever',
        age: 3,
        weight: 25.5,
        color: 'Golden'
      };

      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Invalid pet data' }
      };

      service.createPet(petData).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('Invalid pet data');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/pets`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('getPets', () => {
    it('should get pets successfully', () => {
      const mockResponse = {
        content: [
          {
            id: '1',
            name: 'Buddy',
            species: 'Dog',
            breed: 'Golden Retriever',
            age: 3,
            weight: 25.5,
            color: 'Golden',
            isActive: true
          },
          {
            id: '2',
            name: 'Whiskers',
            species: 'Cat',
            breed: 'Persian',
            age: 2,
            weight: 4.2,
            color: 'White',
            isActive: true
          }
        ],
        totalElements: 2,
        totalPages: 1,
        size: 10,
        number: 0
      };

      service.getPets(0, 10).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.content.length).toBe(2);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/pets?page=0&size=10`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle get pets error', () => {
      const mockError = {
        status: 500,
        statusText: 'Internal Server Error',
        error: { message: 'Database connection failed' }
      };

      service.getPets(0, 10).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/pets?page=0&size=10`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('getPetById', () => {
    it('should get pet by ID successfully', () => {
      const petId = '123';
      const mockResponse = {
        id: '123',
        name: 'Buddy',
        species: 'Dog',
        breed: 'Golden Retriever',
        age: 3,
        weight: 25.5,
        color: 'Golden',
        owner: {
          id: '456',
          firstName: 'John',
          lastName: 'Doe'
        },
        isActive: true,
        medicalHistory: [
          {
            id: '789',
            diagnosis: 'Healthy',
            treatment: 'Vaccination',
            date: '2024-11-20'
          }
        ]
      };

      service.getPetById(petId).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.id).toBe(petId);
        expect(response.name).toBe('Buddy');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/pets/${petId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle pet not found error', () => {
      const petId = 'nonexistent';
      const mockError = {
        status: 404,
        statusText: 'Not Found',
        error: { message: 'Pet not found' }
      };

      service.getPetById(petId).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
          expect(error.error.message).toBe('Pet not found');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/pets/${petId}`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('updatePet', () => {
    it('should update pet successfully', () => {
      const petId = '123';
      const updateData = {
        name: 'Updated Buddy',
        age: 4,
        weight: 26.0
      };

      const mockResponse = {
        id: '123',
        name: 'Updated Buddy',
        species: 'Dog',
        breed: 'Golden Retriever',
        age: 4,
        weight: 26.0,
        color: 'Golden',
        isActive: true,
        updatedAt: '2024-12-20T11:00:00Z'
      };

      service.updatePet(petId, updateData).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.name).toBe('Updated Buddy');
        expect(response.age).toBe(4);
        expect(response.weight).toBe(26.0);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/pets/${petId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);
      req.flush(mockResponse);
    });

    it('should handle update pet error', () => {
      const petId = '123';
      const updateData = {
        name: 'Updated Buddy'
      };

      const mockError = {
        status: 403,
        statusText: 'Forbidden',
        error: { message: 'Not authorized to update this pet' }
      };

      service.updatePet(petId, updateData).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(403);
          expect(error.error.message).toBe('Not authorized to update this pet');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/pets/${petId}`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('deletePet', () => {
    it('should delete pet successfully', () => {
      const petId = '123';
      const mockResponse = { message: 'Pet deleted successfully' };

      service.deletePet(petId).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/pets/${petId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });

    it('should handle delete pet error', () => {
      const petId = '123';
      const mockError = {
        status: 403,
        statusText: 'Forbidden',
        error: { message: 'Not authorized to delete this pet' }
      };

      service.deletePet(petId).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(403);
          expect(error.error.message).toBe('Not authorized to delete this pet');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/pets/${petId}`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('searchPets', () => {
    it('should search pets successfully', () => {
      const searchTerm = 'Buddy';
      const mockResponse = {
        content: [
          {
            id: '1',
            name: 'Buddy',
            species: 'Dog',
            breed: 'Golden Retriever',
            age: 3,
            weight: 25.5,
            color: 'Golden',
            isActive: true
          }
        ],
        totalElements: 1,
        totalPages: 1,
        size: 10,
        number: 0
      };

      service.searchPets(searchTerm, 0, 10).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.content.length).toBe(1);
        expect(response.content[0].name).toContain('Buddy');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/pets/search?q=${searchTerm}&page=0&size=10`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle search pets with no results', () => {
      const searchTerm = 'NonexistentPet';
      const mockResponse = {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 10,
        number: 0
      };

      service.searchPets(searchTerm, 0, 10).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.content.length).toBe(0);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/pets/search?q=${searchTerm}&page=0&size=10`);
      req.flush(mockResponse);
    });
  });

  describe('getPetsBySpecies', () => {
    it('should get pets by species successfully', () => {
      const species = 'Dog';
      const mockResponse = {
        content: [
          {
            id: '1',
            name: 'Buddy',
            species: 'Dog',
            breed: 'Golden Retriever',
            age: 3,
            weight: 25.5,
            color: 'Golden',
            isActive: true
          },
          {
            id: '2',
            name: 'Max',
            species: 'Dog',
            breed: 'Labrador',
            age: 2,
            weight: 30.0,
            color: 'Black',
            isActive: true
          }
        ],
        totalElements: 2,
        totalPages: 1,
        size: 10,
        number: 0
      };

      service.getPetsBySpecies(species, 0, 10).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.content.length).toBe(2);
        expect(response.content.every(pet => pet.species === species)).toBe(true);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/pets/species/${species}?page=0&size=10`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getPetsByOwner', () => {
    it('should get pets by owner successfully', () => {
      const ownerId = '456';
      const mockResponse = {
        content: [
          {
            id: '1',
            name: 'Buddy',
            species: 'Dog',
            breed: 'Golden Retriever',
            age: 3,
            weight: 25.5,
            color: 'Golden',
            isActive: true,
            owner: {
              id: '456',
              firstName: 'John',
              lastName: 'Doe'
            }
          }
        ],
        totalElements: 1,
        totalPages: 1,
        size: 10,
        number: 0
      };

      service.getPetsByOwner(ownerId, 0, 10).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.content.length).toBe(1);
        expect(response.content[0].owner.id).toBe(ownerId);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/pets/owner/${ownerId}?page=0&size=10`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getPetMedicalHistory', () => {
    it('should get pet medical history successfully', () => {
      const petId = '123';
      const mockResponse = {
        content: [
          {
            id: '1',
            diagnosis: 'Healthy',
            treatment: 'Annual vaccination',
            medications: 'Rabies vaccine',
            notes: 'Pet is in good health',
            recordDate: '2024-11-20',
            veterinarian: {
              id: '789',
              firstName: 'Dr. Smith',
              lastName: 'Johnson'
            }
          },
          {
            id: '2',
            diagnosis: 'Minor ear infection',
            treatment: 'Antibiotic drops',
            medications: 'Otomax',
            notes: 'Follow up in 2 weeks',
            recordDate: '2024-10-15',
            veterinarian: {
              id: '789',
              firstName: 'Dr. Smith',
              lastName: 'Johnson'
            }
          }
        ],
        totalElements: 2,
        totalPages: 1,
        size: 10,
        number: 0
      };

      service.getPetMedicalHistory(petId, 0, 10).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.content.length).toBe(2);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/pets/${petId}/medical-history?page=0&size=10`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('uploadPetPhoto', () => {
    it('should upload pet photo successfully', () => {
      const petId = '123';
      const file = new File(['test'], 'pet-photo.jpg', { type: 'image/jpeg' });
      const mockResponse = {
        message: 'Photo uploaded successfully',
        photoUrl: 'https://example.com/photos/pet-123.jpg'
      };

      service.uploadPetPhoto(petId, file).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.photoUrl).toContain('pet-123.jpg');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/pets/${petId}/photo`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush(mockResponse);
    });

    it('should handle photo upload error', () => {
      const petId = '123';
      const file = new File(['test'], 'pet-photo.jpg', { type: 'image/jpeg' });
      const mockError = {
        status: 413,
        statusText: 'Payload Too Large',
        error: { message: 'File size too large' }
      };

      service.uploadPetPhoto(petId, file).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(413);
          expect(error.error.message).toBe('File size too large');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/pets/${petId}/photo`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('getPetStatistics', () => {
    it('should get pet statistics successfully', () => {
      const mockResponse = {
        total: 250,
        dogs: 150,
        cats: 80,
        birds: 15,
        others: 5,
        averageAge: 4.2,
        byBreed: {
          'Golden Retriever': 25,
          'Persian Cat': 20,
          'Labrador': 30
        }
      };

      service.getPetStatistics().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.total).toBe(250);
        expect(response.dogs).toBe(150);
        expect(response.cats).toBe(80);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/pets/statistics`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getPetsByAgeRange', () => {
    it('should get pets by age range successfully', () => {
      const minAge = 2;
      const maxAge = 5;
      const mockResponse = {
        content: [
          {
            id: '1',
            name: 'Buddy',
            species: 'Dog',
            age: 3,
            isActive: true
          },
          {
            id: '2',
            name: 'Whiskers',
            species: 'Cat',
            age: 4,
            isActive: true
          }
        ],
        totalElements: 2,
        totalPages: 1,
        size: 10,
        number: 0
      };

      service.getPetsByAgeRange(minAge, maxAge, 0, 10).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.content.length).toBe(2);
        expect(response.content.every(pet => pet.age >= minAge && pet.age <= maxAge)).toBe(true);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/pets/age-range?minAge=${minAge}&maxAge=${maxAge}&page=0&size=10`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });
});