export type TournamentState = 'SETTINGS' | 'LCQ' | 'LCQ_RESULTS' | 'TOURNAMENT' | 'TOURNAMENT_RESULTS';

export interface GetTournamentStateResponse {
  state: TournamentState;
  hasLcqRound: boolean;
}

export type RacePlacement = '1' | '2' | '3' | '4' | 'DNS';

// ── LCQ ──────────────────────────────────────────────────────────────────────

export interface LCQParticipant {
  id: string;
  bibNumber: number;
  name: string;
  placement: RacePlacement | null;
}

export interface LCQGroup {
  groupNumber: number;
  participants: LCQParticipant[];
}

export interface GetLCQResponse {
  groups: LCQGroup[];
}

export interface PlacementEntry {
  participantId: string;
  placement: RacePlacement | null;
}

export interface PutLCQRequest {
  placements: PlacementEntry[];
}

export interface PostLCQRequest {
  placements: PlacementEntry[];
}

// ── LCQ Results ───────────────────────────────────────────────────────────────

export interface LCQResultEntry {
  order: number;
  id: string;
  bibNumber: number;
  name: string;
  firstRoundTime: number;
  secondRoundTime: number | null;
  LCQ_placement: '0' | '1' | '2' | '3' | '4' | 'DNS';
}

export interface GetLCQResultsResponse {
  isSecondRoundSkipped: boolean;
  results: LCQResultEntry[];
}

export interface OrderEntry {
  participantId: string;
  order: number;
}

export interface PostLCQResultsRequest {
  orders: OrderEntry[];
}

export interface PutLCQResultsRequest {
  orders: OrderEntry[];
}

// ── Tournament Settings ───────────────────────────────────────────────────────

export interface CreateTournamentSettingsRequest {
  size: number;
  lcq: { size: number; from: number; to: number } | null;
}

// ── Tournament Rounds ─────────────────────────────────────────────────────────

export interface TournamentParticipant {
  id: string;
  bibNumber: number;
  name: string;
  placement: RacePlacement | null;
}

export interface TournamentGroup {
  groupNumber: number;
  participants: TournamentParticipant[];
}

export interface GetTournamentCurrentRoundResponse {
  roundSize: number;
  currentRound: number; // 64, 32, 16, 8, 4, 0 → 0 = finished
  groups: TournamentGroup[];
}

export interface PutTournamentRoundRequest {
  placements: PlacementEntry[];
}

export interface PostTournamentRoundRequest {
  placements: PlacementEntry[];
}

// ── Tournament Final Results ──────────────────────────────────────────────────

export interface TournamentResultEntry {
  order: number;
  id: string;
  bibNumber: number;
  name: string;
}

export interface GetTournamentResultsResponse {
  results: TournamentResultEntry[];
}
