import {and, eq, sql} from 'drizzle-orm';
import type {PersonalStats} from '@relieve/shared';
import type {Database} from './client.js';
import {places, userPlaces} from './schema/index.js';

export async function getPersonalStats(database: Database, userId: string): Promise<PersonalStats> {
    const rows = await database.select({
        type: places.type,
        total: sql<number>`count(*)`.mapWith(Number),
        visited: sql<number>`count(*) filter (where ${userPlaces.status} = 'visited')`.mapWith(Number),
        pending: sql<number>`count(*) filter (where ${userPlaces.status} = 'pending')`.mapWith(Number),
        favorites: sql<number>`count(*) filter (where ${userPlaces.favorite} = true)`.mapWith(Number),
        threeTotal: sql<number>`count(*) filter (where ${places.type} = 'peak' and ${places.elevation} >= 3000)`.mapWith(Number),
        threeVisited: sql<number>`count(*) filter (where ${places.type} = 'peak' and ${places.elevation} >= 3000 and ${userPlaces.status} = 'visited')`.mapWith(Number),
        highest: sql<string | null>`(array_agg(${places.id} order by ${places.elevation} desc, ${places.name}, ${places.id})
            filter (where ${places.type} = 'peak' and ${places.elevation} is not null and ${userPlaces.status} = 'visited'))[1]`,
    }).from(places).leftJoin(userPlaces, and(eq(userPlaces.placeId, places.id), eq(userPlaces.userId, userId)))
        .groupBy(places.type).orderBy(places.type);
    const highestId = rows.find((row) => row.type === 'peak')?.highest;
    const [highest] = highestId ? await database.select({id: places.id, name: places.name, elevation: places.elevation})
        .from(places).where(eq(places.id, highestId)) : [];
    return {
        total: rows.reduce((sum, row) => sum + row.total, 0),
        visited: rows.reduce((sum, row) => sum + row.visited, 0),
        pending: rows.reduce((sum, row) => sum + row.pending, 0),
        favorites: rows.reduce((sum, row) => sum + row.favorites, 0),
        threeThousands: {
            total: rows.reduce((sum, row) => sum + row.threeTotal, 0),
            visited: rows.reduce((sum, row) => sum + row.threeVisited, 0)
        },
        byType: rows.map(({type, total, visited}) => ({type, total, visited})),
        highestPeak: highest && highest.elevation !== null ? {...highest, elevation: highest.elevation} : null,
    };
}
