export interface Event {
    id: number;
    name: string;
    date: string; // ISO format
}

export interface GetEventsResponse {
    events: Event[];
}

export interface CreateEventRequestBody {
    name: string;
    date: string; // ISO format
    categories: string[]; // Array of category names
}

export interface CreateEventResponse {
    id: string;
    name: string;
    date: string; // ISO format
    categories: {
        id: string;
        name: string;
    }[]
}

export interface GetEventDetailsPathParams {
    eventId: string;
}

export interface GetEventDetailsResponse {
    id: string;
    name: string;
    date: string; // ISO format
    categories: {
        id: string;
        name: string;
        timedElimination: {
            id: string;
            isConfirmed: boolean
        },
        tournament: {
            id: string;
            state: string;
        }
    }[]
}

export interface DetailEventPathParams {
    eventId: string;
}

export {};