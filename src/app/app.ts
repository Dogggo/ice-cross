import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EventsService } from './services/events.service';
import { AuthService } from './services/auth.service';
import type { Event } from './contracts/events';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly router = inject(Router);
  private readonly eventsService = inject(EventsService);
  private readonly authService = inject(AuthService);

  readonly currentUrl = signal(this.router.url);
  readonly sidebarEvents = signal<Event[]>([]);

  readonly isLoginRoute = computed(() => this.currentUrl().startsWith('/login'));

  constructor() {
    this.router.events.subscribe((event: any) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects);
        if (event.urlAfterRedirects === '/') {
          this.loadSidebarEvents();
        }
      }
    });
    if (!this.currentUrl().startsWith('/login')) {
      this.loadSidebarEvents();
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private loadSidebarEvents(): void {
    if (!this.authService.isAuthenticated()) return;
    this.eventsService.getEvents().subscribe((res) => {
      this.sidebarEvents.set(Array.isArray(res) ? res : (res.events ?? []));
    });
  }
}
