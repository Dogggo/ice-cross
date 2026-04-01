import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
  readonly hasLcqRound = signal(false);
  readonly viewingState = signal<TournamentState | null>(null);
  readonly isLoading = signal(true);

  readonly displayState = computed(() => this.viewingState() ?? this.state());

  readonly stateSteps = computed(() => {
    const steps: { key: string; label: string }[] = [{ key: 'SETTINGS', label: 'Ustawienia' }];
    if (this.hasLcqRound()) {
      steps.push({ key: 'LCQ', label: 'LCQ' });
      steps.push({ key: 'LCQ_RESULTS', label: 'Wyniki LCQ' });
    }
    steps.push({ key: 'TOURNAMENT', label: 'Turniej' });
    steps.push({ key: 'TOURNAMENT_RESULTS', label: 'Wyniki końcowe' });
    return steps;
  });

  ngOnInit(): void {
    this.loadState();
  }

  loadState(): void {
    this.isLoading.set(true);
    this.viewingState.set(null);
    this.service.getState(this.eventId, this.categoryId).subscribe({
      next: (res) => {
        this.state.set(res.state);
        this.hasLcqRound.set(res.hasLcqRound);
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

  private readonly stateOrder = computed((): TournamentState[] => {
    const base: TournamentState[] = ['SETTINGS'];
    if (this.hasLcqRound()) {
      base.push('LCQ', 'LCQ_RESULTS');
    }
    base.push('TOURNAMENT', 'TOURNAMENT_RESULTS');
    return base;
  });

  isStepDone(stepKey: string): boolean {
    const current = this.state();
    if (!current) return false;
    return this.stateOrder().indexOf(current) > this.stateOrder().indexOf(stepKey as TournamentState);
  }

  isStepActive(stepKey: string): boolean {
    return this.displayState() === stepKey;
  }

  isStepClickable(stepKey: string): boolean {
    if (!this.state()) return false;
    const historicalSteps: TournamentState[] = this.hasLcqRound()
      ? ['LCQ', 'LCQ_RESULTS', 'TOURNAMENT']
      : ['TOURNAMENT'];
    if (this.isStepDone(stepKey) && historicalSteps.includes(stepKey as TournamentState)) return true;
    // allow clicking current API state to return from a history view
    if (stepKey === this.state() && this.viewingState() !== null) return true;
    return false;
  }

  navigateToStep(stepKey: TournamentState): void {
    if (stepKey === this.state()) {
      this.viewingState.set(null);
    } else {
      this.viewingState.set(stepKey);
    }
  }
}
