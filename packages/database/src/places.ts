import {and, eq, isNull, sql} from 'drizzle-orm';
import type {Place, PlaceFilters, PlaceWithUserState} from '@relieve/shared';
import type {Database} from './client.js';
import {places, regions, userPlaces} from './schema/index.js';
import {toUserPlaceState} from './dto/userPlace.js';

const placeDto = {
    id: places.id,
    name: places.name,
    slug: places.slug,
    type: places.type,
    elevation: places.elevation,
    latitude: sql<number>`ST_Y(${places.location})`.mapWith(Number),
    longitude: sql<number>`ST_X(${places.location})`.mapWith(Number),
};

export function listPlaces(database: Database): Promise<Place[]> {
    return database.select(placeDto).from(places).orderBy(places.name, places.id);
}

export async function getPlace(database: Database, id: string): Promise<Place | undefined> {
    const [place] = await database.select(placeDto).from(places).where(eq(places.id, id)).limit(1);
    return place;
}

function placesForUser(database: Database, userId: string) {
    return database.select({place: {...placeDto, regionId: places.regionId}, personal: userPlaces}).from(places)
        .leftJoin(userPlaces, and(eq(userPlaces.placeId, places.id), eq(userPlaces.userId, userId)));
}

export async function listPlacesForUser(database: Database, userId: string, filters: PlaceFilters = {}): Promise<PlaceWithUserState[]> {
    const conditions = [];
    if (filters.type) conditions.push(eq(places.type, filters.type));
    if (filters.status === 'unregistered') conditions.push(isNull(userPlaces.id));
    else if (filters.status) conditions.push(eq(userPlaces.status, filters.status));
    if (filters.favorite !== undefined) conditions.push(eq(userPlaces.favorite, filters.favorite));
    if (filters.region) conditions.push(sql`${places.regionId} IN (
        WITH RECURSIVE descendants AS (
            SELECT id FROM ${regions} WHERE slug = ${filters.region}
            UNION
            SELECT child.id FROM ${regions} child JOIN descendants parent ON child.parent_id = parent.id
        ) SELECT id FROM descendants
    )`);
    if (filters.west !== undefined && filters.south !== undefined && filters.east !== undefined && filters.north !== undefined) {
        conditions.push(sql`${places.location} && ST_MakeEnvelope(${filters.west}, ${filters.south}, ${filters.east}, ${filters.north}, 4326)`);
    }
    const rows = await placesForUser(database, userId).where(and(...conditions)).orderBy(places.name, places.id);
    return rows.map(({place, personal}) => ({...place, userState: personal ? toUserPlaceState(personal) : null}));
}

export async function getPlaceForUser(database: Database, userId: string, id: string): Promise<PlaceWithUserState | undefined> {
    const [row] = await placesForUser(database, userId).where(eq(places.id, id)).limit(1);
    return row ? {...row.place, userState: row.personal ? toUserPlaceState(row.personal) : null} : undefined;
}

export function placesInViewport(database: Database, bounds: {
    west: number; south: number; east: number; north: number;
}): Promise<Place[]> {
    return database.select(placeDto).from(places).where(sql`
        ${places.location} && ST_MakeEnvelope(${bounds.west}, ${bounds.south}, ${bounds.east}, ${bounds.north}, 4326)
    `).orderBy(places.name, places.id);
}

export function placesNearby(database: Database, longitude: number, latitude: number, distanceMeters: number): Promise<Place[]> {
    return database.select(placeDto).from(places).where(sql`
        ST_DWithin(${places.location}::geography,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography, ${distanceMeters})
    `).orderBy(places.name, places.id);
}
