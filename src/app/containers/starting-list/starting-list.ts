import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpErrorResponse } from '@angular/common/http';
import { EventsService } from '../../services/events.service';
import { StartingListService } from '../../services/starting-list.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import type { GetEventDetailsResponse } from '../../contracts/events';
import type { CreateStartingListCategoryRequestBody, GetStartingListResponse } from '../../contracts/starting-list';

export interface Participant {
  bibNumber: number | null;
  name: string;
  club: string;
  dob: string;
  consent: boolean;
  present: boolean;
}

@Component({
  selector: 'app-starting-list',
  imports: [
    ReactiveFormsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatIconModule,
    MatTooltipModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './starting-list.html',
  styleUrl: './starting-list.scss',
})
export class StartingList {
  private readonly route = inject(ActivatedRoute);
  private readonly eventsService = inject(EventsService);
  private readonly startingListService = inject(StartingListService);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);

  readonly eventId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly eventName = signal('');
  readonly categories = signal<GetEventDetailsResponse['categories']>([]);
  readonly participants: Record<string, Participant[]> = {};
  readonly displayedColumns = ['nr', 'name', 'club', 'dob', 'zgoda', 'obecny', 'actions'];
  readonly forms: Record<string, FormGroup> = {};
  readonly lockedCategories: Record<string, boolean> = {};
  readonly validationErrors: Record<string, string> = {};
  /** Count of participants with both present+consent flag, from the last server response */
  readonly savedEligibleCount: Record<string, number> = {};

  readonly csvTooltip = [
    'Plik musi być w formacie CSV. Przykład formatowania:',
    '1,Jan Kowalski,KS Górnik Katowice,1995-03-15',
    '2,Anna Nowak,SKI Zakopane,1998-07-22',
    '',
    'Jeżeli nie chcesz wprowadzać numerów startowych:',
    ',Jan Kowalski,KS Górnik Katowice,1995-03-15',
    ',Anna Nowak,SKI Zakopane,1998-07-22',
  ].join('\n');

  constructor() {
    this.eventsService.getEventById(this.eventId).subscribe((event) => {
      this.eventName.set(event.name);
      this.categories.set(event.categories);
      event.categories.forEach((cat) => {
        if (!this.participants[cat.id]) this.participants[cat.id] = [];
        this.lockedCategories[cat.id] = false;
        this.validationErrors[cat.id] = '';
        this.savedEligibleCount[cat.id] = 0;
        if (!this.forms[cat.id]) {
          this.forms[cat.id] = this.fb.group({
            name: ['', Validators.required],
            club: [''],
            dob: [null],
          });
        }
      });

      this.startingListService.getStartingList(this.eventId).subscribe((res: GetStartingListResponse) => {
        this.applyStartingListResponse(res);
      });
    });
  }

  private applyStartingListResponse(res: GetStartingListResponse): void {
    res.forEach((entry) => {
      this.lockedCategories[entry.categoryId] = entry.startingListLocked;
      this.participants[entry.categoryId] = entry.participants.map((p) => ({
        bibNumber: p.bibNumber,
        name: p.name,
        club: p.sportClub,
        dob: p.dob,
        consent: p.consent,
        present: p.present,
      }));
      this.savedEligibleCount[entry.categoryId] = entry.participants.filter((p) => p.present && p.consent).length;
    });
    this.cdr.markForCheck();
  }

  isCategoryLocked(categoryId: string): boolean {
    return this.lockedCategories[categoryId] ?? false;
  }

  canLockCategory(categoryId: string): boolean {
    return (this.savedEligibleCount[categoryId] ?? 0) >= 4;
  }

  lockInfoTooltip(categoryId: string): string {
    const count = this.savedEligibleCount[categoryId] ?? 0;
    if (count >= 4) {
      return `Lista spełnia warunki — ${count} uczestników jest obecnych i ma podpisaną zgodę.`;
    }
    return `Zapisz listę, aby zaktualizować stan. Potrzebne są co najmniej 4 osoby z zaznaczonymi polami „Obecny” i „Zgoda”. Wg ostatniego zapisu: ${count} z 4.`;
  }

  addParticipant(categoryId: string): void {
    const form = this.forms[categoryId];
    if (!form || form.invalid) return;
    const val = form.getRawValue();
    const dob = val.dob ? new Date(val.dob).toISOString().split('T')[0] : '';
    this.participants[categoryId] = [
      ...(this.participants[categoryId] ?? []),
      { bibNumber: null, name: val.name, club: val.club, dob, consent: false, present: false },
    ];
    form.reset();
  }

  updateBibNumber(categoryId: string, index: number, value: string): void {
    const num = parseInt(value, 10);
    this.participants[categoryId][index].bibNumber = isNaN(num) ? null : num;
  }

  updateParticipant(categoryId: string, index: number, updates: Partial<Participant>): void {
    this.participants[categoryId][index] = { ...this.participants[categoryId][index], ...updates };
  }

  removeParticipant(categoryId: string, index: number): void {
    this.participants[categoryId] = this.participants[categoryId].filter((_, i) => i !== index);
  }

  submitStartingList(categoryId: string): void {
    const list = this.participants[categoryId] ?? [];
    if (list.length === 0) {
      this.validationErrors[categoryId] = 'Lista nie może być pusta.';
      return;
    }
    this.validationErrors[categoryId] = '';

    const body: CreateStartingListCategoryRequestBody = list.map((p) => ({
      name: p.name,
      bibNumber: p.bibNumber ?? 0,
      sportClub: p.club,
      dob: p.dob,
      consent: p.consent,
      present: p.present,
    }));

    this.startingListService.submitStartingList(this.eventId, categoryId, body).subscribe({
      next: () => {
        this.toast.success('Lista zapisana pomyślnie');
        this.startingListService.getStartingList(this.eventId).subscribe((res: GetStartingListResponse) => {
          this.applyStartingListResponse(res);
        });
      },
      error: (err: HttpErrorResponse) => this.toast.error(err),
    });
  }

  lockStartingList(categoryId: string): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: { message: 'Czy chcesz zatwierdzić listę? Po zatwierdzeniu, nie będzie można jej edytować.' },
    });
    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.startingListService.lockStartingList(this.eventId, categoryId).subscribe({
          next: () => {
            this.lockedCategories[categoryId] = true;
            this.cdr.markForCheck();
            this.toast.success('Lista zatwierdzona');
          },
          error: (err: HttpErrorResponse) => this.toast.error(err),
        });
      }
    });
  }

  onCsvUpload(event: Event, categoryId: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const newParticipants: Participant[] = lines.map((line) => {
        const parts = line.split(/[,;]/);
        return {
          bibNumber: parseInt(parts[0]?.trim() ?? '0', 10) || null,
          name: parts[1]?.trim() ?? '',
          club: parts[2]?.trim() ?? '',
          dob: parts[3]?.trim() ?? '',
          consent: false,
          present: false,
        };
      });
      this.participants[categoryId] = [
        ...(this.participants[categoryId] ?? []),
        ...newParticipants,
      ];
      input.value = '';
      this.cdr.markForCheck();
    };
    reader.readAsText(file);
  }
}
