import {and, eq, sql} from 'drizzle-orm';
import type {UpdateUserPlace, UserPlace} from '@relieve/shared';
import type {Database} from './client.js';
import {userPlaces} from './schema/index.js';
import {toUserPlace} from './dto/userPlace.js';
import {getPlaceForUser} from './places.js';

export async function listUserPlaces(database: Database, userId: string): Promise<UserPlace[]> {
    const rows = await database.select().from(userPlaces).where(eq(userPlaces.userId, userId)).orderBy(userPlaces.placeId);
    return rows.map(toUserPlace);
}

export async function getUserPlace(database: Database, userId: string, placeId: string): Promise<UserPlace | null | undefined> {
    const place = await getPlaceForUser(database, userId, placeId);
    return place ? (place.userState ? {placeId, ...place.userState} : null) : undefined;
}

type WriteResult = { kind: 'saved'; value: UserPlace } | { kind: 'not-found' } | { kind: 'invalid-date' };

export async function upsertUserPlace(database: Database, userId: string, placeId: string, input: UpdateUserPlace): Promise<WriteResult> {
    const place = await getPlaceForUser(database, userId, placeId);
    if (!place) return {kind: 'not-found'};
    const status = input.status ?? place.userState?.status ?? 'pending';
    if (input.visitedAt && status !== 'visited') return {kind: 'invalid-date'};
    const effectiveStatus = input.status === undefined ? sql`${userPlaces.status}` : sql`${input.status}::place_status`;
    const [row] = await database.insert(userPlaces).values({
        userId, placeId, status,
        favorite: input.favorite ?? false,
        notes: input.notes ?? null,
        visitedAt: status === 'visited' && input.visitedAt ? new Date(`${input.visitedAt}T00:00:00.000Z`) : null,
    }).onConflictDoUpdate({
        target: [userPlaces.userId, userPlaces.placeId],
        set: {
            status: effectiveStatus,
            favorite: input.favorite === undefined ? sql`${userPlaces.favorite}` : input.favorite,
            notes: input.notes === undefined ? sql`${userPlaces.notes}` : input.notes,
            visitedAt: sql`CASE WHEN ${effectiveStatus} = 'pending' THEN NULL
                ELSE ${input.visitedAt === undefined ? sql`${userPlaces.visitedAt}` : sql`excluded.visited_at`} END`,
        },
    }).returning();
    if (!row) throw new Error('Unable to save personal place');
    return {kind: 'saved', value: toUserPlace(row)};
}

export async function deleteUserPlace(database: Database, userId: string, placeId: string): Promise<boolean> {
    if (!await getPlaceForUser(database, userId, placeId)) return false;
    await database.delete(userPlaces).where(and(eq(userPlaces.userId, userId), eq(userPlaces.placeId, placeId)));
    return true;
}
