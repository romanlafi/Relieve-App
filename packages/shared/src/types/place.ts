export type PlaceType = 'peak' | 'lake' | 'hut' | 'pass' | 'viewpoint';
export type PlaceStatus = 'pending' | 'visited';

export interface UserPlaceState {
    status: PlaceStatus;
    favorite: boolean;
    visitedAt: string | null;
    notes: string | null;
}

export interface UserPlace extends UserPlaceState {
    placeId: string;
}

export interface UpdateUserPlace {
    status?: PlaceStatus | undefined;
    favorite?: boolean | undefined;
    visitedAt?: string | null | undefined;
    notes?: string | null | undefined;
}

export interface Place {
    id: string;
    name: string;
    slug: string;
    type: PlaceType;
    elevation: number | null;
    latitude: number;
    longitude: number;
}

export interface PlaceWithUserState extends Place {
    userState: UserPlaceState | null;
    regionId: string | null;
}

export interface PlaceFilters {
    type?: PlaceType | undefined;
    region?: string | undefined;
    status?: PlaceStatus | 'unregistered' | undefined;
    favorite?: boolean | undefined;
    north?: number | undefined;
    south?: number | undefined;
    east?: number | undefined;
    west?: number | undefined;
}
