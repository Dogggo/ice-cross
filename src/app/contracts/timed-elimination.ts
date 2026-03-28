export interface GetTimedEliminationPathParams {
    categoryId: string;
    eventId: string;
}

export enum TimedEliminationState {
    Round1 = 'Round1',
    Round2 = 'Round2',
    Filled = 'Filled',
    Finished = 'Finished'
}

export interface GetTimedEliminationResponse {
    state: TimedEliminationState;
    isSecondRoundSkipped: boolean;
    participants: {
        id: string;
        name: string;
        bibNumber: number;
        firstRoundTime: number; // timestamp in milliseconds
        secondRoundTime: number; // timestamp in milliseconds
        placement: number;
        resigned: boolean;
    }[]
}

export interface PostTimedEliminationPathParams {
    categoryId: string;
    eventId: string;
}

export interface PostTimedEliminationRequestBody {
    state: TimedEliminationState;
    participants: {
        id: string;
        roundTime: number; // timestamp in milliseconds
        resigned: boolean;
    }[]
}

export interface PutTimedEliminationPathParams {
    categoryId: string;
    eventId: string;
}

export interface PutTimedEliminationRequestBody {
    participants: {
        id: string;
        firstRoundTime: number; // timestamp in milliseconds
        secondRoundTime: number; // timestamp in milliseconds
        resigned: boolean
    }[]
}

export interface PostSkipSecondRoundPathParams {
    categoryId: string;
    eventId: string;
}

export interface PostConfirmTimedEliminationPathParams {
    categoryId: string;
    eventId: string;
}

export {};