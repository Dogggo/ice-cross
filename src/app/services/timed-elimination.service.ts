import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type {
  GetTimedEliminationResponse,
  PostTimedEliminationRequestBody,
  PutTimedEliminationRequestBody,
} from '../contracts/timed-elimination';

@Injectable({ providedIn: 'root' })
export class TimedEliminationService {
  private readonly http = inject(HttpClient);

  private base(eventId: string, categoryId: string): string {
    return `${environment.apiUrl}/events/${eventId}/categories/${categoryId}/timed-elimination`;
  }

  get(eventId: string, categoryId: string): Observable<GetTimedEliminationResponse> {
    return this.http.get<GetTimedEliminationResponse>(this.base(eventId, categoryId));
  }

  post(eventId: string, categoryId: string, body: PostTimedEliminationRequestBody): Observable<void> {
    return this.http.post<void>(this.base(eventId, categoryId), body);
  }

  put(eventId: string, categoryId: string, body: PutTimedEliminationRequestBody): Observable<void> {
    return this.http.put<void>(this.base(eventId, categoryId), body);
  }

  skipSecondRound(eventId: string, categoryId: string): Observable<void> {
    return this.http.post<void>(`${this.base(eventId, categoryId)}/skip-second-round`, {});
  }

  confirm(eventId: string, categoryId: string): Observable<void> {
    return this.http.post<void>(
      `${environment.apiUrl}/events/${eventId}/categories/${categoryId}/timed-elimination/lock`,
      {},
    );
  }

  reset(eventId: string, categoryId: string): Observable<void> {
    return this.http.post<void>(
      `${environment.apiUrl}/events/${eventId}/categories/${categoryId}/reset`,
      {},
    );
  }
}
