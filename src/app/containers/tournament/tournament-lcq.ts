import { Component, Input, Output, EventEmitter, OnInit, inject, signal, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { ToastService } from '../../services/toast.service';
import { TournamentService } from '../../services/tournament.service';
import type { LCQGroup, PlacementEntry, RacePlacement } from '../../contracts/tournament';

interface ProcessedRow {
  id: string | null;
  bibNumber: number | null;
  name: string;
}

interface ProcessedGroup {
  rows: ProcessedRow[];
  options: string[];
  participants: { id: string }[];
}

@Component({
  selector: 'app-tournament-lcq',
  imports: [MatButtonModule, MatIconModule, MatDialogModule],
  templateUrl: './tournament-lcq.html',
  styleUrl: './tournament-lcq.scss',
})
export class TournamentLcq implements OnInit {
  @Input() eventId!: string;
  @Input() categoryId!: string;
  @Output() stateChange = new EventEmitter<void>();

  private readonly service = inject(TournamentService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  readonly isLoading = signal(true);
  readonly groups = signal<LCQGroup[]>([]);
  readonly placements = signal<Record<string, string>>({});

  readonly processedGroups = computed((): ProcessedGroup[] =>
    this.groups().map((g) => {
      const n = g.participants.length;
      const options = [...Array(n).keys()].map((i) => String(i + 1));
      options.push('DNS');
      const rows: ProcessedRow[] = Array.from({ length: 4 }, (_, i) => {
        const p = g.participants[i];
        return p ? { id: p.id, bibNumber: p.bibNumber, name: p.name } : { id: null, bibNumber: null, name: '' };
      });
      return { rows, options, participants: g.participants.map((p) => ({ id: p.id })) };
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
    this.service.getLCQ(this.eventId, this.categoryId).subscribe((res) => {
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

  private buildPlacements(includeEmpty: boolean): PlacementEntry[] {
    const p = this.placements();
    const entries: PlacementEntry[] = [];
    this.groups().forEach((g) =>
      g.participants.forEach((part) => {
        const val = p[part.id] ?? '';
        if (val !== '' || includeEmpty) {
          entries.push({ participantId: part.id, placement: val !== '' ? val as RacePlacement : null });
        }
      }),
    );
    return entries;
  }

  save(): void {
    this.service.putLCQ(this.eventId, this.categoryId, { placements: this.buildPlacements(false) }).subscribe({
      next: () => this.toast.success('Zapisano pomyślnie'),
      error: (err: HttpErrorResponse) => this.toast.error(err),
    });
  }

  confirm(): void {
    this.dialog
      .open(ConfirmDialog, { data: { message: 'Czy chcesz zatwierdzić LCQ? Operacja jest nieodwracalna.' } })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.service.postLCQ(this.eventId, this.categoryId, { placements: this.buildPlacements(true) }).subscribe({
          next: () => {
            this.toast.success('LCQ zatwierdzone');
            this.stateChange.emit();
          },
          error: (err: HttpErrorResponse) => this.toast.error(err),
        });
      });
  }
}
