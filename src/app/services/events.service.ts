import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import type { GetEventDetailsResponse, GetEventsResponse, CreateEventRequestBody, CreateEventResponse, Event } from '../contracts/events';

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  private readonly http = inject(HttpClient);

  private readonly _events = signal<Event[]>([]);
  readonly events = this._events.asReadonly();

  refreshEvents(): void {
    this.http.get<GetEventsResponse>(`${environment.apiUrl}/events`).subscribe((res) => {
      this._events.set(Array.isArray(res) ? res : (res.events ?? []));
    });
  }

  getEvents(): Observable<GetEventsResponse> {
    return this.http.get<GetEventsResponse>(`${environment.apiUrl}/events`);
  }

  createEvent(body: CreateEventRequestBody): Observable<CreateEventResponse> {
    return this.http.post<CreateEventResponse>(`${environment.apiUrl}/events`, body).pipe(
      tap(() => this.refreshEvents()),
    );
  }

  getEventById(eventId: string): Observable<GetEventDetailsResponse> {
    return this.http.get<GetEventDetailsResponse>(`${environment.apiUrl}/events/${eventId}`);
  }

  deleteEvent(eventId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/events/${eventId}`).pipe(
      tap(() => this.refreshEvents()),
    );
  }
}
