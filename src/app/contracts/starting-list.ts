export interface GetStartingListPathParams {
    eventId: string;
}

export type GetStartingListResponse = {
    categoryId: string;
    participants: {
        id: string;
        name: string;
        bibNumber: number;
        sportClub: string;
        dob: string; // ISO format
        consent: boolean;
        present: boolean;
    }[];
}[];

export type CreateStartingListRequestBody = {
    categoryId: string;
    participants: {
        name: string;
        bibNumber: number;
        sportClub: string;
        dob: string; // ISO format
        consent: boolean;
        present: boolean;
    }[];
}[];