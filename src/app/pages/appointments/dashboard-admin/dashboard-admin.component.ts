import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AppSidebarComponent } from 'src/app/share/components/app-sidebar/app-sidebar.component';
import { AdminUserService, AdminUser, StaffCreateRequest, AdminClient, AdminPet } from 'src/app/services/admin-user.service';
import { AuthService } from 'src/app/services/auth';

interface Client {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  enabled: boolean;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  sex: string;
  ownerName: string;
  ownerEmail: string;
  photoUrl?: string;
}

interface StatCard { icon: string; label: string; value: number | string; }

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AppSidebarComponent],
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.scss']
})
export class DashboardAdminComponent implements OnInit {

  userName = '';
  userRole = 'ROLE_ADMIN';

  activeTab: 'usuarios' | 'clientes' | 'mascotas' = 'usuarios';

  users: AdminUser[] = [];
  filteredUsers: AdminUser[] = [];
  userSearch = '';
  userRoleFilter = '';
  userStatusFilter = '';
  userStats: StatCard[] = [];

  showUserModal = false;
  editingUser: AdminUser | null = null;
  userForm!: FormGroup;
  savingUser = false;
  loadingUsers = false;

  // ── Error al guardar usuario ──────────────────────────────────
  saveError = '';
  // ─────────────────────────────────────────────────────────────

  selectedPhotoFile: File | null = null;
  photoPreview: string | null = null;
  uploadingPhoto = false;

  showDeleteModal = false;
  userToDelete: AdminUser | null = null;
  deletingUser = false;

  clients: Client[] = [];
  filteredClients: Client[] = [];
  clientSearch = '';
  showClientDetailModal = false;
  selectedClient: Client | null = null;

  pets: Pet[] = [];
  filteredPets: Pet[] = [];
  petSearch = '';
  petSpeciesFilter = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly adminUserService: AdminUserService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.userName = (localStorage.getItem('email') || '').trim().toLowerCase();
    this.userRole = localStorage.getItem('rol') || 'ROLE_ADMIN';
    this.buildUserForm();
    this.loadUsers();
    this.loadClients();
    this.loadAllPets();
  }

  loadUsers(): void {
    this.loadingUsers = true;
    this.adminUserService.getAll().subscribe({
      next: (data) => {
        this.users = data;
        this.filteredUsers = [...data];
        this.updateStats();
        this.loadingUsers = false;
      },
      error: () => { this.loadingUsers = false; }
    });
  }

  buildUserForm(user?: AdminUser): void {
    this.userForm = this.fb.group({
      name:     [user?.name  || '', Validators.required],
      email:    [user?.email || '', [Validators.required, Validators.email]],
      role:     [user?.role  || '', Validators.required],
      password: ['']
    });
    // Limpiar error al cambiar el email
    this.userForm.get('email')?.valueChanges.subscribe(() => {
      if (this.saveError) this.saveError = '';
    });
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.userForm.get(field);
    return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched));
  }

  onPhotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('La foto no debe superar 2MB.'); return; }
    this.selectedPhotoFile = file;
    const reader = new FileReader();
    reader.onload = () => { this.photoPreview = reader.result as string; };
    reader.readAsDataURL(file);
  }

  removePhoto(): void { this.selectedPhotoFile = null; this.photoPreview = null; }

  openCreateUserModal(): void {
    this.editingUser = null;
    this.selectedPhotoFile = null;
    this.photoPreview = null;
    this.saveError = '';
    this.buildUserForm();
    this.showUserModal = true;
  }

  openEditUserModal(user: AdminUser): void {
    this.editingUser = user;
    this.selectedPhotoFile = null;
    this.photoPreview = user.photoUrl || null;
    this.saveError = '';
    this.buildUserForm(user);
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.showUserModal = true;
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.editingUser = null;
    this.selectedPhotoFile = null;
    this.photoPreview = null;
    this.saveError = '';
  }

  saveUser(): void {
    if (this.userForm.invalid) { this.userForm.markAllAsTouched(); return; }
    this.savingUser = true;
    this.saveError = '';

    const guardar = (photoUrl?: string) => {
      const req: StaffCreateRequest = {
        nombre:   this.userForm.value.name,
        email:    this.userForm.value.email,
        role:     this.userForm.value.role,
        photoUrl: photoUrl ?? this.editingUser?.photoUrl ?? ''
      };

      const op = this.editingUser?.id
        ? this.adminUserService.update(this.editingUser.id, req)
        : this.adminUserService.create(req);

      op.subscribe({
        next: () => {
          this.loadUsers();
          this.savingUser = false;
          this.closeUserModal();
        },
        error: (err) => {
          this.savingUser = false;
          const msg: string = err?.error?.message || err?.error || '';
          const isDuplicate =
            err?.status === 409 ||
            msg.toLowerCase().includes('duplicate') ||
            msg.toLowerCase().includes('already') ||
            msg.toLowerCase().includes('exist') ||
            msg.toLowerCase().includes('en uso') ||
            msg.toLowerCase().includes('registrado');

          if (isDuplicate) {
            this.saveError = 'Este correo ya está en uso. Por favor ingresa un correo diferente para continuar.';
          } else {
            this.saveError = 'Ocurrió un error al guardar el usuario. Intenta de nuevo.';
          }
        }
      });
    };

    if (this.selectedPhotoFile) {
      this.uploadingPhoto = true;
      this.adminUserService.uploadPhoto(this.selectedPhotoFile).subscribe({
        next: (res) => { this.uploadingPhoto = false; guardar(res.secure_url); },
        error: () => { this.uploadingPhoto = false; this.savingUser = false; }
      });
    } else {
      guardar();
    }
  }

  toggleUserStatus(user: AdminUser): void {
    if (!user.id) return;
    this.adminUserService.toggleStatus(user.id).subscribe({
      next: () => { user.enabled = !user.enabled; this.updateStats(); },
      error: () => {}
    });
  }

  openDeleteModal(user: AdminUser): void {
    if (user.email.trim().toLowerCase() === this.userName){
      alert('No puedes eliminarte a ti mismo.');
      return;
    }
    this.userToDelete = user;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void { this.showDeleteModal = false; this.userToDelete = null; }

  deleteUser(): void {
    if (!this.userToDelete?.id) return;
    this.deletingUser = true;
    this.adminUserService.delete(this.userToDelete.id).subscribe({
      next: () => { this.loadUsers(); this.deletingUser = false; this.closeDeleteModal(); },
      error: () => { this.deletingUser = false; }
    });
  }

  filterUsers(): void {
    const s = this.userSearch.toLowerCase();
    this.filteredUsers = this.users.filter(u => {
      const matchSearch = `${u.name} ${u.email}`.toLowerCase().includes(s);
      const matchRole   = !this.userRoleFilter   || u.role === this.userRoleFilter;
      const matchStatus = !this.userStatusFilter
        || (this.userStatusFilter === 'active' ? u.enabled : !u.enabled);
      return matchSearch && matchRole && matchStatus;
    });
  }

  filterClients(): void {
    const s = this.clientSearch.toLowerCase();
    this.filteredClients = this.clients.filter(c =>
      `${c.name} ${c.email}`.toLowerCase().includes(s));
  }

  filterPets(): void {
    const s = this.petSearch.toLowerCase();
    this.filteredPets = this.pets.filter(p => {
      const match = `${p.name} ${p.ownerName}`.toLowerCase().includes(s);
      return match && (!this.petSpeciesFilter || p.species === this.petSpeciesFilter);
    });
  }

  updateStats(): void {
    this.userStats = [
      { icon: '👥', label: 'Total Staff',    value: this.users.length },
      { icon: '🩺', label: 'Veterinarios',   value: this.users.filter(u => u.role === 'ROLE_VETERINARIO').length },
      { icon: '🗂️', label: 'Recepcionistas', value: this.users.filter(u => u.role === 'ROLE_RECEPCIONISTA').length },
      { icon: '✅', label: 'Activos',        value: this.users.filter(u => u.enabled).length }
    ];
  }

  setTab(tab: 'usuarios' | 'clientes' | 'mascotas'): void { this.activeTab = tab; }

  getActiveTabLabel(): string {
    return { usuarios: 'Gestión de Usuarios', clientes: 'Clientes', mascotas: 'Mascotas' }[this.activeTab];
  }

  getActiveTabSub(): string {
    return {
      usuarios: 'Administra veterinarios, recepcionistas y administradores',
      clientes: 'Visualiza clientes registrados',
      mascotas: 'Listado de mascotas con propietarios'
    }[this.activeTab];
  }

  getUserInitials(user: AdminUser): string {
    const parts = user.name?.split(' ') ?? [];
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }

  getUserInitialsFromName(name: string): string {
    const parts = name?.split(' ') ?? [];
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }

  getRoleLabel(role: string): string {
    return { ROLE_VETERINARIO: 'Veterinario', ROLE_RECEPCIONISTA: 'Recepcionista', ROLE_ADMIN: 'Admin' }[role] || role;
  }

  getRoleClass(role: string): string {
    return { ROLE_VETERINARIO: 'role-vet', ROLE_RECEPCIONISTA: 'role-recep', ROLE_ADMIN: 'role-admin' }[role] || '';
  }

  openClientDetail(client: Client): void { this.selectedClient = client; this.showClientDetailModal = true; }
  closeClientDetail(): void { this.showClientDetailModal = false; this.selectedClient = null; }

  loadClients(): void {
    this.adminUserService.getClients().subscribe({
      next: (data) => {
        this.clients = data.map(c => ({
          id: c.id, name: c.name, email: c.email,
          photoUrl: c.photoUrl, enabled: c.enabled
        }));
        this.filteredClients = [...this.clients];
      },
      error: () => {}
    });
  }

  loadAllPets(): void {
    this.adminUserService.getAllPets().subscribe({
      next: (data) => {
        this.pets = data.map(p => ({
          id: String(p.id), name: p.name, species: p.species,
          breed: p.breed || '—', sex: p.sex,
          ownerName: p.ownerName, ownerEmail: p.ownerEmail, photoUrl: p.photoUrl
        }));
        this.filteredPets = [...this.pets];
      },
      error: () => {}
    });
  }

  getEmojiBySpecies(species: string): string {
    switch (species) {
      case 'Perro':   return '🐕';
      case 'Gato':    return '🐈';
      case 'Conejo':  return '🐰';
      case 'Ave':     return '🦜';
      case 'Hamster': return '🐹';
      default:        return '🐾';
    }
  }

  getClientPets(clientEmail: string): Pet[] {
    return this.pets.filter(p => p.ownerEmail === clientEmail);
  }
}
