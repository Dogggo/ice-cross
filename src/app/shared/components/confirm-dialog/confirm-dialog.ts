import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface ConfirmDialogData {
  message: string;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <div mat-dialog-content style="padding: 24px 24px 8px;">
      <p style="margin: 0; font-size: 16px;">{{ data.message }}</p>
    </div>
    <div mat-dialog-actions style="justify-content: flex-end; padding: 8px 16px 16px; gap: 8px;">
      <button mat-stroked-button [mat-dialog-close]="false">Nie</button>
      <button mat-flat-button [mat-dialog-close]="true">Tak</button>
    </div>
  `,
})
export class ConfirmDialog {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<ConfirmDialog>);
}
