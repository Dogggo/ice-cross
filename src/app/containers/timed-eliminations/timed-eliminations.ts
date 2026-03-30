import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { TimedEliminationService } from '../../services/timed-elimination.service';
import { ToastService } from '../../services/toast.service';
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
  resigned: boolean;
}

@Component({
  selector: 'app-timed-eliminations',
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);

  readonly eventId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly categoryId = this.route.snapshot.paramMap.get('categoryId') ?? '';

  readonly state = signal<TimedEliminationState | null>(null);
  readonly isSecondRoundSkipped = signal(false);
  readonly participants = signal<ParticipantRow[]>([]);
  readonly isEditMode = signal(false);
  readonly focusedParticipantId = signal<string | null>(null);

  readonly rowFormMap = new Map<string, FormGroup>();
  private readonly formTick = signal(0);

  readonly displayedColumns = computed<string[]>(() => {
    const s = this.state();
    const cols: string[] = [];
    if (s === TimedEliminationState.Filled || s === TimedEliminationState.Finished) cols.push('placement');
    cols.push('bibNumber', 'name', 'round1');
    if (!this.isSecondRoundSkipped()) cols.push('round2');
    if (s === TimedEliminationState.Filled || s === TimedEliminationState.Finished || this.isEditMode()) cols.push('resigned');
    return cols;
  });

  readonly isInputActiveState = computed(() => {
    const s = this.state();
    return s === TimedEliminationState.Round1 || s === TimedEliminationState.Round2 || this.isEditMode();
  });

  readonly allRound1Filled = computed(() => {
    this.formTick();
    return this.participants().every((p) => {
      const val = this.rowFormMap.get(p.id)?.get('round1')?.value ?? '';
      return parseTime(val) !== null;
    });
  });

  readonly allRound2Filled = computed(() => {
    this.formTick();
    return this.participants().every((p) => {
      const val = this.rowFormMap.get(p.id)?.get('round2')?.value ?? '';
      return parseTime(val) !== null;
    });
  });

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

    const sorted = [...res.participants].sort((a, b) => {
      if (a.resigned !== b.resigned) return a.resigned ? 1 : -1;
      return a.placement - b.placement;
    });
    this.participants.set(sorted.map((p) => ({
      id: p.id,
      name: p.name,
      bibNumber: p.bibNumber,
      placement: p.placement,
      resigned: p.resigned ?? false,
    })));

    sorted.forEach((p) => {
      const r1Disabled = res.state !== TimedEliminationState.Round1;
      const r2Disabled = res.state !== TimedEliminationState.Round2;

      if (!this.rowFormMap.has(p.id)) {
        const group = this.fb.group({
          round1: [{ value: msToTimeString(p.firstRoundTime), disabled: r1Disabled }],
          round2: [{ value: msToTimeString(p.secondRoundTime), disabled: r2Disabled }],
          resigned: [{ value: p.resigned ?? false, disabled: true }],
        });
        this.rowFormMap.set(p.id, group);
        group.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
          this.formTick.update((v) => v + 1);
        });
      } else {
        const group = this.rowFormMap.get(p.id)!;
        group.get('round1')!.setValue(msToTimeString(p.firstRoundTime), { emitEvent: false });
        group.get('round2')!.setValue(msToTimeString(p.secondRoundTime), { emitEvent: false });
        group.get('resigned')!.setValue(p.resigned ?? false, { emitEvent: false });
        r1Disabled ? group.get('round1')!.disable() : group.get('round1')!.enable();
        r2Disabled ? group.get('round2')!.disable() : group.get('round2')!.enable();
        group.get('resigned')!.disable();
      }
    });
  }

  getControl(id: string, field: 'round1' | 'round2'): FormControl {
    return (this.rowFormMap.get(id)?.get(field) ?? new FormControl()) as FormControl;
  }

  getResignedControl(id: string): FormControl<boolean> {
    return (this.rowFormMap.get(id)?.get('resigned') ?? new FormControl(false)) as FormControl<boolean>;
  }

  confirmRound1(): void {
    const participants = this.participants().map((p) => ({
      id: p.id,
      roundTime: parseTime(this.rowFormMap.get(p.id)?.get('round1')?.value ?? '') ?? 0,
      resigned: this.rowFormMap.get(p.id)?.get('resigned')?.value ?? false,
    }));
    this.service.post(this.eventId, this.categoryId, {
      state: TimedEliminationState.Round1,
      participants,
    }).subscribe({
      next: () => { this.toast.success('Runda 1 zatwierdzona'); this.fetchData(); },
      error: (err: HttpErrorResponse) => this.toast.error(err),
    });
  }

  confirmRound2(): void {
    const participants = this.participants().map((p) => ({
      id: p.id,
      roundTime: parseTime(this.rowFormMap.get(p.id)?.get('round2')?.value ?? '') ?? 0,
      resigned: this.rowFormMap.get(p.id)?.get('resigned')?.value ?? false,
    }));
    this.service.post(this.eventId, this.categoryId, {
      state: TimedEliminationState.Round2,
      participants,
    }).subscribe({
      next: () => { this.toast.success('Runda 2 zatwierdzona'); this.fetchData(); },
      error: (err: HttpErrorResponse) => this.toast.error(err),
    });
  }

  skipSecondRound(): void {
    this.dialog
      .open(ConfirmDialog, {
        data: { message: 'Czy na pewno chcesz pominąć drugą rundę? Operacja jest nieodwracalna' },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.service.skipSecondRound(this.eventId, this.categoryId).subscribe({
            next: () => { this.toast.success('Pominięto drugą rundę'); this.fetchData(); },
            error: (err: HttpErrorResponse) => this.toast.error(err),
          });
        }
      });
  }

  confirmResults(): void {
    this.dialog
      .open(ConfirmDialog, { data: { message: 'Czy na pewno chcesz zatwierdzic?' } })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.service.confirm(this.eventId, this.categoryId).subscribe({
            next: () => { this.toast.success('Wyniki zatwierdzone'); this.fetchData(); },
            error: (err: HttpErrorResponse) => this.toast.error(err),
          });
        }
      });
  }

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.rowFormMap.forEach((group) => {
      group.get('round1')!.enable();
      if (!this.isSecondRoundSkipped()) group.get('round2')!.enable();
      group.get('resigned')!.enable();
    });
  }

  setFocusedRow(id: string): void {
    this.focusedParticipantId.set(id);
  }

  clearFocusedRow(): void {
    this.focusedParticipantId.set(null);
  }

  isBestTime(id: string, round: 'round1' | 'round2'): boolean {
    const s = this.state();
    if (s !== TimedEliminationState.Filled && s !== TimedEliminationState.Finished) return false;
    if (this.isSecondRoundSkipped()) return false;
    const p = this.participants().find((x) => x.id === id);
    if (!p || p.resigned) return false;
    const group = this.rowFormMap.get(id);
    const r1 = parseTime(group?.get('round1')?.value ?? '') ?? Infinity;
    const r2 = parseTime(group?.get('round2')?.value ?? '') ?? Infinity;
    if (r1 === Infinity || r2 === Infinity) return false;
    return round === 'round1' ? r1 <= r2 : r2 < r1;
  }

  confirmEdit(): void {
    const participants = this.participants().map((p) => ({
      id: p.id,
      firstRoundTime: parseTime(this.rowFormMap.get(p.id)?.get('round1')?.value ?? '') ?? 0,
      secondRoundTime: parseTime(this.rowFormMap.get(p.id)?.get('round2')?.value ?? '') ?? 0,
      resigned: this.rowFormMap.get(p.id)?.get('resigned')?.value ?? false,
    }));
    this.service.put(this.eventId, this.categoryId, { participants }).subscribe({
      next: () => { this.toast.success('Zmiany zapisane'); this.fetchData(); },
      error: (err: HttpErrorResponse) => this.toast.error(err),
    });
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

