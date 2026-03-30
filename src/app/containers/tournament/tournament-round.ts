import { Component, Input, Output, EventEmitter, OnInit, inject, signal, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { ToastService } from '../../services/toast.service';
import { TournamentService } from '../../services/tournament.service';
import type { TournamentGroup, PlacementEntry, RacePlacement } from '../../contracts/tournament';

interface ProcessedRow {
  id: string | null;
  bibNumber: number | null;
  name: string;
}

interface ProcessedGroup {
  rows: ProcessedRow[];
  options: string[];
}

@Component({
  selector: 'app-tournament-round',
  imports: [MatButtonModule, MatIconModule, MatDialogModule],
  templateUrl: './tournament-round.html',
  styleUrl: './tournament-round.scss',
})
export class TournamentRound implements OnInit {
  @Input() eventId!: string;
  @Input() categoryId!: string;
  @Output() stateChange = new EventEmitter<void>();

  private readonly service = inject(TournamentService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  readonly isLoading = signal(true);
  readonly currentRound = signal(0);
  readonly groups = signal<TournamentGroup[]>([]);
  readonly placements = signal<Record<string, string>>({});

  readonly isFinalRound = computed(() => this.currentRound() === 4);

  readonly processedGroups = computed((): ProcessedGroup[] =>
    this.groups().map((g) => {
      let n = g.participants.length;
      
      const options = [...Array(n).keys()].map((i) => String(i + 1));
      options.push('DNS');
      const rows: ProcessedRow[] = Array.from({ length: 4 }, (_, i) => {
        const p = g.participants[i];
        return p ? { id: p.id, bibNumber: p.bibNumber, name: p.name } : { id: null, bibNumber: null, name: '' };
      });
      return { rows, options };
    }),
  );

  readonly groupValidities = computed((): boolean[] => {
    const p = this.placements();
    return this.groups().map((g) => {
      const vals = g.participants.map((part) => p[part.id] ?? '');
      if (vals.some((v) => v === '')) return false;
      const numbered = vals.filter((v) => v !== 'DNS');
      return new Set(numbered).size === numbered.length;
    });
  });

  readonly isAllValid = computed(() => this.groupValidities().every(Boolean));

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.service.getCurrentRound(this.eventId, this.categoryId).subscribe((res) => {
      this.currentRound.set(res.currentRound);
      this.groups.set(res.groups);
      const map: Record<string, string> = {};
      res.groups.forEach((g) => g.participants.forEach((p) => {
        map[p.id] = p.placement ?? '';
      }));
      this.placements.set(map);
      this.isLoading.set(false);
    });
  }

  getPlacement(id: string): string {
    return this.placements()[id] ?? '';
  }

  updatePlacement(id: string, event: Event): void {
    const v = (event.target as HTMLSelectElement).value;
    this.placements.update((p) => ({ ...p, [id]: v }));
  }

  private buildPlacements(): PlacementEntry[] {
    const p = this.placements();
    const entries: PlacementEntry[] = [];
    this.groups().forEach((g) =>
      g.participants.forEach((part) => {
        const val = p[part.id] ?? '';
        entries.push({ participantId: part.id, placement: val !== '' ? val as RacePlacement : null });
      }),
    );
    return entries;
  }

  save(): void {
    this.service.putCurrentRound(this.eventId, this.categoryId, { placements: this.buildPlacements() }).subscribe({
      next: () => this.toast.success('Zapisano pomyślnie'),
      error: (err: HttpErrorResponse) => this.toast.error(err),
    });
  }

  confirmRound(): void {
    const isFinal = this.isFinalRound();
    const msg = isFinal
      ? 'Czy chcesz zatwierdzić turniej? Wyniki zostaną zapisane.'
      : 'Czy chcesz zatwierdzić rundę? Przejdziesz do następnej rundy.';
    this.dialog
      .open(ConfirmDialog, { data: { message: msg } })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.service.postCurrentRound(this.eventId, this.categoryId, { placements: this.buildPlacements() }).subscribe({
          next: () => {
            this.toast.success(isFinal ? 'Turniej zatwierdzony' : 'Runda zatwierdzona');
            if (isFinal) {
              this.stateChange.emit();
            } else {
              this.loadData();
            }
          },
          error: (err: HttpErrorResponse) => this.toast.error(err),
        });
      });
  }
}
