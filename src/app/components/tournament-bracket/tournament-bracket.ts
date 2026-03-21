import { Component, OnInit, input, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

export interface BracketParticipant {
  name: string;
}

export interface BracketConfig {
  tournamentName: string;
  participants: BracketParticipant[];
}

export interface HeatSlot {
  participantName: string | null;
  score: number | null;
}

export interface Heat {
  id: number;
  slots: HeatSlot[];
  locked: boolean;
}

export interface Round {
  name: string;
  heats: Heat[];
}

const HEAT_SIZE = 4;
const ADVANCE_COUNT = 2;

@Component({
  selector: 'app-tournament-bracket',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './tournament-bracket.html',
  styleUrl: './tournament-bracket.scss',
})
export class TournamentBracket implements OnInit {
  readonly config = input.required<BracketConfig>();

  readonly rounds = signal<Round[]>([]);
  readonly errorMessage = signal<string>('');

  readonly totalRounds = computed(() => this.rounds().length);

  ngOnInit(): void {
    this.buildBracket();
  }

  onScoreChange(roundIndex: number, heatIndex: number, slotIndex: number, value: string): void {
    const num = parseInt(value, 10);
    const rounds = structuredClone(this.rounds());
    const slot = rounds[roundIndex].heats[heatIndex].slots[slotIndex];
    slot.score = isNaN(num) ? null : Math.max(1, Math.min(HEAT_SIZE, num));
    this.rounds.set(rounds);
  }

  lockHeat(roundIndex: number, heatIndex: number): void {
    this.errorMessage.set('');
    const rounds = structuredClone(this.rounds());
    const heat = rounds[roundIndex].heats[heatIndex];

    const scores = heat.slots.filter((s) => s.participantName).map((s) => s.score);
    const filledSlots = heat.slots.filter((s) => s.participantName);

    if (scores.some((s) => s === null)) {
      this.errorMessage.set('Uzupełnij wszystkie wyniki przed zatwierdzeniem.');
      return;
    }

    const scoreSet = new Set(scores);
    if (scoreSet.size !== scores.length) {
      this.errorMessage.set('Każdy zawodnik musi mieć unikalny wynik (1-4).');
      return;
    }

    heat.locked = true;

    // Advance top 2 to next round
    if (roundIndex + 1 < rounds.length) {
      const ranked = filledSlots
        .slice()
        .sort((a, b) => (a.score ?? HEAT_SIZE) - (b.score ?? HEAT_SIZE));
      const advancers = ranked.slice(0, ADVANCE_COUNT);

      const nextRound = rounds[roundIndex + 1];
      // Each heat feeds into a specific position in next round
      // Heat 0 feeds slots 0-1 of next heat 0, heat 1 feeds slots 2-3 of next heat 0, etc.
      const nextHeatIndex = Math.floor(heatIndex / 2);
      const slotOffset = (heatIndex % 2) * ADVANCE_COUNT;

      if (nextHeatIndex < nextRound.heats.length) {
        const nextHeat = nextRound.heats[nextHeatIndex];
        for (let i = 0; i < advancers.length; i++) {
          nextHeat.slots[slotOffset + i].participantName = advancers[i].participantName;
          nextHeat.slots[slotOffset + i].score = null;
        }
      }
    }

    this.rounds.set(rounds);
  }

  unlockHeat(roundIndex: number, heatIndex: number): void {
    const rounds = structuredClone(this.rounds());
    const heat = rounds[roundIndex].heats[heatIndex];
    heat.locked = false;

    // Clear advanced participants from next rounds
    this.clearDownstream(rounds, roundIndex + 1, heatIndex);

    this.rounds.set(rounds);
    this.errorMessage.set('');
  }

  isAdvancer(roundIndex: number, heatIndex: number, slotIndex: number): boolean {
    const rounds = this.rounds();
    const heat = rounds[roundIndex].heats[heatIndex];
    if (!heat.locked) return false;

    const slot = heat.slots[slotIndex];
    if (!slot.participantName) return false;

    const filledSlots = heat.slots.filter((s) => s.participantName);
    const ranked = filledSlots.slice().sort((a, b) => (a.score ?? HEAT_SIZE) - (b.score ?? HEAT_SIZE));
    const advancerNames = ranked.slice(0, ADVANCE_COUNT).map((s) => s.participantName);
    return advancerNames.includes(slot.participantName);
  }

  private buildBracket(): void {
    const cfg = this.config();
    const participants = cfg.participants;

    // Calculate number of rounds needed
    // Round 1: ceil(participants / HEAT_SIZE) heats
    // Each subsequent round: ceil(heats / 2) heats (since 2 heats feed into 1)
    const firstRoundHeats = Math.ceil(participants.length / HEAT_SIZE);
    const roundCount = this.calculateRoundCount(firstRoundHeats);

    const rounds: Round[] = [];

    // Build round 1 with participants
    const round1Heats: Heat[] = [];
    let heatId = 0;
    for (let h = 0; h < firstRoundHeats; h++) {
      const slots: HeatSlot[] = [];
      for (let s = 0; s < HEAT_SIZE; s++) {
        const pIndex = h * HEAT_SIZE + s;
        slots.push({
          participantName: pIndex < participants.length ? participants[pIndex].name : null,
          score: null,
        });
      }
      round1Heats.push({ id: heatId++, slots, locked: false });
    }
    rounds.push({ name: 'Runda 1', heats: round1Heats });

    // Build subsequent rounds with empty slots
    let heatsInPrevRound = firstRoundHeats;
    for (let r = 1; r < roundCount; r++) {
      const heatsInThisRound = Math.ceil(heatsInPrevRound / 2);
      const heats: Heat[] = [];
      for (let h = 0; h < heatsInThisRound; h++) {
        const slots: HeatSlot[] = Array.from({ length: HEAT_SIZE }, () => ({
          participantName: null,
          score: null,
        }));
        heats.push({ id: heatId++, slots, locked: false });
      }
      const name = r === roundCount - 1 ? 'Finał' : `Runda ${r + 1}`;
      rounds.push({ name, heats });
      heatsInPrevRound = heatsInThisRound;
    }

    this.rounds.set(rounds);
  }

  private calculateRoundCount(firstRoundHeats: number): number {
    if (firstRoundHeats <= 1) return 1;
    let count = 1;
    let heats = firstRoundHeats;
    while (heats > 1) {
      heats = Math.ceil(heats / 2);
      count++;
    }
    return count;
  }

  private clearDownstream(rounds: Round[], fromRoundIndex: number, sourceHeatIndex: number): void {
    if (fromRoundIndex >= rounds.length) return;

    const nextHeatIndex = Math.floor(sourceHeatIndex / 2);
    const slotOffset = (sourceHeatIndex % 2) * ADVANCE_COUNT;
    const nextHeat = rounds[fromRoundIndex].heats[nextHeatIndex];

    if (!nextHeat) return;

    // Clear the slots that were filled by the source heat
    for (let i = 0; i < ADVANCE_COUNT; i++) {
      nextHeat.slots[slotOffset + i].participantName = null;
      nextHeat.slots[slotOffset + i].score = null;
    }

    // If this heat was locked, unlock it and clear its downstream too
    if (nextHeat.locked) {
      nextHeat.locked = false;
      this.clearDownstream(rounds, fromRoundIndex + 1, nextHeatIndex);
    }
  }
}
