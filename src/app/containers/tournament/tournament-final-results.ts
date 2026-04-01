import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TournamentService } from '../../services/tournament.service';
import { EventsService } from '../../services/events.service';
import { PdfService } from '../../services/pdf.service';
import type { TournamentResultEntry } from '../../contracts/tournament';

@Component({
  selector: 'app-tournament-final-results',
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './tournament-final-results.html',
  styleUrl: './tournament-final-results.scss',
})
export class TournamentFinalResults implements OnInit {
  @Input() eventId!: string;
  @Input() categoryId!: string;

  private readonly service = inject(TournamentService);
  private readonly eventsService = inject(EventsService);
  private readonly pdf = inject(PdfService);

  readonly isLoading = signal(true);
  readonly results = signal<TournamentResultEntry[]>([]);
  readonly eventName = signal('');
  readonly categoryName = signal('');

  ngOnInit(): void {
    this.service.getResults(this.eventId, this.categoryId).subscribe((res) => {
      this.results.set([...res.results].sort((a, b) => a.order - b.order));
      this.isLoading.set(false);
    });
    this.eventsService.getEventById(this.eventId).subscribe((event) => {
      this.eventName.set(event.name);
      const cat = event.categories.find((c) => c.id === this.categoryId);
      this.categoryName.set(cat?.name ?? '');
    });
  }

  medalIcon(order: number): string {
    if (order === 1) return '🥇';
    if (order === 2) return '🥈';
    if (order === 3) return '🥉';
    return '';
  }

  downloadPdf(): void {
    const rows = this.results().map((row) => {
      const medal = this.medalIcon(row.order);
      const podium = row.order <= 3 ? 'podium-row' : '';
      return `<tr class="${podium}">
        <td class="col-place"><span class="medal">${medal}</span>${row.order}</td>
        <td class="col-bib">${row.bibNumber}</td>
        <td class="col-name">${row.name}</td>
      </tr>`;
    }).join('');

    const body = `<table>
      <thead><tr>
        <th class="col-place">Wynik</th>
        <th class="col-bib">Nr</th>
        <th class="col-name">Imię i nazwisko</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

    this.pdf.open(
      { eventName: this.eventName(), categoryName: this.categoryName(), documentTitle: 'Wyniki końcowe', badge: 'Wyniki końcowe turnieju' },
      body,
    );
  }
}
