import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EventsService } from '../../services/events.service';
import type { GetEventDetailsResponse } from '../../contracts/events';
import { IsoDatePipe } from '../../shared/pipes/iso-date.pipe';

@Component({
  selector: 'app-events',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, RouterLink, IsoDatePipe],
  templateUrl: './events.html',
  styleUrl: './events.scss',
})
export class Events {
  private readonly route = inject(ActivatedRoute);
  private readonly eventsService = inject(EventsService);

  readonly eventDetails = signal<GetEventDetailsResponse | null>(null);

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const eventId = params.get('id') ?? '';
      this.eventDetails.set(null);
      this.eventsService.getEventById(eventId).subscribe((event) => {
        this.eventDetails.set(event);
      });
    });
  }
}

