import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { tokenRefreshInterceptor } from './token-refresh.interceptor';
import { AuthService, LoginResponse } from '../services/auth';

describe('TokenRefreshInterceptor - Pruebas Funcionales (FE-INT-01 a FE-INT-11)', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', [
      'getToken', 'getRefreshToken', 'refreshToken', 'guardarSesion'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tokenRefreshInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  /** Crea un JWT mock con la expiración indicada en minutos (negativo = ya expirado) */
  function createMockJWT(expirationMinutes: number): string {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (expirationMinutes * 60);
    const payload = { exp, sub: 'user123' };
    return `header.${btoa(JSON.stringify(payload))}.signature`;
  }

  // ═══════════════════════════════════════════════════════════════
  // FE-INT-01: Petición sin token - debe pasar sin interceptar
  // ═══════════════════════════════════════════════════════════════
  describe('FE-INT-01: Petición sin token', () => {
    it('debe permitir peticiones cuando no hay token', () => {
      authService.getToken.and.returnValue(null);
      authService.getRefreshToken.and.returnValue(null);

      httpClient.get('/api/test').subscribe();

      const req = httpMock.expectOne('/api/test');
      expect(req.request.method).toBe('GET');
      req.flush({ data: 'test' });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-INT-02: Petición a endpoint de auth - debe pasar sin interceptar
  // ═══════════════════════════════════════════════════════════════
  describe('FE-INT-02: Petición a endpoint de auth', () => {
    it('debe permitir peticiones a /auth/ sin interceptar', () => {
      authService.getToken.and.returnValue('valid-token');
      authService.getRefreshToken.and.returnValue('refresh-token');

      httpClient.post('/api/auth/login', {}).subscribe();

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-INT-03: Token válido - debe pasar sin renovar
  // ═══════════════════════════════════════════════════════════════
  describe('FE-INT-03: Token válido', () => {
    it('debe permitir peticiones con token válido sin renovar', () => {
      const validToken = createMockJWT(30); // Expira en 30 minutos
      authService.getToken.and.returnValue(validToken);
      authService.getRefreshToken.and.returnValue('refresh-token');

      httpClient.get('/api/test').subscribe();

      const req = httpMock.expectOne('/api/test');
      expect(req.request.method).toBe('GET');
      expect(authService.refreshToken).not.toHaveBeenCalled();
      req.flush({ data: 'test' });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-INT-04: Token próximo a expirar - renovación proactiva
  // El interceptor llama authService.refreshToken() (spy) directamente,
  // luego reintenta la petición original con el nuevo token.
  // ═══════════════════════════════════════════════════════════════
  describe('FE-INT-04: Token próximo a expirar', () => {
    it('debe renovar token proactivamente cuando expira en menos de 5 minutos', fakeAsync(() => {
      const expiringToken = createMockJWT(3); // Expira en 3 minutos
      const newToken = createMockJWT(60);

      authService.getToken.and.returnValue(expiringToken);
      authService.getRefreshToken.and.returnValue('refresh-token');

      const refreshResponse: LoginResponse = {
        token: newToken,
        role: 'ROLE_CLIENTE',
        email: 'user@test.com',
        message: 'Token refreshed',
        refreshToken: 'new-refresh-token',
        mustChangePassword: false
      };

      // El interceptor llama authService.refreshToken() directamente (no hace HTTP)
      authService.refreshToken.and.returnValue(of(refreshResponse));

      let completed = false;
      httpClient.get('/api/test').subscribe(() => { completed = true; });

      tick();

      // El interceptor llamó al spy de refreshToken
      expect(authService.refreshToken).toHaveBeenCalled();

      // Luego reintenta la petición original con el nuevo token
      const originalReq = httpMock.expectOne('/api/test');
      expect(originalReq.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
      originalReq.flush({ data: 'test' });

      tick();

      expect(completed).toBe(true);
      expect(authService.guardarSesion).toHaveBeenCalledWith(
        newToken, 'ROLE_CLIENTE', 'user@test.com', 'new-refresh-token'
      );
    }));
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-INT-05: Error 403 con token expirado - renovación reactiva
  // Token ya expirado → interceptor entra en bloque proactivo,
  // renueva y reintenta con nuevo token.
  // ═══════════════════════════════════════════════════════════════
  describe('FE-INT-05: Error 403 con token expirado', () => {
    it('debe renovar token cuando el token está expirado', fakeAsync(() => {
      const expiredToken = createMockJWT(-10); // Ya expirado
      const newToken = createMockJWT(60);

      authService.getToken.and.returnValue(expiredToken);
      authService.getRefreshToken.and.returnValue('refresh-token');

      const refreshResponse: LoginResponse = {
        token: newToken,
        role: 'ROLE_CLIENTE',
        email: 'user@test.com',
        message: 'Token refreshed',
        refreshToken: 'new-refresh-token',
        mustChangePassword: false
      };

      authService.refreshToken.and.returnValue(of(refreshResponse));

      let result: any;
      httpClient.get('/api/test').subscribe({ next: (r) => { result = r; } });

      tick();

      // El interceptor detectó token expirado, llamó refreshToken proactivamente
      expect(authService.refreshToken).toHaveBeenCalled();

      // Reintenta la petición con el nuevo token
      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
      req.flush({ data: 'test' });

      tick();

      expect(result).toEqual({ data: 'test' });
    }));
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-INT-06: Error 403 por permisos (RBAC) - no debe renovar
  // Token válido (30 min) → no entra en bloque proactivo.
  // El 403 no contiene "expired/jwt/token" → no renueva.
  // ═══════════════════════════════════════════════════════════════
  describe('FE-INT-06: Error 403 por permisos RBAC', () => {
    it('no debe renovar token cuando 403 es por falta de permisos', fakeAsync(() => {
      const validToken = createMockJWT(30);

      authService.getToken.and.returnValue(validToken);
      authService.getRefreshToken.and.returnValue('refresh-token');

      let errorResult: any;
      httpClient.get('/api/admin/users').subscribe({
        error: (error) => { errorResult = error; }
      });

      tick();

      const req = httpMock.expectOne('/api/admin/users');
      req.flush(
        { message: 'Access denied - insufficient permissions' },
        { status: 403, statusText: 'Forbidden' }
      );

      tick();

      expect(errorResult.status).toBe(403);
      expect(errorResult.error.message).toBe('Access denied - insufficient permissions');
      expect(authService.refreshToken).not.toHaveBeenCalled();
    }));
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-INT-07: Fallo en renovación de token - logout automático
  // Token expirado → interceptor intenta renovar proactivamente,
  // el spy lanza error → debe navegar a /login.
  // ═══════════════════════════════════════════════════════════════
  describe('FE-INT-07: Fallo en renovación de token', () => {
    it('debe hacer logout cuando falla la renovación de token', fakeAsync(() => {
      const expiredToken = createMockJWT(-10);

      authService.getToken.and.returnValue(expiredToken);
      authService.getRefreshToken.and.returnValue('invalid-refresh-token');
      authService.refreshToken.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }))
      );

      let errorResult: any;
      httpClient.get('/api/test').subscribe({
        error: (error) => { errorResult = error; }
      });

      tick();

      // No hay petición HTTP pendiente porque el interceptor falló antes de reintentarla
      httpMock.expectNone('/api/test');

      expect(router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { reason: 'session-expired' }
      });
    }));
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-INT-08: Token malformado - debe pasar sin renovar
  // ═══════════════════════════════════════════════════════════════
  describe('FE-INT-08: Token malformado', () => {
    it('debe manejar token malformado sin renovar', () => {
      authService.getToken.and.returnValue('invalid.token.format');
      authService.getRefreshToken.and.returnValue('refresh-token');

      httpClient.get('/api/test').subscribe();

      const req = httpMock.expectOne('/api/test');
      expect(req.request.method).toBe('GET');
      expect(authService.refreshToken).not.toHaveBeenCalled();
      req.flush({ data: 'test' });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-INT-09: Múltiples peticiones concurrentes
  // Con token expirado, el interceptor llama refreshToken para la
  // primera petición (isRefreshing=true). Las siguientes pasan
  // directo porque isRefreshing bloquea nuevas renovaciones.
  // ═══════════════════════════════════════════════════════════════
  describe('FE-INT-09: Múltiples peticiones concurrentes', () => {
    it('debe intentar renovar token para la primera petición con token expirado', fakeAsync(() => {
      const expiringToken = createMockJWT(3); // Expira en 3 min → entra en bloque proactivo
      const newToken = createMockJWT(60);

      authService.getToken.and.returnValue(expiringToken);
      authService.getRefreshToken.and.returnValue('refresh-token');

      const refreshResponse: LoginResponse = {
        token: newToken,
        role: 'ROLE_CLIENTE',
        email: 'user@test.com',
        message: 'Token refreshed',
        refreshToken: 'new-refresh-token',
        mustChangePassword: false
      };

      authService.refreshToken.and.returnValue(of(refreshResponse));

      httpClient.get('/api/test1').subscribe();
      httpClient.get('/api/test2').subscribe();
      httpClient.get('/api/test3').subscribe();

      tick();

      // La primera petición usa el nuevo token (renovación proactiva)
      const req1 = httpMock.expectOne('/api/test1');
      expect(req1.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
      req1.flush({ data: 'test1' });

      // Las otras pasan sin renovar (isRefreshing bloqueó)
      const req2 = httpMock.expectOne('/api/test2');
      req2.flush({ data: 'test2' });

      const req3 = httpMock.expectOne('/api/test3');
      req3.flush({ data: 'test3' });

      tick();

      // refreshToken se llamó al menos una vez
      expect(authService.refreshToken).toHaveBeenCalled();
    }));
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-INT-10: Sin refresh token disponible
  // ═══════════════════════════════════════════════════════════════
  describe('FE-INT-10: Sin refresh token disponible', () => {
    it('debe pasar petición sin renovar cuando no hay refresh token', fakeAsync(() => {
      const validToken = createMockJWT(30); // Token válido, no entra en bloque proactivo

      authService.getToken.and.returnValue(validToken);
      authService.getRefreshToken.and.returnValue(null); // Sin refresh token

      let errorResult: any;
      httpClient.get('/api/test').subscribe({
        error: (error) => { errorResult = error; }
      });

      tick();

      const req = httpMock.expectOne('/api/test');
      req.flush(
        { message: 'JWT token expired' },
        { status: 403, statusText: 'Forbidden' }
      );

      tick();

      expect(errorResult.status).toBe(403);
      expect(authService.refreshToken).not.toHaveBeenCalled();
    }));
  });

  // ═══════════════════════════════════════════════════════════════
  // FE-INT-11: Limpieza de localStorage en logout automático
  // Token expirado → renovación falla → localStorage.clear()
  // ═══════════════════════════════════════════════════════════════
  describe('FE-INT-11: Limpieza de localStorage', () => {
    it('debe limpiar localStorage cuando falla la renovación', fakeAsync(() => {
      localStorage.setItem('token', 'expired-token');
      localStorage.setItem('refreshToken', 'invalid-refresh');
      localStorage.setItem('rol', 'ROLE_CLIENTE');
      localStorage.setItem('email', 'user@test.com');

      const expiredToken = createMockJWT(-10);

      authService.getToken.and.returnValue(expiredToken);
      authService.getRefreshToken.and.returnValue('invalid-refresh-token');
      authService.refreshToken.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 401 }))
      );

      httpClient.get('/api/test').subscribe({
        error: () => { /* Error esperado */ }
      });

      tick();

      // No hay petición HTTP pendiente (interceptor falló antes de reintentarla)
      httpMock.expectNone('/api/test');

      // El interceptor llama localStorage.clear() al fallar el refresh
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('rol')).toBeNull();
      expect(localStorage.getItem('email')).toBeNull();
    }));
  });
});
