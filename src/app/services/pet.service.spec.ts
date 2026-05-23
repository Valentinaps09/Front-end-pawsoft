import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PetService, Pet } from './pet.service';
import { environment } from '../../environments/environment';

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
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('getMyPets', () => {
    it('should get my pets successfully', () => {
      const mockResponse: Pet[] = [
        {
          id: 1,
          name: 'Rocky',
          species: 'Perro',
          breed: 'Labrador',
          birthDate: '2020-01-01',
          sex: 'Macho',
          photoUrl: 'https://example.com/rocky.jpg',
          isDeceased: false,
          isHospitalized: false
        },
        {
          id: 2,
          name: 'Luna',
          species: 'Gato',
          breed: 'Siamés',
          birthDate: '2021-05-15',
          sex: 'Hembra',
          isDeceased: false,
          isHospitalized: false
        }
      ];

      service.getMyPets().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.length).toBe(2);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/pets`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
      req.flush(mockResponse);
    });
  });

  describe('createPet', () => {
    it('should create pet successfully', () => {
      const petData: Pet = {
        name: 'Max',
        species: 'Perro',
        breed: 'Golden Retriever',
        birthDate: '2022-03-10',
        sex: 'Macho'
      };

      const mockResponse: Pet = {
        id: 3,
        ...petData,
        isDeceased: false,
        isHospitalized: false
      };

      service.createPet(petData).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.id).toBe(3);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/pets`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(petData);
      req.flush(mockResponse);
    });
  });

  describe('updatePet', () => {
    it('should update pet successfully', () => {
      const petId = 1;
      const petData: Pet = {
        id: petId,
        name: 'Rocky Updated',
        species: 'Perro',
        breed: 'Labrador',
        birthDate: '2020-01-01',
        sex: 'Macho'
      };

      const mockResponse: Pet = {
        ...petData,
        isDeceased: false,
        isHospitalized: false
      };

      service.updatePet(petId, petData).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.name).toBe('Rocky Updated');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/pets/${petId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(petData);
      req.flush(mockResponse);
    });
  });

  describe('deletePet', () => {
    it('should delete pet successfully', () => {
      const petId = 1;

      service.deletePet(petId).subscribe(response => {
        expect(response).toBeFalsy();
      });

      const req = httpMock.expectOne(`${apiUrl}/api/cliente/pets/${petId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('uploadPhoto', () => {
    it('should upload photo to Cloudinary successfully', () => {
      const file = new File(['test'], 'pet-photo.jpg', { type: 'image/jpeg' });
      const mockResponse = {
        secure_url: 'https://res.cloudinary.com/test/image/upload/v123/pawsoft/pets/pet-photo.jpg'
      };

      service.uploadPhoto(file).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.secure_url).toContain('cloudinary');
      });

      const cloudName = environment.cloudinary.cloudName;
      const req = httpMock.expectOne(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.get('file')).toBe(file);
      req.flush(mockResponse);
    });
  });
});
