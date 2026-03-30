import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { ToastService } from '../../services/toast.service';
import { TournamentService } from '../../services/tournament.service';

const SIZE_OPTIONS = [4, 8, 16, 32, 64] as const;
type SizeOption = (typeof SIZE_OPTIONS)[number];

@Component({
  selector: 'app-tournament-settings',
  imports: [
    FormsModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule,
    MatIconModule,
  ],
  templateUrl: './tournament-settings.html',
  styleUrl: './tournament-settings.scss',
})
export class TournamentSettings {
  @Input() eventId!: string;
  @Input() categoryId!: string;
  @Output() settled = new EventEmitter<void>();

  private readonly service = inject(TournamentService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  readonly sizeOptions = SIZE_OPTIONS;
  readonly isSubmitting = signal(false);

  selectedSize: SizeOption = 8;
  lcqEnabled = false;
  lcqSize: SizeOption = 4;
  lcqFrom: number | null = null;
  lcqTo: number | null = null;

  selectSize(s: SizeOption): void {
    this.selectedSize = s;
  }

  selectLcqSize(s: SizeOption): void {
    this.lcqSize = s;
  }

  submit(): void {
    this.dialog
      .open(ConfirmDialog, {
        data: { message: 'Czy na pewno chcesz zatwierdzić ustawienia turnieju?' },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.isSubmitting.set(true);
        const body = {
          size: this.selectedSize,
          lcq: this.lcqEnabled
            ? { size: this.lcqSize, from: this.lcqFrom ?? 0, to: this.lcqTo ?? 0 }
            : null,
        };
        this.service.createSettings(this.eventId, this.categoryId, body).subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.toast.success('Ustawienia turniejowe zatwierdzone');
            this.settled.emit();
          },
          error: (err: HttpErrorResponse) => {
            this.isSubmitting.set(false);
            this.toast.error(err);
          },
        });
      });
  }
}
