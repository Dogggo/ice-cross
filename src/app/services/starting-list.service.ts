import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { CreateStartingListCategoryRequestBody, GetStartingListResponse } from '../contracts/starting-list';

@Injectable({
  providedIn: 'root',
})
export class StartingListService {
  private readonly http = inject(HttpClient);

  getStartingList(eventId: string): Observable<GetStartingListResponse> {
    return this.http.get<GetStartingListResponse>(`${environment.apiUrl}/events/${eventId}/starting-list`);
  }

  submitStartingList(eventId: string, categoryId: string, body: CreateStartingListCategoryRequestBody): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/events/${eventId}/categories/${categoryId}/starting-list`, body);
  }

  lockStartingList(eventId: string, categoryId: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/events/${eventId}/categories/${categoryId}/starting-list/lock`, {});
  }
}
