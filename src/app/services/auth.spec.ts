import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('login', () => {
    it('should login successfully and store tokens', () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
        recaptchaToken: 'test-token'
      };

      const mockResponse = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        role: 'CLIENT',
        user: {
          id: '123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User'
        },
        twoFactorRequired: false
      };

      service.login(loginData).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(localStorage.getItem('accessToken')).toBe('mock-access-token');
        expect(localStorage.getItem('refreshToken')).toBe('mock-refresh-token');
        expect(localStorage.getItem('userRole')).toBe('CLIENT');
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(loginData);
      req.flush(mockResponse);
    });

    it('should handle 2FA required response', () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
        recaptchaToken: 'test-token'
      };

      const mockResponse = {
        twoFactorRequired: true,
        twoFactorToken: 'mock-2fa-token'
      };

      service.login(loginData).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(localStorage.getItem('refreshToken')).toBeNull();
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/login`);
      req.flush(mockResponse);
    });

    it('should handle login error', () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
        recaptchaToken: 'test-token'
      };

      const mockError = {
        status: 401,
        statusText: 'Unauthorized',
        error: { message: 'Invalid credentials' }
      };

      service.login(loginData).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(401);
          expect(error.error.message).toBe('Invalid credentials');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/login`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('register', () => {
    it('should register successfully', () => {
      const registerData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        phone: '1234567890',
        recaptchaToken: 'test-token'
      };

      const mockResponse = {
        message: 'User registered successfully',
        userId: '123'
      };

      service.register(registerData).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(registerData);
      req.flush(mockResponse);
    });

    it('should handle registration error', () => {
      const registerData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone: '1234567890',
        recaptchaToken: 'test-token'
      };

      const mockError = {
        status: 409,
        statusText: 'Conflict',
        error: { message: 'Email already exists' }
      };

      service.register(registerData).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(409);
          expect(error.error.message).toBe('Email already exists');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/register`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('verify2FA', () => {
    it('should verify 2FA successfully', () => {
      const verifyData = {
        twoFactorToken: 'mock-2fa-token',
        code: '123456'
      };

      const mockResponse = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        role: 'CLIENT',
        user: {
          id: '123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User'
        }
      };

      service.verify2FA(verifyData).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(localStorage.getItem('accessToken')).toBe('mock-access-token');
        expect(localStorage.getItem('refreshToken')).toBe('mock-refresh-token');
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/verify-2fa`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(verifyData);
      req.flush(mockResponse);
    });

    it('should handle invalid 2FA code', () => {
      const verifyData = {
        twoFactorToken: 'mock-2fa-token',
        code: 'invalid'
      };

      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Invalid 2FA code' }
      };

      service.verify2FA(verifyData).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('Invalid 2FA code');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/verify-2fa`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', () => {
      localStorage.setItem('refreshToken', 'mock-refresh-token');

      const mockResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'mock-refresh-token'
      };

      service.refreshToken().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(localStorage.getItem('accessToken')).toBe('new-access-token');
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/refresh-token`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'mock-refresh-token' });
      req.flush(mockResponse);
    });

    it('should handle refresh token error', () => {
      localStorage.setItem('refreshToken', 'invalid-refresh-token');

      const mockError = {
        status: 401,
        statusText: 'Unauthorized',
        error: { message: 'Invalid refresh token' }
      };

      service.refreshToken().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(401);
          expect(localStorage.getItem('accessToken')).toBeNull();
          expect(localStorage.getItem('refreshToken')).toBeNull();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/refresh-token`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('logout', () => {
    it('should logout successfully', () => {
      localStorage.setItem('accessToken', 'mock-access-token');
      localStorage.setItem('refreshToken', 'mock-refresh-token');
      localStorage.setItem('userRole', 'CLIENT');

      service.logout().subscribe(response => {
        expect(response).toEqual({ message: 'Logged out successfully' });
        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(localStorage.getItem('refreshToken')).toBeNull();
        expect(localStorage.getItem('userRole')).toBeNull();
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/logout`);
      expect(req.request.method).toBe('POST');
      req.flush({ message: 'Logged out successfully' });
    });

    it('should clear local storage even if logout request fails', () => {
      localStorage.setItem('accessToken', 'mock-access-token');
      localStorage.setItem('refreshToken', 'mock-refresh-token');

      service.logout().subscribe({
        next: () => fail('Should have failed'),
        error: () => {
          expect(localStorage.getItem('accessToken')).toBeNull();
          expect(localStorage.getItem('refreshToken')).toBeNull();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/logout`);
      req.flush({ message: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when access token exists', () => {
      localStorage.setItem('accessToken', 'mock-access-token');
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false when access token does not exist', () => {
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('getUserRole', () => {
    it('should return user role from localStorage', () => {
      localStorage.setItem('userRole', 'ADMIN');
      expect(service.getUserRole()).toBe('ADMIN');
    });

    it('should return null when no role is stored', () => {
      expect(service.getUserRole()).toBeNull();
    });
  });

  describe('getAccessToken', () => {
    it('should return access token from localStorage', () => {
      localStorage.setItem('accessToken', 'mock-access-token');
      expect(service.getAccessToken()).toBe('mock-access-token');
    });

    it('should return null when no token is stored', () => {
      expect(service.getAccessToken()).toBeNull();
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the specified role', () => {
      localStorage.setItem('userRole', 'ADMIN');
      expect(service.hasRole('ADMIN')).toBe(true);
    });

    it('should return false when user does not have the specified role', () => {
      localStorage.setItem('userRole', 'CLIENT');
      expect(service.hasRole('ADMIN')).toBe(false);
    });

    it('should return false when no role is stored', () => {
      expect(service.hasRole('ADMIN')).toBe(false);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', () => {
      const token = 'verification-token';
      const mockResponse = { message: 'Email verified successfully' };

      service.verifyEmail(token).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/verify-email?token=${token}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle invalid verification token', () => {
      const token = 'invalid-token';
      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Invalid verification token' }
      };

      service.verifyEmail(token).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('Invalid verification token');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/verify-email?token=${token}`);
      req.flush(mockError.error, mockError);
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset successfully', () => {
      const email = 'test@example.com';
      const mockResponse = { message: 'Password reset email sent' };

      service.requestPasswordReset(email).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/request-password-reset`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email });
      req.flush(mockResponse);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', () => {
      const resetData = {
        token: 'reset-token',
        newPassword: 'newpassword123'
      };
      const mockResponse = { message: 'Password reset successfully' };

      service.resetPassword(resetData).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/reset-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(resetData);
      req.flush(mockResponse);
    });
  });
});
