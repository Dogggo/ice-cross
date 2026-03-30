import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly config = { horizontalPosition: 'end' as const, verticalPosition: 'top' as const };

  success(message: string): void {
    this.snackBar.open(message, '', { ...this.config, duration: 3000 });
  }

  error(err: HttpErrorResponse | string): void {
    const msg = typeof err === 'string'
      ? err
      : (err.error?.displayMessage ?? 'Wystąpił błąd. Spróbuj ponownie.');
    this.snackBar.open(msg, 'OK', { ...this.config, duration: 5000, panelClass: ['snack-error'] });
  }
}
