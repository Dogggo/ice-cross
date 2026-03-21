import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TournamentBracket, BracketConfig } from '../../components/tournament-bracket/tournament-bracket';

@Component({
  selector: 'app-tournament',
  imports: [TournamentBracket],
  templateUrl: './tournament.html',
  styleUrl: './tournament.scss',
})
export class Tournament {
  private readonly route = inject(ActivatedRoute);

  readonly tournamentId = computed(() => this.route.snapshot.paramMap.get('tournamentId') ?? '');

  readonly bracketConfig = computed<BracketConfig>(() => {
    const id = this.tournamentId();
    return this.getTournamentConfig(id);
  });

  private getTournamentConfig(id: string): BracketConfig {
    const configs: Record<string, BracketConfig> = {
      'tour-1': {
        tournamentName: 'Pary mieszane',
        participants: [
          { name: 'Para 1' },
          { name: 'Para 2' },
          { name: 'Para 3' },
          { name: 'Para 4' },
          { name: 'Para 5' },
          { name: 'Para 6' },
          { name: 'Para 7' },
          { name: 'Para 8' },
        ],
      },
      'tour-2': {
        tournamentName: 'Sprint męski',
        participants: [
          { name: 'Adam K.' },
          { name: 'Bartek L.' },
          { name: 'Cezary M.' },
          { name: 'Dawid N.' },
          { name: 'Emil O.' },
          { name: 'Filip P.' },
          { name: 'Grzegorz R.' },
          { name: 'Hubert S.' },
        ],
      },
      'tour-3': {
        tournamentName: 'Top 8',
        participants: [
          { name: 'Racer 1' },
          { name: 'Racer 2' },
          { name: 'Racer 3' },
          { name: 'Racer 4' },
          { name: 'Racer 5' },
          { name: 'Racer 6' },
          { name: 'Racer 7' },
          { name: 'Racer 8' },
        ],
      },
      'tour-4': {
        tournamentName: 'Drużynowy',
        participants: [
          { name: 'Drużyna Alfa' },
          { name: 'Drużyna Beta' },
          { name: 'Drużyna Gamma' },
          { name: 'Drużyna Delta' },
          { name: 'Drużyna Epsilon' },
          { name: 'Drużyna Zeta' },
          { name: 'Drużyna Eta' },
          { name: 'Drużyna Theta' },
        ],
      },
    };

    return (
      configs[id] ?? {
        tournamentName: 'Turniej',
        participants: [
          { name: 'Zawodnik 1' },
          { name: 'Zawodnik 2' },
          { name: 'Zawodnik 3' },
          { name: 'Zawodnik 4' },
          { name: 'Zawodnik 5' },
          { name: 'Zawodnik 6' },
          { name: 'Zawodnik 7' },
          { name: 'Zawodnik 8' },
        ],
      }
    );
  }
}
