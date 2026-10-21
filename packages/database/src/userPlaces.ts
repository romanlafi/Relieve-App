import {and, desc, eq, sql} from 'drizzle-orm';
import type {PlaceVisit, UpdateUserPlace, UserPlace} from '@relieve/shared';
import type {Database} from './client.js';
import {userPlaceVisits, userPlaces} from './schema/index.js';
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
    if (input.visitedAt && status === 'visited') {
        await database.insert(userPlaceVisits).values({userPlaceId: row.id, visitedAt: input.visitedAt})
            .onConflictDoNothing();
    }
    return {kind: 'saved', value: toUserPlace(row)};
}

export async function listUserPlaceVisits(database: Database, userId: string,
                                          placeId: string): Promise<PlaceVisit[] | null> {
    if (!await getPlaceForUser(database, userId, placeId)) return null;
    const rows = await database.select({id: userPlaceVisits.id, visitedAt: userPlaceVisits.visitedAt})
        .from(userPlaceVisits).innerJoin(userPlaces, eq(userPlaces.id, userPlaceVisits.userPlaceId))
        .where(and(eq(userPlaces.userId, userId), eq(userPlaces.placeId, placeId)))
        .orderBy(desc(userPlaceVisits.visitedAt), desc(userPlaceVisits.createdAt), userPlaceVisits.id);
    return rows.map((row) => ({id: row.id, placeId, visitedAt: row.visitedAt}));
}

export async function addUserPlaceVisit(database: Database, userId: string, placeId: string,
                                        visitedAt: string): Promise<PlaceVisit | null> {
    if (!await getPlaceForUser(database, userId, placeId)) return null;
    const [userPlace] = await database.insert(userPlaces).values({
        userId, placeId, status: 'visited', visitedAt: new Date(`${visitedAt}T00:00:00.000Z`),
    }).onConflictDoUpdate({
        target: [userPlaces.userId, userPlaces.placeId],
        set: {
            status: 'visited',
            visitedAt: sql`GREATEST(COALESCE(${userPlaces.visitedAt}, excluded.visited_at), excluded.visited_at)`,
        },
    }).returning({id: userPlaces.id});
    if (!userPlace) throw new Error('Unable to save personal place');
    await database.insert(userPlaceVisits).values({userPlaceId: userPlace.id, visitedAt}).onConflictDoNothing();
    const [visit] = await database.select({id: userPlaceVisits.id, visitedAt: userPlaceVisits.visitedAt})
        .from(userPlaceVisits).where(and(eq(userPlaceVisits.userPlaceId, userPlace.id),
            eq(userPlaceVisits.visitedAt, visitedAt))).limit(1);
    if (!visit) throw new Error('Unable to save place visit');
    return {id: visit.id, placeId, visitedAt: visit.visitedAt};
}

export async function deleteUserPlaceVisit(database: Database, userId: string, placeId: string,
                                           visitId: string): Promise<boolean> {
    const [visit] = await database.select({id: userPlaceVisits.id, userPlaceId: userPlaces.id, status: userPlaces.status})
        .from(userPlaceVisits).innerJoin(userPlaces, eq(userPlaces.id, userPlaceVisits.userPlaceId))
        .where(and(eq(userPlaceVisits.id, visitId), eq(userPlaces.userId, userId), eq(userPlaces.placeId, placeId)))
        .limit(1);
    if (!visit) return false;
    await database.delete(userPlaceVisits).where(eq(userPlaceVisits.id, visit.id));
    const [latestVisit] = await database.select({visitedAt: userPlaceVisits.visitedAt}).from(userPlaceVisits)
        .where(eq(userPlaceVisits.userPlaceId, visit.userPlaceId))
        .orderBy(desc(userPlaceVisits.visitedAt), desc(userPlaceVisits.createdAt)).limit(1);
    await database.update(userPlaces).set({
        visitedAt: visit.status === 'visited' && latestVisit
            ? new Date(`${latestVisit.visitedAt}T00:00:00.000Z`) : null,
    }).where(eq(userPlaces.id, visit.userPlaceId));
    return true;
}

export async function deleteUserPlace(database: Database, userId: string, placeId: string): Promise<boolean> {
    if (!await getPlaceForUser(database, userId, placeId)) return false;
    await database.delete(userPlaces).where(and(eq(userPlaces.userId, userId), eq(userPlaces.placeId, placeId)));
    return true;
}

// One atomic upsert. Existing visits retain their dates, favorites and notes, including concurrent saves.
export async function confirmVisitedPlaces(database: Database, userId: string, placeIds: string[], visitedAt: string | null) {
    const rows = await database.insert(userPlaces).values(placeIds.map((placeId) => ({
        userId, placeId, status: 'visited' as const,
        visitedAt: visitedAt ? new Date(`${visitedAt}T00:00:00.000Z`) : null,
    }))).onConflictDoUpdate({
        target: [userPlaces.userId, userPlaces.placeId],
        set: {
            status: 'visited',
            visitedAt: sql`CASE WHEN ${userPlaces.status} = 'visited' THEN ${userPlaces.visitedAt} ELSE excluded.visited_at END`,
        },
    }).returning();
    if (visitedAt && rows.length > 0) {
        await database.insert(userPlaceVisits).values(rows.map((row) => ({userPlaceId: row.id, visitedAt})))
            .onConflictDoNothing();
    }
    return rows.map(toUserPlace);
}
