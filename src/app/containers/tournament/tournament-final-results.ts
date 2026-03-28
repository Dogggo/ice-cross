import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TournamentService } from '../../services/tournament.service';
import type { TournamentResultEntry } from '../../contracts/tournament';

@Component({
  selector: 'app-tournament-final-results',
  imports: [MatIconModule],
  templateUrl: './tournament-final-results.html',
  styleUrl: './tournament-final-results.scss',
})
export class TournamentFinalResults implements OnInit {
  @Input() eventId!: string;
  @Input() categoryId!: string;

  private readonly service = inject(TournamentService);

  readonly isLoading = signal(true);
  readonly results = signal<TournamentResultEntry[]>([]);

  ngOnInit(): void {
    this.service.getResults(this.eventId, this.categoryId).subscribe((res) => {
      this.results.set([...res.results].sort((a, b) => a.order - b.order));
      this.isLoading.set(false);
    });
  }

  medalIcon(order: number): string {
    if (order === 1) return '🥇';
    if (order === 2) return '🥈';
    if (order === 3) return '🥉';
    return '';
  }
}
