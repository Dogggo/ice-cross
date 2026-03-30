import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastComponent } from '../shared/components/toast/toast';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly config = { horizontalPosition: 'end' as const, verticalPosition: 'top' as const };

  success(message: string): void {
    this.snackBar.openFromComponent(ToastComponent, {
      ...this.config,
      duration: 3000,
      panelClass: ['snack-success'],
      data: { message, type: 'success' },
    });
  }

  error(err: HttpErrorResponse | string): void {
    const message = typeof err === 'string'
      ? err
      : (err.error?.displayMessage ?? 'Wystąpił błąd. Spróbuj ponownie.');
    this.snackBar.openFromComponent(ToastComponent, {
      ...this.config,
      duration: 5000,
      panelClass: ['snack-error'],
      data: { message, type: 'error' },
    });
  }
}
