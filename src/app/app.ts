import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('ice-cross');
  private readonly router = inject(Router);
  readonly currentUrl = signal(this.router.url);

  constructor() {
    this.router.events.subscribe((event: any) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects);
      }
    });
  }

  get isRootRoute(): boolean {
    return this.currentUrl() === '/';
  }

  goBack(): void {
    window.history.back();
  }
}
