import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TimedEliminationService } from '../../services/timed-elimination.service';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import type { GetTimedEliminationResponse } from '../../contracts/timed-elimination';
import { TimedEliminationState } from '../../contracts/timed-elimination';

function parseTime(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2}):(\d{3})$/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60000 + parseInt(match[2], 10) * 1000 + parseInt(match[3], 10);
}

function msToTimeString(ms: number): string {
  if (!ms) return '';
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(millis).padStart(3, '0')}`;
}

export interface ParticipantRow {
  id: string;
  name: string;
  bibNumber: number;
  placement: number;
}

@Component({
  selector: 'app-timed-eliminations',
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
  ],
  templateUrl: './timed-eliminations.html',
  styleUrl: './timed-eliminations.scss',
})
export class TimedEliminations {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TimedEliminationService);
  private readonly dialog = inject(MatDialog);

  readonly eventId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly categoryId = this.route.snapshot.paramMap.get('categoryId') ?? '';

  readonly state = signal<TimedEliminationState | null>(null);
  readonly isSecondRoundSkipped = signal(false);
  readonly participants = signal<ParticipantRow[]>([]);
  readonly isEditMode = signal(false);

  readonly rowFormMap = new Map<string, FormGroup>();

  readonly displayedColumns = computed<string[]>(() => {
    const s = this.state();
    const cols: string[] = [];
    if (s === TimedEliminationState.Filled) cols.push('placement');
    cols.push('bibNumber', 'name', 'round1');
    if (!this.isSecondRoundSkipped()) cols.push('round2');
    return cols;
  });

  readonly allRound1Filled = computed(() =>
    this.participants().every((p) => {
      const val = this.rowFormMap.get(p.id)?.get('round1')?.value ?? '';
      return parseTime(val) !== null;
    }),
  );

  readonly allRound2Filled = computed(() =>
    this.participants().every((p) => {
      const val = this.rowFormMap.get(p.id)?.get('round2')?.value ?? '';
      return parseTime(val) !== null;
    }),
  );

  constructor() {
    this.fetchData();
  }

  fetchData(): void {
    this.service.get(this.eventId, this.categoryId).subscribe((res) => {
      this.applyResponse(res);
    });
  }

  private applyResponse(res: GetTimedEliminationResponse): void {
    this.state.set(res.state);
    this.isSecondRoundSkipped.set(res.isSecondRoundSkipped);
    this.isEditMode.set(false);

    const sorted = [...res.participants].sort((a, b) => a.placement - b.placement);
    this.participants.set(sorted.map((p) => ({
      id: p.id,
      name: p.name,
      bibNumber: p.bibNumber,
      placement: p.placement,
    })));

    sorted.forEach((p) => {
      const r1Disabled = res.state !== TimedEliminationState.Round1;
      const r2Disabled = res.state !== TimedEliminationState.Round2;

      if (!this.rowFormMap.has(p.id)) {
        this.rowFormMap.set(p.id, this.fb.group({
          round1: [{ value: msToTimeString(p.firstRoundTime), disabled: r1Disabled }],
          round2: [{ value: msToTimeString(p.secondRoundTime), disabled: r2Disabled }],
        }));
      } else {
        const group = this.rowFormMap.get(p.id)!;
        group.get('round1')!.setValue(msToTimeString(p.firstRoundTime), { emitEvent: false });
        group.get('round2')!.setValue(msToTimeString(p.secondRoundTime), { emitEvent: false });
        r1Disabled ? group.get('round1')!.disable() : group.get('round1')!.enable();
        r2Disabled ? group.get('round2')!.disable() : group.get('round2')!.enable();
      }
    });
  }

  getControl(id: string, field: 'round1' | 'round2'): FormControl {
    return (this.rowFormMap.get(id)?.get(field) ?? new FormControl()) as FormControl;
  }

  confirmRound1(): void {
    const participants = this.participants().map((p) => ({
      id: p.id,
      roundTime: parseTime(this.rowFormMap.get(p.id)?.get('round1')?.value ?? '') ?? 0,
    }));
    this.service.post(this.eventId, this.categoryId, {
      state: TimedEliminationState.Round1,
      participants,
    }).subscribe(() => this.fetchData());
  }

  confirmRound2(): void {
    const participants = this.participants().map((p) => ({
      id: p.id,
      roundTime: parseTime(this.rowFormMap.get(p.id)?.get('round2')?.value ?? '') ?? 0,
    }));
    this.service.post(this.eventId, this.categoryId, {
      state: TimedEliminationState.Round2,
      participants,
    }).subscribe(() => this.fetchData());
  }

  skipSecondRound(): void {
    this.dialog
      .open(ConfirmDialog, {
        data: { message: 'Czy na pewno chcesz pominąć drugą rundę? Operacja jest nieodwracalna' },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.service.skipSecondRound(this.eventId, this.categoryId).subscribe(() => this.fetchData());
        }
      });
  }

  confirmResults(): void {
    this.dialog
      .open(ConfirmDialog, { data: { message: 'Czy na pewno chcesz zatwierdzic?' } })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.service.confirm(this.eventId, this.categoryId).subscribe(() => this.fetchData());
        }
      });
  }

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.rowFormMap.forEach((group) => {
      group.get('round1')!.enable();
      if (!this.isSecondRoundSkipped()) group.get('round2')!.enable();
    });
  }

  confirmEdit(): void {
    const participants = this.participants().map((p) => ({
      id: p.id,
      firstRoundTime: parseTime(this.rowFormMap.get(p.id)?.get('round1')?.value ?? '') ?? 0,
      secondRoundTime: parseTime(this.rowFormMap.get(p.id)?.get('round2')?.value ?? '') ?? 0,
    }));
    this.service.put(this.eventId, this.categoryId, { participants }).subscribe(() => this.fetchData());
  }

  resetElimination(): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          message:
            'Czy na pewno chcesz zresetowac? Wszystkie dane dotyczace tych eliminacji zostana zresetowane do stanu poczatkowego',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.service.reset(this.eventId, this.categoryId).subscribe(() => this.fetchData());
        }
      });
  }
}

