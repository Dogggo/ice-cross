import { Injectable, signal } from '@angular/core';

export interface Participant {
  nr: number;
  name: string;
  club: string;
  dob: string;
  zgoda: boolean;
  obecny: boolean;
}

export type EliminationPhase = 'round1' | 'round1-confirmed' | 'round2-confirmed';

export interface EliminationResult {
  nr: number;
  round1: string;
  round2: string;
}

export interface EliminationState {
  phase: EliminationPhase;
  results: EliminationResult[];
}

export interface AppCategory {
  id: string;
  name: string;
  participants: Participant[];
  elimination: EliminationState;
}

export interface AppTournament {
  id: string;
  name: string;
}

export interface AppEvent {
  id: string;
  name: string;
  date: Date;
  categories: AppCategory[];
  tournaments: AppTournament[];
}

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private readonly _events = signal<AppEvent[]>([]);

  readonly events = this._events.asReadonly();

  getEvent(id: string): AppEvent | undefined {
    return this._events().find((e) => e.id === id);
  }

  addEvent(event: AppEvent): void {
    this._events.update((events) => [...events, event]);
  }

  addParticipant(eventId: string, categoryId: string, participant: Participant): void {
    this._updateCategory(eventId, categoryId, (c) => ({
      ...c,
      participants: [...c.participants, participant],
    }));
  }

  addParticipants(eventId: string, categoryId: string, participants: Participant[]): void {
    this._updateCategory(eventId, categoryId, (c) => ({
      ...c,
      participants: [...c.participants, ...participants],
    }));
  }

  updateParticipant(
    eventId: string,
    categoryId: string,
    nr: number,
    updates: Partial<Participant>,
  ): void {
    this._updateCategory(eventId, categoryId, (c) => ({
      ...c,
      participants: c.participants.map((p) => (p.nr === nr ? { ...p, ...updates } : p)),
    }));
  }

  saveEliminationState(eventId: string, categoryId: string, state: EliminationState): void {
    this._updateCategory(eventId, categoryId, (c) => ({ ...c, elimination: state }));
  }

  private _updateCategory(
    eventId: string,
    categoryId: string,
    updater: (c: AppCategory) => AppCategory,
  ): void {
    this._events.update((events) =>
      events.map((e) => {
        if (e.id !== eventId) return e;
        return {
          ...e,
          categories: e.categories.map((c) => (c.id === categoryId ? updater(c) : c)),
        };
      }),
    );
  }
}
