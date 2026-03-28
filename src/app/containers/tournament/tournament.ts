import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';
import { TournamentSettings } from './tournament-settings';
import { TournamentLcq } from './tournament-lcq';
import { TournamentLcqResults } from './tournament-lcq-results';
import { TournamentRound } from './tournament-round';
import { TournamentFinalResults } from './tournament-final-results';
import type { TournamentState } from '../../contracts/tournament';

@Component({
  selector: 'app-tournament',
  imports: [TournamentSettings, TournamentLcq, TournamentLcqResults, TournamentRound, TournamentFinalResults],
  templateUrl: './tournament.html',
  styleUrl: './tournament.scss',
})
export class Tournament implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(TournamentService);

  readonly eventId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly categoryId = this.route.snapshot.paramMap.get('categoryId') ?? '';

  readonly state = signal<TournamentState | null>(null);
  readonly isLoading = signal(true);

  readonly stateSteps = [
    { key: 'SETTINGS', label: 'Ustawienia' },
    { key: 'LCQ', label: 'LCQ' },
    { key: 'LCQ_RESULTS', label: 'Wyniki LCQ' },
    { key: 'TOURNAMENT', label: 'Turniej' },
    { key: 'TOURNAMENT_RESULTS', label: 'Wyniki końcowe' },
  ];

  ngOnInit(): void {
    this.loadState();
  }

  loadState(): void {
    this.isLoading.set(true);
    this.service.getState(this.eventId, this.categoryId).subscribe({
      next: (res) => {
        this.state.set(res.state);
        this.isLoading.set(false);
      },
      error: (err) => {
        if (err.status === 404) {
          this.state.set('SETTINGS');
        }
        this.isLoading.set(false);
      },
    });
  }

  private readonly stateOrder: TournamentState[] = ['SETTINGS', 'LCQ', 'LCQ_RESULTS', 'TOURNAMENT', 'TOURNAMENT_RESULTS'];

  isStepDone(stepKey: string): boolean {
    const current = this.state();
    if (!current) return false;
    return this.stateOrder.indexOf(current) > this.stateOrder.indexOf(stepKey as TournamentState);
  }
}
