import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { TokenRefreshInterceptor } from './token-refresh.interceptor';
import { AuthService } from '../services/auth';

describe('TokenRefreshInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['refreshToken', 'logout', 'getAccessToken']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: TokenRefreshInterceptor,
          multi: true
        },
        { provide: AuthService, useValue: authServiceSpy },
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
  });

  it('should add Authorization header when token exists', () => {
    authService.getAccessToken.and.returnValue('mock-token');

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer mock-token');
    req.flush({});
  });

  it('should not add Authorization header when token does not exist', () => {
    authService.getAccessToken.and.returnValue(null);

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should not add Authorization header for auth endpoints', () => {
    authService.getAccessToken.and.returnValue('mock-token');

    httpClient.post('/auth/login', {}).subscribe();

    const req = httpMock.expectOne('/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should refresh token on 401 error and retry request', () => {
    authService.getAccessToken.and.returnValue('expired-token');
    authService.refreshToken.and.returnValue(of({
      accessToken: 'new-token',
      refreshToken: 'refresh-token'
    }));

    let responseReceived = false;
    httpClient.get('/api/test').subscribe({
      next: () => responseReceived = true
    });

    // First request with expired token
    const req1 = httpMock.expectOne('/api/test');
    expect(req1.request.headers.get('Authorization')).toBe('Bearer expired-token');
    req1.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    // Second request with new token after refresh
    const req2 = httpMock.expectOne('/api/test');
    expect(req2.request.headers.get('Authorization')).toBe('Bearer new-token');
    req2.flush({ data: 'success' });

    expect(authService.refreshToken).toHaveBeenCalled();
    expect(responseReceived).toBe(true);
  });

  it('should logout and redirect on refresh token failure', () => {
    authService.getAccessToken.and.returnValue('expired-token');
    authService.refreshToken.and.returnValue(throwError(() => ({
      status: 401,
      error: { message: 'Invalid refresh token' }
    })));
    authService.logout.and.returnValue(of({}));

    let errorReceived = false;
    httpClient.get('/api/test').subscribe({
      error: () => errorReceived = true
    });

    // First request with expired token
    const req1 = httpMock.expectOne('/api/test');
    req1.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshToken).toHaveBeenCalled();
    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(errorReceived).toBe(true);
  });

  it('should not intercept non-401 errors', () => {
    authService.getAccessToken.and.returnValue('valid-token');

    let errorReceived: HttpErrorResponse | null = null;
    httpClient.get('/api/test').subscribe({
      error: (error) => errorReceived = error
    });

    const req = httpMock.expectOne('/api/test');
    req.flush({ message: 'Server Error' }, { status: 500, statusText: 'Internal Server Error' });

    expect(authService.refreshToken).not.toHaveBeenCalled();
    expect(errorReceived?.status).toBe(500);
  });

  it('should handle multiple concurrent 401 errors with single refresh', () => {
    authService.getAccessToken.and.returnValue('expired-token');
    authService.refreshToken.and.returnValue(of({
      accessToken: 'new-token',
      refreshToken: 'refresh-token'
    }));

    let responses = 0;
    
    // Make multiple concurrent requests
    httpClient.get('/api/test1').subscribe(() => responses++);
    httpClient.get('/api/test2').subscribe(() => responses++);

    // Both requests should fail with 401
    const req1 = httpMock.expectOne('/api/test1');
    const req2 = httpMock.expectOne('/api/test2');
    
    req1.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    req2.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    // Both requests should be retried with new token
    const retryReq1 = httpMock.expectOne('/api/test1');
    const retryReq2 = httpMock.expectOne('/api/test2');
    
    expect(retryReq1.request.headers.get('Authorization')).toBe('Bearer new-token');
    expect(retryReq2.request.headers.get('Authorization')).toBe('Bearer new-token');
    
    retryReq1.flush({ data: 'success1' });
    retryReq2.flush({ data: 'success2' });

    // Refresh should only be called once
    expect(authService.refreshToken).toHaveBeenCalledTimes(1);
    expect(responses).toBe(2);
  });

  it('should not add Authorization header for external URLs', () => {
    authService.getAccessToken.and.returnValue('mock-token');

    httpClient.get('https://external-api.com/data').subscribe();

    const req = httpMock.expectOne('https://external-api.com/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should handle refresh token success but invalid response format', () => {
    authService.getAccessToken.and.returnValue('expired-token');
    authService.refreshToken.and.returnValue(of({
      // Missing accessToken property
      refreshToken: 'refresh-token'
    } as any));
    authService.logout.and.returnValue(of({}));

    let errorReceived = false;
    httpClient.get('/api/test').subscribe({
      error: () => errorReceived = true
    });

    const req1 = httpMock.expectOne('/api/test');
    req1.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshToken).toHaveBeenCalled();
    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(errorReceived).toBe(true);
  });

  it('should preserve request body and headers during retry', () => {
    authService.getAccessToken.and.returnValue('expired-token');
    authService.refreshToken.and.returnValue(of({
      accessToken: 'new-token',
      refreshToken: 'refresh-token'
    }));

    const requestBody = { data: 'test' };
    const customHeaders = { 'Custom-Header': 'test-value' };

    httpClient.post('/api/test', requestBody, { headers: customHeaders }).subscribe();

    // First request
    const req1 = httpMock.expectOne('/api/test');
    expect(req1.request.body).toEqual(requestBody);
    expect(req1.request.headers.get('Custom-Header')).toBe('test-value');
    req1.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    // Retry request should preserve body and headers
    const req2 = httpMock.expectOne('/api/test');
    expect(req2.request.body).toEqual(requestBody);
    expect(req2.request.headers.get('Custom-Header')).toBe('test-value');
    expect(req2.request.headers.get('Authorization')).toBe('Bearer new-token');
    req2.flush({ success: true });
  });

  it('should handle network errors during refresh', () => {
    authService.getAccessToken.and.returnValue('expired-token');
    authService.refreshToken.and.returnValue(throwError(() => new Error('Network error')));
    authService.logout.and.returnValue(of({}));

    let errorReceived = false;
    httpClient.get('/api/test').subscribe({
      error: () => errorReceived = true
    });

    const req1 = httpMock.expectOne('/api/test');
    req1.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(errorReceived).toBe(true);
  });
});