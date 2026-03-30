import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { ToastService } from '../../services/toast.service';
import { TournamentService } from '../../services/tournament.service';
import type { LCQResultEntry } from '../../contracts/tournament';

function msToTimeString(ms: number | null): string {
  if (!ms) return '—';
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(millis).padStart(3, '0')}`;
}

@Component({
  selector: 'app-tournament-lcq-results',
  imports: [MatButtonModule, MatIconModule, MatDialogModule, DragDropModule],
  templateUrl: './tournament-lcq-results.html',
  styleUrl: './tournament-lcq-results.scss',
})
export class TournamentLcqResults implements OnInit {
  @Input() eventId!: string;
  @Input() categoryId!: string;
  @Output() stateChange = new EventEmitter<void>();

  private readonly service = inject(TournamentService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  readonly isLoading = signal(true);
  readonly isEditMode = signal(false);
  readonly results = signal<LCQResultEntry[]>([]);
  readonly editableResults = signal<LCQResultEntry[]>([]);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.service.getLCQResults(this.eventId, this.categoryId).subscribe((res) => {
      const sorted = [...res.results].sort((a, b) => a.order - b.order);
      this.results.set(sorted);
      this.isLoading.set(false);
    });
  }

  formatTime(ms: number | null): string {
    return msToTimeString(ms);
  }

  isBestTime(entry: LCQResultEntry, field: 'first' | 'second'): boolean {
    if (entry.secondRoundTime === null) return false;
    return field === 'first'
      ? entry.firstRoundTime <= entry.secondRoundTime
      : entry.secondRoundTime < entry.firstRoundTime;
  }

  startEdit(): void {
    this.editableResults.set(this.results().map((r) => ({ ...r })));
    this.isEditMode.set(true);
  }

  drop(event: CdkDragDrop<LCQResultEntry[]>): void {
    const arr = this.editableResults().map((r) => ({ ...r }));
    moveItemInArray(arr, event.previousIndex, event.currentIndex);
    this.editableResults.set(arr.map((r, i) => ({ ...r, order: i + 1 })));
  }

  confirmEdit(): void {
    const orders = this.editableResults().map((r) => ({ participantId: r.id, order: r.order }));
    this.service.putLCQResults(this.eventId, this.categoryId, { orders }).subscribe({
      next: () => {
        this.toast.success('Kolejność zapisana');
        this.isEditMode.set(false);
        this.loadData();
      },
      error: (err: HttpErrorResponse) => this.toast.error(err),
    });
  }

  cancelEdit(): void {
    this.isEditMode.set(false);
  }

  proceedToTournament(): void {
    this.dialog
      .open(ConfirmDialog, { data: { message: 'Czy chcesz przejść do turnieju? Kolejność zawodników zostanie zatwierdzona.' } })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        const orders = this.results().map((r) => ({ participantId: r.id, order: r.order }));
        this.service.postLCQResults(this.eventId, this.categoryId, { orders }).subscribe({
          next: () => {
            this.toast.success('Przejście do turnieju zatwierdzone');
            this.stateChange.emit();
          },
          error: (err: HttpErrorResponse) => this.toast.error(err),
        });
      });
  }
}
