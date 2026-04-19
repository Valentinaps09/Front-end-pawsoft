import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { of, throwError } from 'rxjs';

import { LoginPage } from './login.page';
import { AuthService } from '../../../services/auth';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let loadingController: jasmine.SpyObj<LoadingController>;
  let toastController: jasmine.SpyObj<ToastController>;
  let mockLoading: jasmine.SpyObj<HTMLIonLoadingElement>;
  let mockToast: jasmine.SpyObj<HTMLIonToastElement>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['login', 'verify2FA']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const loadingControllerSpy = jasmine.createSpyObj('LoadingController', ['create']);
    const toastControllerSpy = jasmine.createSpyObj('ToastController', ['create']);

    mockLoading = jasmine.createSpyObj('HTMLIonLoadingElement', ['present', 'dismiss']);
    mockToast = jasmine.createSpyObj('HTMLIonToastElement', ['present']);

    loadingControllerSpy.create.and.returnValue(Promise.resolve(mockLoading));
    toastControllerSpy.create.and.returnValue(Promise.resolve(mockToast));

    await TestBed.configureTestingModule({
      declarations: [LoginPage],
      imports: [IonicModule.forRoot(), ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: LoadingController, useValue: loadingControllerSpy },
        { provide: ToastController, useValue: toastControllerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    loadingController = TestBed.inject(LoadingController) as jasmine.SpyObj<LoadingController>;
    toastController = TestBed.inject(ToastController) as jasmine.SpyObj<ToastController>;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize login form with empty values', () => {
    expect(component.loginForm.get('email')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
    expect(component.loginForm.get('recaptchaToken')?.value).toBe('');
  });

  it('should validate email field', () => {
    const emailControl = component.loginForm.get('email');
    
    // Test empty email
    emailControl?.setValue('');
    expect(emailControl?.hasError('required')).toBe(true);
    
    // Test invalid email
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBe(true);
    
    // Test valid email
    emailControl?.setValue('test@example.com');
    expect(emailControl?.valid).toBe(true);
  });

  it('should validate password field', () => {
    const passwordControl = component.loginForm.get('password');
    
    // Test empty password
    passwordControl?.setValue('');
    expect(passwordControl?.hasError('required')).toBe(true);
    
    // Test short password
    passwordControl?.setValue('123');
    expect(passwordControl?.hasError('minlength')).toBe(true);
    
    // Test valid password
    passwordControl?.setValue('password123');
    expect(passwordControl?.valid).toBe(true);
  });

  it('should validate recaptcha token', () => {
    const recaptchaControl = component.loginForm.get('recaptchaToken');
    
    // Test empty recaptcha
    recaptchaControl?.setValue('');
    expect(recaptchaControl?.hasError('required')).toBe(true);
    
    // Test valid recaptcha
    recaptchaControl?.setValue('test-token');
    expect(recaptchaControl?.valid).toBe(true);
  });

  it('should not submit form when invalid', async () => {
    // Form is invalid by default (empty values)
    await component.onSubmit();
    
    expect(authService.login).not.toHaveBeenCalled();
    expect(loadingController.create).not.toHaveBeenCalled();
  });

  it('should successfully login without 2FA', async () => {
    // Setup valid form
    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'password123',
      recaptchaToken: 'test-token'
    });

    const mockResponse = {
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh',
      role: 'CLIENT',
      user: { id: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User' },
      twoFactorRequired: false
    };

    authService.login.and.returnValue(of(mockResponse));

    await component.onSubmit();

    expect(loadingController.create).toHaveBeenCalledWith({
      message: 'Iniciando sesión...'
    });
    expect(mockLoading.present).toHaveBeenCalled();
    expect(authService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      recaptchaToken: 'test-token'
    });
    expect(mockLoading.dismiss).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should handle 2FA required response', async () => {
    // Setup valid form
    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'password123',
      recaptchaToken: 'test-token'
    });

    const mockResponse = {
      twoFactorRequired: true,
      twoFactorToken: 'mock-2fa-token'
    };

    authService.login.and.returnValue(of(mockResponse));

    await component.onSubmit();

    expect(authService.login).toHaveBeenCalled();
    expect(component.showTwoFactorForm).toBe(true);
    expect(component.twoFactorToken).toBe('mock-2fa-token');
    expect(mockLoading.dismiss).toHaveBeenCalled();
  });

  it('should handle login error', async () => {
    // Setup valid form
    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'wrongpassword',
      recaptchaToken: 'test-token'
    });

    const mockError = {
      error: { message: 'Invalid credentials' }
    };

    authService.login.and.returnValue(throwError(() => mockError));

    await component.onSubmit();

    expect(authService.login).toHaveBeenCalled();
    expect(mockLoading.dismiss).toHaveBeenCalled();
    expect(toastController.create).toHaveBeenCalledWith({
      message: 'Invalid credentials',
      duration: 3000,
      color: 'danger'
    });
    expect(mockToast.present).toHaveBeenCalled();
  });

  it('should successfully verify 2FA code', async () => {
    // Setup 2FA form
    component.showTwoFactorForm = true;
    component.twoFactorToken = 'mock-2fa-token';
    component.twoFactorForm.patchValue({
      code: '123456'
    });

    const mockResponse = {
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh',
      role: 'CLIENT',
      user: { id: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User' }
    };

    authService.verify2FA.and.returnValue(of(mockResponse));

    await component.onVerify2FA();

    expect(loadingController.create).toHaveBeenCalledWith({
      message: 'Verificando código...'
    });
    expect(authService.verify2FA).toHaveBeenCalledWith({
      twoFactorToken: 'mock-2fa-token',
      code: '123456'
    });
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should handle 2FA verification error', async () => {
    // Setup 2FA form
    component.showTwoFactorForm = true;
    component.twoFactorToken = 'mock-2fa-token';
    component.twoFactorForm.patchValue({
      code: 'invalid'
    });

    const mockError = {
      error: { message: 'Invalid 2FA code' }
    };

    authService.verify2FA.and.returnValue(throwError(() => mockError));

    await component.onVerify2FA();

    expect(authService.verify2FA).toHaveBeenCalled();
    expect(mockLoading.dismiss).toHaveBeenCalled();
    expect(toastController.create).toHaveBeenCalledWith({
      message: 'Invalid 2FA code',
      duration: 3000,
      color: 'danger'
    });
  });

  it('should validate 2FA code field', () => {
    const codeControl = component.twoFactorForm.get('code');
    
    // Test empty code
    codeControl?.setValue('');
    expect(codeControl?.hasError('required')).toBe(true);
    
    // Test short code
    codeControl?.setValue('123');
    expect(codeControl?.hasError('minlength')).toBe(true);
    
    // Test long code
    codeControl?.setValue('1234567');
    expect(codeControl?.hasError('maxlength')).toBe(true);
    
    // Test valid code
    codeControl?.setValue('123456');
    expect(codeControl?.valid).toBe(true);
  });

  it('should not submit 2FA form when invalid', async () => {
    component.showTwoFactorForm = true;
    // Form is invalid by default (empty code)
    
    await component.onVerify2FA();
    
    expect(authService.verify2FA).not.toHaveBeenCalled();
  });

  it('should toggle password visibility', () => {
    expect(component.showPassword).toBe(false);
    
    component.togglePasswordVisibility();
    expect(component.showPassword).toBe(true);
    
    component.togglePasswordVisibility();
    expect(component.showPassword).toBe(false);
  });

  it('should handle recaptcha resolved', () => {
    const token = 'test-recaptcha-token';
    
    component.onRecaptchaResolved(token);
    
    expect(component.loginForm.get('recaptchaToken')?.value).toBe(token);
  });

  it('should handle recaptcha error', () => {
    component.onRecaptchaError();
    
    expect(component.loginForm.get('recaptchaToken')?.value).toBe('');
    expect(toastController.create).toHaveBeenCalledWith({
      message: 'Error al verificar reCAPTCHA. Por favor, inténtalo de nuevo.',
      duration: 3000,
      color: 'danger'
    });
  });

  it('should navigate to register page', () => {
    component.goToRegister();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/register']);
  });

  it('should navigate to forgot password page', () => {
    component.goToForgotPassword();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/forgot-password']);
  });

  it('should go back to login form from 2FA', () => {
    component.showTwoFactorForm = true;
    component.twoFactorToken = 'test-token';
    
    component.goBackToLogin();
    
    expect(component.showTwoFactorForm).toBe(false);
    expect(component.twoFactorToken).toBe('');
    expect(component.twoFactorForm.get('code')?.value).toBe('');
  });

  it('should handle network error gracefully', async () => {
    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'password123',
      recaptchaToken: 'test-token'
    });

    const networkError = {
      error: null,
      message: 'Network error'
    };

    authService.login.and.returnValue(throwError(() => networkError));

    await component.onSubmit();

    expect(toastController.create).toHaveBeenCalledWith({
      message: 'Error de conexión. Por favor, verifica tu conexión a internet.',
      duration: 3000,
      color: 'danger'
    });
  });

  it('should disable submit button when form is invalid', () => {
    const submitButton = fixture.debugElement.nativeElement.querySelector('ion-button[type="submit"]');
    
    // Form is invalid by default
    fixture.detectChanges();
    expect(submitButton.disabled).toBe(true);
    
    // Make form valid
    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'password123',
      recaptchaToken: 'test-token'
    });
    fixture.detectChanges();
    expect(submitButton.disabled).toBe(false);
  });

  it('should show validation errors in template', () => {
    const emailInput = component.loginForm.get('email');
    const passwordInput = component.loginForm.get('password');
    
    // Trigger validation by marking as touched
    emailInput?.markAsTouched();
    passwordInput?.markAsTouched();
    
    fixture.detectChanges();
    
    const errorMessages = fixture.debugElement.nativeElement.querySelectorAll('ion-text[color="danger"]');
    expect(errorMessages.length).toBeGreaterThan(0);
  });
});