import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { ToastService } from '../../services/toast.service';
import { TournamentService } from '../../services/tournament.service';
import { EventsService } from '../../services/events.service';
import { PdfService } from '../../services/pdf.service';
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
  @Input() readonly = false;
  @Output() stateChange = new EventEmitter<void>();

  private readonly service = inject(TournamentService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly eventsService = inject(EventsService);
  private readonly pdf = inject(PdfService);

  readonly eventName = signal('');
  readonly categoryName = signal('');

  readonly isLoading = signal(true);
  readonly isEditMode = signal(false);
  readonly results = signal<LCQResultEntry[]>([]);
  readonly editableResults = signal<LCQResultEntry[]>([]);

  ngOnInit(): void {
    this.loadData();
    this.eventsService.getEventById(this.eventId).subscribe((event) => {
      this.eventName.set(event.name);
      const cat = event.categories.find((c) => c.id === this.categoryId);
      this.categoryName.set(cat?.name ?? '');
    });
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

  downloadPdf(): void {
    const medalFor = (order: number): string => {
      if (order === 1) return '🥇';
      if (order === 2) return '🥈';
      if (order === 3) return '🥉';
      return '';
    };

    const rows = this.results().map((row) => {
      const medal = medalFor(row.order);
      const b1 = this.isBestTime(row, 'first');
      const b2 = this.isBestTime(row, 'second');
      const podium = row.order <= 3 ? 'podium-row' : '';
      return `<tr class="${podium}">
        <td class="col-place"><span class="medal">${medal}</span>${row.order}</td>
        <td class="col-bib">${row.bibNumber}</td>
        <td class="col-name">${row.name}</td>
        <td class="col-placement">${row.LCQ_placement}</td>
        <td class="${b1 ? 'best-time' : ''}">${this.formatTime(row.firstRoundTime)}</td>
        <td class="${b2 ? 'best-time' : ''}">${this.formatTime(row.secondRoundTime)}</td>
      </tr>`;
    }).join('');

    const body = `<table>
      <thead><tr>
        <th class="col-place">Wynik</th>
        <th class="col-bib">Nr</th>
        <th class="col-name">Imię i nazwisko</th>
        <th class="col-placement">Wynik LCQ</th>
        <th>Runda 1</th>
        <th>Runda 2</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer-legend" style="margin-top:12px;font-size:8pt;color:#7a8ea0;">
      <span style="color:#16a34a;font-weight:700;">★</span> — lepszy czas zawodnika uwzględniany przy rozstawieniu
    </div>`;

    this.pdf.open(
      { eventName: this.eventName(), categoryName: this.categoryName(), documentTitle: 'Wyniki LCQ', badge: 'Wyniki LCQ' },
      body,
    );
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
