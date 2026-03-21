import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatNativeDateModule } from '@angular/material/core';
import { EventsService } from '../../services/events.service';
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
    MatListModule,
    MatNativeDateModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly fb = inject(FormBuilder);
  private readonly eventsService = inject(EventsService);

  readonly events = signal<Event[]>([]);

  readonly eventForm = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    date: this.fb.control<Date | null>(null, [Validators.required]),
    categories: this.fb.array<FormControl<string>>([this.createCategoryControl()]),
  });

  constructor() {
    this.fetchEvents();
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
    }).subscribe(() => {
      this.eventForm.controls.name.setValue('');
      this.eventForm.controls.date.setValue(null);
      this.categoriesFormArray.clear();
      this.addCategoryField();
      this.eventForm.markAsPristine();
      this.eventForm.markAsUntouched();
      this.fetchEvents();
    });
  }

  private fetchEvents(): void {
    this.eventsService.getEvents().subscribe((res) => {
      this.events.set(Array.isArray(res) ? res : (res.events ?? []));
    });
  }

  private createCategoryControl(): FormControl<string> {
    return this.fb.nonNullable.control('');
  }
}

