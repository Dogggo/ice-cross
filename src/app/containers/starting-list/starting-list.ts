import { Component, inject, signal } from '@angular/core';
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
import { EventsService } from '../../services/events.service';
import { StartingListService } from '../../services/starting-list.service';
import type { GetEventDetailsResponse } from '../../contracts/events';
import type { CreateStartingListRequestBody, GetStartingListResponse } from '../../contracts/starting-list';

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

  readonly eventId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly eventName = signal('');
  readonly categories = signal<GetEventDetailsResponse['categories']>([]);
  readonly participants: Record<string, Participant[]> = {};
  readonly displayedColumns = ['nr', 'name', 'club', 'dob', 'zgoda', 'obecny'];
  readonly forms: Record<string, FormGroup> = {};
  readonly isReadOnly = signal(false);
  readonly validationError = signal('');
  submitSuccess = false;

  constructor() {
    this.eventsService.getEventById(this.eventId).subscribe((event) => {
      this.eventName.set(event.name);
      this.categories.set(event.categories);
      event.categories.forEach((cat: GetEventDetailsResponse['categories'][number]) => {
        if (!this.participants[cat.id]) {
          this.participants[cat.id] = [];
        }
        if (!this.forms[cat.id]) {
          this.forms[cat.id] = this.fb.group({
            name: ['', Validators.required],
            club: [''],
            dob: [null],
          });
        }
      });

      this.startingListService.getStartingList(this.eventId).subscribe((res: GetStartingListResponse) => {
        res.forEach((entry) => {
          this.participants[entry.categoryId] = entry.participants.map((p) => ({
            bibNumber: p.bibNumber,
            name: p.name,
            club: p.sportClub,
            dob: p.dob,
            consent: p.consent,
            present: p.present,
          }));
        });

        const allFilled = this.categories().every(
          (cat) => (this.participants[cat.id] ?? []).length > 0,
        );
        if (allFilled) {
          this.isReadOnly.set(true);
        }
      });
    });
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

  submitStartingList(): void {
    const allValid = this.categories().every((cat: GetEventDetailsResponse['categories'][number]) => {
      const list = this.participants[cat.id] ?? [];
      return list.length > 0 && list.every((p) => p.bibNumber !== null);
    });

    if (!allValid) {
      this.validationError.set('Aby zatwierdzic, wypelnij wszystkie kategorie');
      return;
    }

    this.validationError.set('');

    const body: CreateStartingListRequestBody = this.categories().map((cat: GetEventDetailsResponse['categories'][number]) => ({
      categoryId: cat.id,
      participants: (this.participants[cat.id] ?? []).map((p) => ({
        name: p.name,
        bibNumber: p.bibNumber ?? 0,
        sportClub: p.club,
        dob: p.dob,
        consent: p.consent,
        present: p.present,
      })),
    }));

    this.startingListService.submitStartingList(this.eventId, body).subscribe({
      next: () => {
        this.submitSuccess = true;
        this.isReadOnly.set(true);
      },
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
    };
    reader.readAsText(file);
  }
}

