import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpErrorResponse } from '@angular/common/http';
import { EventsService } from '../../services/events.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import type { Event } from '../../contracts/events';

@Component({
  selector: 'app-dashboard',
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatNativeDateModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly fb = inject(FormBuilder);
  private readonly eventsService = inject(EventsService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  readonly events = this.eventsService.events;

  readonly eventForm = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    date: this.fb.control<Date | null>(null, [Validators.required]),
    categories: this.fb.array<FormControl<string>>([this.createCategoryControl()]),
  });

  constructor() {
  }

  get categoriesFormArray(): FormArray<FormControl<string>> {
    return this.eventForm.controls.categories;
  }

  addCategoryField(): void {
    this.categoriesFormArray.push(this.createCategoryControl());
  }

  removeCategoryField(): void {
    if (this.categoriesFormArray.length <= 1) {
      return;
    }

    this.categoriesFormArray.removeAt(this.categoriesFormArray.length - 1);
  }

  createEvent(): void {
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }

    const { name, date, categories } = this.eventForm.getRawValue();
    if (!date) {
      return;
    }

    const normalizedCategories = categories
      .map((categoryName) => categoryName.trim())
      .filter((categoryName) => categoryName.length > 0);

    this.eventsService.createEvent({
      name: name.trim(),
      date: date.toISOString().split('T')[0],
      categories: normalizedCategories,
    }).subscribe({
      next: () => {
        this.eventForm.controls.name.setValue('');
        this.eventForm.controls.date.setValue(null);
        this.categoriesFormArray.clear();
        this.addCategoryField();
        this.eventForm.markAsPristine();
        this.eventForm.markAsUntouched();
        this.toast.success('Wydarzenie utworzone');
      },
      error: (err: HttpErrorResponse) => this.toast.error(err),
    });
  }

  deleteEvent(event: Event): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: { message: `Czy na pewno chcesz usunąć wydarzenie "${event.name}"?` },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.eventsService.deleteEvent(event.id).subscribe();
      }
    });
  }

  private createCategoryControl(): FormControl<string> {
    return this.fb.nonNullable.control('');
  }
}

