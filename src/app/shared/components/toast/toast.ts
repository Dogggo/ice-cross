import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

export interface ToastData {
  message: string;
  type: 'success' | 'error';
}

@Component({
  selector: 'app-toast',
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="toast-inner">
      <mat-icon class="toast-icon">{{ data.type === 'success' ? 'check_circle' : 'error_outline' }}</mat-icon>
      <span class="toast-message">{{ data.message }}</span>
      <button mat-icon-button class="toast-close" (click)="ref.dismiss()">
        <mat-icon>close</mat-icon>
      </button>
    </div>
  `,
})
export class ToastComponent {
  readonly data = inject<ToastData>(MAT_SNACK_BAR_DATA);
  readonly ref = inject(MatSnackBarRef);
}
