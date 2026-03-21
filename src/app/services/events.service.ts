import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { GetEventDetailsResponse, GetEventsResponse, CreateEventRequestBody, CreateEventResponse } from '../contracts/events';

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  private readonly http = inject(HttpClient);

  getEvents(): Observable<GetEventsResponse> {
    return this.http.get<GetEventsResponse>(`${environment.apiUrl}/events`);
  }

  createEvent(body: CreateEventRequestBody): Observable<CreateEventResponse> {
    return this.http.post<CreateEventResponse>(`${environment.apiUrl}/events`, body);
  }

  getEventById(eventId: string): Observable<GetEventDetailsResponse> {
    return this.http.get<GetEventDetailsResponse>(`${environment.apiUrl}/events/${eventId}`);
  }
}
