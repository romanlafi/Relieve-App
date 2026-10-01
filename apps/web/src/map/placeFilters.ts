import type {PlaceFilters, PlaceWithUserState} from '@relieve/shared';

export type PersonalFilter = 'all' | 'pending' | 'visited' | 'favorite' | 'unregistered';

export function matchesPersonalFilters(place: PlaceWithUserState, filters: PlaceFilters): boolean {
    if (filters.status === 'unregistered' && place.userState !== null) return false;
    if (filters.status && filters.status !== 'unregistered' && place.userState?.status !== filters.status) return false;
    if (filters.favorite !== undefined && place.userState?.favorite !== filters.favorite) return false;
    return true;
}

export function placeFiltersQuery(filters: PlaceFilters): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) query.set(key, String(value));
    }
    return query.toString();
}
