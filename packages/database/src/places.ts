import {and, eq, sql} from 'drizzle-orm';
import type {Place, PlaceWithUserState} from '@relieve/shared';
import type {Database} from './client.js';
import {places, userPlaces} from './schema/index.js';
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
    return database.select({place: placeDto, personal: userPlaces}).from(places)
        .leftJoin(userPlaces, and(eq(userPlaces.placeId, places.id), eq(userPlaces.userId, userId)));
}

export async function listPlacesForUser(database: Database, userId: string): Promise<PlaceWithUserState[]> {
    const rows = await placesForUser(database, userId).orderBy(places.name, places.id);
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
