import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type {
  GetTournamentStateResponse,
  CreateTournamentSettingsRequest,
  GetLCQResponse,
  PutLCQRequest,
  PostLCQRequest,
  GetLCQResultsResponse,
  PostLCQResultsRequest,
  PutLCQResultsRequest,
  GetTournamentCurrentRoundResponse,
  PutTournamentRoundRequest,
  PostTournamentRoundRequest,
  GetTournamentResultsResponse,
} from '../contracts/tournament';

@Injectable({ providedIn: 'root' })
export class TournamentService {
  private readonly http = inject(HttpClient);

  private base(eventId: string, categoryId: string): string {
    return `${environment.apiUrl}/events/${eventId}/categories/${categoryId}`;
  }

  getState(eventId: string, categoryId: string): Observable<GetTournamentStateResponse> {
    return this.http.get<GetTournamentStateResponse>(`${this.base(eventId, categoryId)}/tournament/state`);
  }

  createSettings(eventId: string, categoryId: string, body: CreateTournamentSettingsRequest): Observable<void> {
    return this.http.post<void>(`${this.base(eventId, categoryId)}/tournament/settings`, body);
  }

  getLCQ(eventId: string, categoryId: string): Observable<GetLCQResponse> {
    return this.http.get<GetLCQResponse>(`${this.base(eventId, categoryId)}/lcq`);
  }

  putLCQ(eventId: string, categoryId: string, body: PutLCQRequest): Observable<void> {
    return this.http.put<void>(`${this.base(eventId, categoryId)}/lcq`, body);
  }

  postLCQ(eventId: string, categoryId: string, body: PostLCQRequest): Observable<void> {
    return this.http.post<void>(`${this.base(eventId, categoryId)}/lcq`, body);
  }

  getLCQResults(eventId: string, categoryId: string): Observable<GetLCQResultsResponse> {
    return this.http.get<GetLCQResultsResponse>(`${this.base(eventId, categoryId)}/lcq/results`);
  }

  postLCQResults(eventId: string, categoryId: string, body: PostLCQResultsRequest): Observable<void> {
    return this.http.post<void>(`${this.base(eventId, categoryId)}/lcq/results`, body);
  }

  putLCQResults(eventId: string, categoryId: string, body: PutLCQResultsRequest): Observable<void> {
    return this.http.put<void>(`${this.base(eventId, categoryId)}/lcq/results`, body);
  }

  getCurrentRound(eventId: string, categoryId: string): Observable<GetTournamentCurrentRoundResponse> {
    return this.http.get<GetTournamentCurrentRoundResponse>(`${this.base(eventId, categoryId)}/tournament/rounds/current`);
  }

  putCurrentRound(eventId: string, categoryId: string, body: PutTournamentRoundRequest): Observable<void> {
    return this.http.put<void>(`${this.base(eventId, categoryId)}/tournament/rounds/current`, body);
  }

  postCurrentRound(eventId: string, categoryId: string, body: PostTournamentRoundRequest): Observable<void> {
    return this.http.post<void>(`${this.base(eventId, categoryId)}/tournament/rounds/current`, body);
  }

  getResults(eventId: string, categoryId: string): Observable<GetTournamentResultsResponse> {
    return this.http.get<GetTournamentResultsResponse>(`${this.base(eventId, categoryId)}/tournament/results`);
  }
}
