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
import { MatIconModule } from '@angular/material/icon';
import { HttpErrorResponse } from '@angular/common/http';
import { TimedEliminationService } from '../../services/timed-elimination.service';
import { ToastService } from '../../services/toast.service';
import { EventsService } from '../../services/events.service';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import type { GetTimedEliminationResponse } from '../../contracts/timed-elimination';
import { TimedEliminationState } from '../../contracts/timed-elimination';

function parseTime(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2}):(\d{3})$/);
  if (!match) return null;
  const min = parseInt(match[1], 10);
  const sec = parseInt(match[2], 10);
  if (min > 59 || sec > 59) return null;
  return min * 60000 + sec * 1000 + parseInt(match[3], 10);
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
    MatIconModule,
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
  private readonly eventsService = inject(EventsService);

  readonly eventId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly categoryId = this.route.snapshot.paramMap.get('categoryId') ?? '';

  readonly state = signal<TimedEliminationState | null>(null);
  readonly isSecondRoundSkipped = signal(false);
  readonly participants = signal<ParticipantRow[]>([]);
  readonly isEditMode = signal(false);
  readonly focusedParticipantId = signal<string | null>(null);
  readonly eventName = signal('');
  readonly categoryName = signal('');

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
    this.eventsService.getEventById(this.eventId).subscribe((event) => {
      this.eventName.set(event.name);
      const cat = event.categories.find((c) => c.id === this.categoryId);
      this.categoryName.set(cat?.name ?? '');
    });
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

  isTimeInvalid(id: string, field: 'round1' | 'round2'): boolean {
    const val = (this.rowFormMap.get(id)?.get(field)?.value ?? '').trim();
    if (val === '') return false;
    const match = val.match(/^(\d{1,2}):(\d{2}):(\d{3})$/);
    if (!match) return true;
    const min = parseInt(match[1], 10);
    const sec = parseInt(match[2], 10);
    return min > 59 || sec > 59;
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

  downloadPdf(): void {
    const isSkipped = this.isSecondRoundSkipped();
    const now = new Date();
    const dateStr = now.toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' });
    const timestampStr = now.toLocaleString('pl-PL');

    const medalFor = (placement: number): string => {
      if (placement === 1) return '🥇';
      if (placement === 2) return '🥈';
      if (placement === 3) return '🥉';
      return '';
    };

    const rows = this.participants().map((p) => {
      const r1Val = this.rowFormMap.get(p.id)?.get('round1')?.value ?? '—';
      const r2Val = isSkipped ? null : (this.rowFormMap.get(p.id)?.get('round2')?.value ?? '—');
      const b1 = this.isBestTime(p.id, 'round1');
      const b2 = this.isBestTime(p.id, 'round2');
      const medal = medalFor(p.placement);
      const placementDisplay = p.placement != null ? String(p.placement) : '-';
      const r2Cell = isSkipped ? '' : `<td class="col-time${b2 ? ' best-time' : ''}">${r2Val ?? '—'}</td>`;
      return `<tr class="${p.resigned ? 'row-resigned' : ''}">
        <td class="col-place"><span class="medal">${medal}</span><span class="place-num">${placementDisplay}</span></td>
        <td class="col-bib">${p.bibNumber}</td>
        <td class="col-name name-cell">${p.name}</td>
        <td class="col-time${b1 ? ' best-time' : ''}">${r1Val}</td>
        ${r2Cell}
      </tr>`;
    }).join('');

    const r2Header = isSkipped ? '' : '<th class="col-time">Runda 2</th>';
    const legendHtml = isSkipped ? '' : `
      <div class="legend-row">
        <div class="legend-item"><span class="legend-star">★</span>Lepszy czas zawodnika (uwzględniany przy rozstawieniu)</div>
        <div class="legend-item ml-auto">DNS — zawodnik wycofany z rywalizacji</div>
      </div>`;

    const categoryName = this.categoryName() || 'Kategoria';
    const eventName = this.eventName();

    const html = `<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8">
<title>Eliminacje Czasowe — ${categoryName}</title><style>
@page{margin:16mm 14mm 20mm}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:10.5pt;color:#1a2744;background:#fff}
.header{background:#1a2744;color:#fff;padding:22px 28px 20px;border-radius:8px;margin-bottom:26px;display:flex;justify-content:space-between;align-items:flex-start}
.header-badge{font-size:7pt;text-transform:uppercase;letter-spacing:2.5px;color:rgba(255,255,255,.45);margin-bottom:7px}
.header-title{font-size:20pt;font-weight:700;letter-spacing:-.5px;line-height:1.15;margin-top:2px}
.header-event{font-size:10.5pt;color:rgba(255,255,255,.65);margin-top:6px}
.header-right{text-align:right;font-size:8pt;color:rgba(255,255,255,.45);line-height:1.9;flex-shrink:0;padding-left:24px}
.header-right strong{display:block;font-size:10pt;color:rgba(255,255,255,.85);font-weight:600;margin-bottom:2px}
table{width:100%;border-collapse:collapse}
th{padding:10px 14px;text-align:left;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#5a7184;background:#f0f4f8;border-bottom:2px solid #dde3ea}
td{padding:9px 14px;border-bottom:1px solid #edf0f5;font-size:10pt;vertical-align:middle}
tr:nth-child(even) td{background:#f9fbfd}tr:last-child td{border-bottom:none}
.col-place{width:62px;font-weight:700}.col-bib{width:46px;color:#8a9bb0;font-size:9pt}
.col-name{font-weight:500}.col-time{font-family:'Consolas','Courier New',monospace;font-size:9.5pt;white-space:nowrap}
.best-time{color:#16a34a;font-weight:700}.best-time::after{content:' ★';font-size:8pt}
.medal{font-size:12pt;margin-right:2px}.place-num{font-size:10.5pt}
.row-resigned td{background:#fafafa!important;color:#b8c4ce!important}
.row-resigned .name-cell::after{content:' — DNS';font-size:8.5pt;color:#b8c4ce;font-style:italic}
.legend-row{margin-top:14px;display:flex;gap:16px;font-size:8pt;color:#7a8ea0;flex-wrap:wrap}
.legend-item{display:flex;align-items:center;gap:5px}.ml-auto{margin-left:auto}
.legend-star{color:#16a34a;font-size:9pt;font-weight:700;margin-right:2px}
.footer{margin-top:22px;padding-top:11px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:7.5pt;color:#9aa8b5}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="header">
  <div class="header-left">
    <div class="header-badge">Ice Cross &mdash; Eliminacje Czasowe</div>
    <div class="header-title">${categoryName}</div>
    <div class="header-event">${eventName}</div>
  </div>
  <div class="header-right"><strong>${dateStr}</strong>Wygenerowano przez<br>system Ice Cross</div>
</div>
<table>
  <thead><tr><th class="col-place">Wynik</th><th class="col-bib">Nr</th><th class="col-name">Imię i nazwisko</th><th class="col-time">Runda 1</th>${r2Header}</tr></thead>
  <tbody>${rows}</tbody>
</table>
${legendHtml}
<div class="footer"><span>Ice Cross &mdash; System zarządzania zawodami</span><span>${timestampStr}</span></div>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`;

    const win = window.open('', '_blank', 'width=960,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }
}

