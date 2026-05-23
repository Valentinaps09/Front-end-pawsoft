import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService, LoginResponse } from './auth';
import { InactivityService } from './inactivity.service';
import { environment } from '../../environments/environment';

describe('AuthService - Pruebas Funcionales (FE-AUTH-01 a FE-AUTH-24)', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  let inactivityService: jasmine.SpyObj<InactivityService>;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const inactivitySpy = jasmine.createSpyObj('InactivityService', ['startWatching', 'stopWatching']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy },
        { provide: InactivityService, useValue: inactivitySpy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    inactivityService = TestBed.inject(InactivityService) as jasmine.SpyObj<InactivityService>;
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-01: Login exitoso con credenciales válidas
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-01: Login exitoso con credenciales válidas', () => {
    it('debe realizar login exitoso y enviar código 2FA', () => {
      const loginData = {
        email: 'usuario@test.com',
        password: 'Test@1234',
        recaptchaToken: 'valid-recaptcha-token'
      };

      const mockResponse = { message: '2FA code sent' };

      service.login(loginData.email, loginData.password, loginData.recaptchaToken)
        .subscribe(response => {
          expect(response).toEqual(mockResponse);
        });

      const req = httpMock.expectOne(`${apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(loginData);
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-02: Verificación 2FA exitosa
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-02: Verificación 2FA exitosa', () => {
    it('debe verificar código 2FA y completar autenticación', () => {
      const email = 'usuario@test.com';
      const code = '123456';
      const mockResponse: LoginResponse = {
        token: 'jwt-token',
        role: 'ROLE_CLIENTE',
        email: 'usuario@test.com',
        message: 'Login successful',
        refreshToken: 'refresh-token',
        mustChangePassword: false
      };

      service.verify2FA(email, code).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/verify-2fa?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-03: Login con credenciales inválidas
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-03: Login con credenciales inválidas', () => {
    it('debe rechazar credenciales inválidas', () => {
      const loginData = {
        email: 'usuario@test.com',
        password: 'ContraseñaIncorrecta123',
        recaptchaToken: 'valid-recaptcha-token'
      };

      const mockError = {
        status: 401,
        statusText: 'Unauthorized',
        error: { message: 'Credenciales inválidas' }
      };

      service.login(loginData.email, loginData.password, loginData.recaptchaToken)
        .subscribe({
          next: () => fail('Debería haber fallado'),
          error: (error) => {
            expect(error.status).toBe(401);
            expect(error.error.message).toBe('Credenciales inválidas');
          }
        });

      const req = httpMock.expectOne(`${apiUrl}/auth/login`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-04: Código 2FA inválido
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-04: Código 2FA inválido', () => {
    it('debe rechazar código 2FA inválido', () => {
      const email = 'usuario@test.com';
      const code = 'invalid';

      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Código 2FA inválido' }
      };

      service.verify2FA(email, code).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('Código 2FA inválido');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/verify-2fa?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-05: Registro exitoso
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-05: Registro exitoso', () => {
    it('debe registrar usuario exitosamente', () => {
      const registerData = {
        name: 'Juan Pérez',
        email: 'juan.perez@test.com',
        password: 'Test@1234',
        phone: '3001234567',
        recaptchaToken: 'valid-recaptcha-token'
      };

      const mockResponse = {
        message: 'Usuario registrado exitosamente. Verifica tu email.',
        userId: '123'
      };

      service.register(
        registerData.name,
        registerData.email,
        registerData.password,
        registerData.phone,
        registerData.recaptchaToken
      ).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(registerData);
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-06: Registro con email duplicado
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-06: Registro con email duplicado', () => {
    it('debe rechazar email ya registrado', () => {
      const registerData = {
        name: 'Juan Pérez',
        email: 'existing@test.com',
        password: 'Test@1234',
        phone: '3001234567',
        recaptchaToken: 'valid-recaptcha-token'
      };

      const mockError = {
        status: 409,
        statusText: 'Conflict',
        error: { message: 'El email ya está registrado' }
      };

      service.register(
        registerData.name,
        registerData.email,
        registerData.password,
        registerData.phone,
        registerData.recaptchaToken
      ).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(409);
          expect(error.error.message).toBe('El email ya está registrado');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/register`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-07: Verificación de email exitosa
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-07: Verificación de email exitosa', () => {
    it('debe verificar email con token válido', () => {
      const token = 'valid-verification-token';
      const mockResponse = { message: 'Email verificado exitosamente' };

      service.verifyEmail(token).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/verify-email?token=${encodeURIComponent(token)}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-08: Verificación de email con token inválido
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-08: Verificación de email con token inválido', () => {
    it('debe rechazar token de verificación inválido', () => {
      const token = 'invalid-token';
      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Token de verificación inválido o expirado' }
      };

      service.verifyEmail(token).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('Token de verificación inválido o expirado');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/verify-email?token=${encodeURIComponent(token)}`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-09: Solicitud de recuperación de contraseña
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-09: Solicitud de recuperación de contraseña', () => {
    it('debe enviar email de recuperación', () => {
      const email = 'usuario@test.com';
      const mockResponse = { message: 'Email de recuperación enviado' };

      service.requestPasswordReset(email).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/password-reset/request`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email });
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-10: Reset de contraseña exitoso
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-10: Reset de contraseña exitoso', () => {
    it('debe restablecer contraseña con token válido', () => {
      const token = 'valid-reset-token';
      const newPassword = 'NewTest@5678';
      const mockResponse = { message: 'Contraseña restablecida exitosamente' };

      service.resetPassword(token, newPassword).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/password-reset/confirm`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ token, newPassword });
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-11: Reset de contraseña con token inválido
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-11: Reset de contraseña con token inválido', () => {
    it('debe rechazar token de reset inválido', () => {
      const token = 'invalid-reset-token';
      const newPassword = 'NewTest@5678';
      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Token de reset inválido o expirado' }
      };

      service.resetPassword(token, newPassword).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('Token de reset inválido o expirado');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/password-reset/confirm`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-12: Reenvío de código 2FA
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-12: Reenvío de código 2FA', () => {
    it('debe reenviar código 2FA exitosamente', () => {
      const email = 'usuario@test.com';
      const mockResponse = { message: 'Código 2FA reenviado' };

      service.resend2FA(email).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/resend-2fa?email=${encodeURIComponent(email)}`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-13: Reenvío de verificación de email
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-13: Reenvío de verificación de email', () => {
    it('debe reenviar email de verificación', () => {
      const email = 'usuario@test.com';
      const mockResponse = { message: 'Email de verificación reenviado' };

      service.resendVerificationEmail(email).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/resend-verification?email=${encodeURIComponent(email)}`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-14: Cambio de contraseña en primer acceso
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-14: Cambio de contraseña en primer acceso', () => {
    it('debe cambiar contraseña en primer acceso', () => {
      const email = 'usuario@test.com';
      const newPassword = 'NewTest@5678';
      const mockResponse: LoginResponse = {
        token: 'jwt-token',
        role: 'ROLE_CLIENTE',
        email: 'usuario@test.com',
        message: 'Password changed successfully',
        refreshToken: 'refresh-token',
        mustChangePassword: false
      };

      service.changePasswordFirst(email, newPassword).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/change-password-first`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email, newPassword });
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-15: Refresh token exitoso
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-15: Refresh token exitoso', () => {
    it('debe renovar token exitosamente', () => {
      localStorage.setItem('refreshToken', 'valid-refresh-token');
      
      const mockResponse: LoginResponse = {
        token: 'new-jwt-token',
        role: 'ROLE_CLIENTE',
        email: 'usuario@test.com',
        message: 'Token refreshed',
        refreshToken: 'new-refresh-token',
        mustChangePassword: false
      };

      service.refreshToken().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'valid-refresh-token' });
      req.flush(mockResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-16: Refresh token inválido
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-16: Refresh token inválido', () => {
    it('debe rechazar refresh token inválido', () => {
      localStorage.setItem('refreshToken', 'invalid-refresh-token');
      
      const mockError = {
        status: 401,
        statusText: 'Unauthorized',
        error: { message: 'Refresh token inválido' }
      };

      service.refreshToken().subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(401);
          expect(error.error.message).toBe('Refresh token inválido');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/refresh`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-17: Logout exitoso
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-17: Logout exitoso', () => {
    it('debe cerrar sesión exitosamente', () => {
      localStorage.setItem('token', 'jwt-token');
      localStorage.setItem('refreshToken', 'refresh-token');
      localStorage.setItem('rol', 'ROLE_CLIENTE');
      localStorage.setItem('email', 'usuario@test.com');

      service.logout();

      expect(inactivityService.stopWatching).toHaveBeenCalled();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('rol')).toBeNull();
      expect(localStorage.getItem('email')).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(
        ['/login'], { queryParams: { reason: 'logout' } }
      );

      const req = httpMock.expectOne(`${apiUrl}/auth/logout`);
      expect(req.request.method).toBe('POST');
      req.flush({ message: 'Logged out successfully' });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-18: Gestión de sesión - guardarSesion
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-18: Gestión de sesión - guardarSesion', () => {
    it('debe guardar datos de sesión correctamente', () => {
      const token = 'jwt-token';
      const rol = 'ROLE_CLIENTE';
      const email = 'usuario@test.com';
      const refreshToken = 'refresh-token';

      service.guardarSesion(token, rol, email, refreshToken);

      expect(localStorage.getItem('token')).toBe(token);
      expect(localStorage.getItem('rol')).toBe(rol);
      expect(localStorage.getItem('email')).toBe(email.toLowerCase());
      expect(localStorage.getItem('refreshToken')).toBe(refreshToken);
      expect(inactivityService.startWatching).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-19: Getters de sesión
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-19: Getters de sesión', () => {
    it('debe obtener datos de sesión correctamente', () => {
      localStorage.setItem('token', 'jwt-token');
      localStorage.setItem('rol', 'ROLE_CLIENTE');
      localStorage.setItem('email', 'usuario@test.com');
      localStorage.setItem('refreshToken', 'refresh-token');

      expect(service.getToken()).toBe('jwt-token');
      expect(service.getRol()).toBe('ROLE_CLIENTE');
      expect(service.getEmail()).toBe('usuario@test.com');
      expect(service.getRefreshToken()).toBe('refresh-token');
    });

    it('debe retornar null cuando no hay datos', () => {
      expect(service.getToken()).toBeNull();
      expect(service.getRol()).toBeNull();
      expect(service.getEmail()).toBeNull();
      expect(service.getRefreshToken()).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-20: Validación de contraseña débil en registro
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-20: Validación de contraseña débil en registro', () => {
    it('debe rechazar contraseña débil', () => {
      const registerData = {
        name: 'Juan Pérez',
        email: 'juan.perez@test.com',
        password: '123',
        phone: '3001234567',
        recaptchaToken: 'valid-recaptcha-token'
      };

      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número' }
      };

      service.register(
        registerData.name,
        registerData.email,
        registerData.password,
        registerData.phone,
        registerData.recaptchaToken
      ).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toContain('contraseña debe tener');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/register`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-21: Manejo de errores de red
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-21: Manejo de errores de red', () => {
    it('debe manejar errores de conexión', () => {
      const loginData = {
        email: 'usuario@test.com',
        password: 'Test@1234',
        recaptchaToken: 'valid-recaptcha-token'
      };

      service.login(loginData.email, loginData.password, loginData.recaptchaToken)
        .subscribe({
          next: () => fail('Debería haber fallado'),
          error: (error) => {
            expect(error.status).toBe(0);
          }
        });

      const req = httpMock.expectOne(`${apiUrl}/auth/login`);
      req.error(new ProgressEvent('Network error'), { status: 0 });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-22: Límite de intentos 2FA
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-22: Límite de intentos 2FA', () => {
    it('debe bloquear tras múltiples intentos fallidos de 2FA', () => {
      const email = 'usuario@test.com';
      const code = 'wrong';

      const mockError = {
        status: 429,
        statusText: 'Too Many Requests',
        error: { message: 'Demasiados intentos fallidos. Espera 1 minuto antes de volver a intentarlo.' }
      };

      service.verify2FA(email, code).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(429);
          expect(error.error.message).toContain('Espera 1 minuto');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/verify-2fa?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-23: Expiración de código 2FA
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-23: Expiración de código 2FA', () => {
    it('debe rechazar código 2FA expirado', () => {
      const email = 'usuario@test.com';
      const code = '123456';

      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'El código 2FA ha expirado. Solicita uno nuevo.' }
      };

      service.verify2FA(email, code).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toContain('expirado');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/verify-2fa?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`);
      req.flush(mockError.error, mockError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-AUTH-24: Validación de formato de email
  // ═══════════════════════════════════════════════════════════════
  describe('FE-AUTH-24: Validación de formato de email', () => {
    it('debe rechazar formato de email inválido', () => {
      const registerData = {
        name: 'Juan Pérez',
        email: 'email-invalido',
        password: 'Test@1234',
        phone: '3001234567',
        recaptchaToken: 'valid-recaptcha-token'
      };

      const mockError = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Formato de email inválido' }
      };

      service.register(
        registerData.name,
        registerData.email,
        registerData.password,
        registerData.phone,
        registerData.recaptchaToken
      ).subscribe({
        next: () => fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('Formato de email inválido');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/auth/register`);
      req.flush(mockError.error, mockError);
    });
  });
});