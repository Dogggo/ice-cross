import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { EventsService } from '../../services/events.service';
import type { GetEventDetailsResponse } from '../../contracts/events';

@Component({
  selector: 'app-events',
  imports: [MatButtonModule, RouterLink, DatePipe],
  templateUrl: './events.html',
  styleUrl: './events.scss',
})
export class Events {
  private readonly route = inject(ActivatedRoute);
  private readonly eventsService = inject(EventsService);

  readonly eventId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly eventDetails = signal<GetEventDetailsResponse | null>(null);

  constructor() {
    this.eventsService.getEventById(this.eventId).subscribe((event) => {
      this.eventDetails.set(event);
    });
  }
}

