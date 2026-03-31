export interface GetStartingListPathParams {
    eventId: string;
}

export type GetStartingListResponse = {
    categoryId: string;
    startingListLocked: boolean;
    participants: {
        id: string;
        name: string;
        bibNumber: number | null;
        sportClub: string;
        dob: string; // ISO format
        consent: boolean;
        present: boolean;
    }[];
}[];

export type CreateStartingListCategoryRequestBody = {
        name: string;
        bibNumber: number | null;
        sportClub: string;
        dob: string; // ISO format
        consent: boolean;
        present: boolean;
    }[];