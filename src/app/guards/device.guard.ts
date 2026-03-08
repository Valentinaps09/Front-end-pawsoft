import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const desktopOnlyGuard = (): boolean => {
  const router = inject(Router);
  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    router.navigate(['/solo-escritorio']);
    return false;
  }

  return true;
};
