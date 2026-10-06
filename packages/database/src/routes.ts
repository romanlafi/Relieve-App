import {toRouteSummary} from './dto/route.js';
import {and, desc, eq, sql} from 'drizzle-orm';
import type {NearbyRoutePlace, RouteDetail, RouteGeometry, RouteImport, RouteSummary} from '@relieve/shared';
import type {Database} from './client.js';
import {places, routes, userPlaces} from './schema/index.js';
import {placeDto} from './places.js';
import {toUserPlaceState} from './dto/userPlace.js';

export const DEFAULT_ROUTE_PROXIMITY_METERS = 100;
const summaryColumns = {
    id: routes.id, name: routes.name, activityDate: routes.activityDate,
    distanceMeters: routes.distanceM, elevationGainMeters: routes.elevationGainM,
    elevationLossMeters: routes.elevationLossM, minElevationMeters: routes.minElevationM,
    maxElevationMeters: routes.maxElevationM, startedAt: routes.startedAt,
    endedAt: routes.endedAt, createdAt: routes.createdAt, updatedAt: routes.updatedAt,
};
const owned = (userId: string, id: string) => and(eq(routes.userId, userId), eq(routes.id, id));
export async function importRoute(database: Database, userId: string, input: RouteImport): Promise<RouteDetail> {
    const geometry = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(input.geometry)}),4326)`;
    const [row] = await database.insert(routes).values({
        userId, name: input.name, activityDate: input.activityDate, geometry,
        distanceM: sql`ST_Length(ST_Force2D(${geometry})::geography)`,
        elevationSamples: input.elevationSamples,
        elevationGainM: input.elevationGainMeters, elevationLossM: input.elevationLossMeters,
        minElevationM: input.minElevationMeters, maxElevationM: input.maxElevationMeters,
        startedAt: input.startedAt ? new Date(input.startedAt) : null,
        endedAt: input.endedAt ? new Date(input.endedAt) : null,
    }).returning(summaryColumns);
    if (!row) throw new Error('Unable to import route');
    return {...toRouteSummary(row), geometry: input.geometry};
}
export async function listRoutes(database: Database, userId: string): Promise<RouteSummary[]> {
    return (await database.select(summaryColumns).from(routes).where(eq(routes.userId, userId))
        .orderBy(desc(routes.createdAt), routes.id)).map(toRouteSummary);
}
export async function getRouteSummary(database: Database, userId: string, id: string): Promise<RouteSummary | undefined> {
    const [row] = await database.select(summaryColumns).from(routes).where(owned(userId, id)).limit(1);
    return row ? toRouteSummary(row) : undefined;
}
export async function getRoute(database: Database, userId: string, id: string): Promise<RouteDetail | undefined> {
    const [row] = await database.select({...summaryColumns,
        geometry: sql<RouteGeometry>`ST_AsGeoJSON(${routes.geometry},15)::json`,
    }).from(routes).where(owned(userId, id)).limit(1);
    return row ? {...toRouteSummary(row), geometry: row.geometry} : undefined;
}
export async function deleteRoute(database: Database, userId: string, id: string): Promise<boolean> {
    return (await database.delete(routes).where(owned(userId, id)).returning({id: routes.id})).length > 0;
}
export async function nearbyRoutePlaces(database: Database, userId: string, id: string,
                                         distance = DEFAULT_ROUTE_PROXIMITY_METERS): Promise<NearbyRoutePlace[]> {
    const routeGeography = sql`ST_Force2D(${routes.geometry})::geography`;
    const distanceSql = sql<number>`ST_Distance(${places.location}::geography, ${routeGeography})`.mapWith(Number);
    const rows = await database.select({place: placeDto, personal: userPlaces, distanceFromRoute: distanceSql})
        .from(routes).innerJoin(places, sql`ST_DWithin(${places.location}::geography, ${routeGeography}, ${distance})`)
        .leftJoin(userPlaces, and(eq(userPlaces.placeId, places.id), eq(userPlaces.userId, userId)))
        .where(owned(userId, id)).orderBy(distanceSql, places.name, places.id);
    return rows.map(({place, personal, distanceFromRoute}) => ({place, distanceFromRoute,
        userState: personal ? toUserPlaceState(personal) : null}));
}
