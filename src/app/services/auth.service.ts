import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { LoginRequestBody, LoginResponse } from '../contracts/login';

const TOKEN_KEY = 'auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly token = this._token.asReadonly();

  login(credentials: LoginRequestBody): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.token);
          this._token.set(res.token);
        }),
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this._token.set(null);
  }

  isAuthenticated(): boolean {
    return this._token() !== null;
  }

  getToken(): string | null {
    return this._token();
  }
}
