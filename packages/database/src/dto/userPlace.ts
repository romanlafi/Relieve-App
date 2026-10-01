import type {UserPlace, UserPlaceState} from '@relieve/shared';
import type {userPlaces} from '../schema/index.js';

type UserPlaceRow = typeof userPlaces.$inferSelect;

export function toUserPlaceState(row: UserPlaceRow): UserPlaceState {
    return {
        status: row.status,
        favorite: row.favorite,
        visitedAt: row.visitedAt?.toISOString().slice(0, 10) ?? null,
        notes: row.notes,
    };
}

export function toUserPlace(row: UserPlaceRow): UserPlace {
    return {placeId: row.placeId, ...toUserPlaceState(row)};
}
