import {and, eq, sql} from 'drizzle-orm';
import type {PersonalStats} from '@relieve/shared';
import type {Database} from './client.js';
import {places, userPlaceVisits, userPlaces} from './schema/index.js';

export async function getPersonalStats(database: Database, userId: string): Promise<PersonalStats> {
    const [rows, byRegion, byYear] = await Promise.all([
        database.select({
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
            .groupBy(places.type).orderBy(places.type),
        database.execute(sql<PersonalStats['byRegion'][number]>`
            WITH RECURSIVE region_tree(root_id, descendant_id) AS (
                SELECT id, id FROM regions
                UNION ALL
                SELECT region_tree.root_id, child.id
                FROM region_tree
                JOIN regions child ON child.parent_id = region_tree.descendant_id
            )
            SELECT root.id, root.name, root.slug, root.type,
                COUNT(DISTINCT place.id)::int AS total,
                (COUNT(DISTINCT place.id) FILTER (WHERE user_place.status = 'visited'))::int AS visited,
                (COUNT(DISTINCT place.id) FILTER (WHERE user_place.status = 'pending'))::int AS pending,
                (COUNT(DISTINCT place.id) FILTER (WHERE user_place.favorite = true))::int AS favorites
            FROM region_tree
            JOIN regions root ON root.id = region_tree.root_id
            LEFT JOIN places place ON place.region_id = region_tree.descendant_id
            LEFT JOIN user_places user_place ON user_place.place_id = place.id AND user_place.user_id = ${userId}
            GROUP BY root.id
            HAVING COUNT(DISTINCT place.id) > 0
            ORDER BY CASE root.type
                WHEN 'mountain_system' THEN 0
                WHEN 'sector' THEN 1
                WHEN 'massif' THEN 2
                ELSE 3
            END, root.name, root.id
        `).then((result) => result.rows.map((row): PersonalStats['byRegion'][number] => ({
            id: String(row.id),
            name: String(row.name),
            slug: String(row.slug),
            type: row.type as PersonalStats['byRegion'][number]['type'],
            total: Number(row.total),
            visited: Number(row.visited),
            pending: Number(row.pending),
            favorites: Number(row.favorites),
        }))),
        database.select({
            year: sql<number>`EXTRACT(YEAR FROM ${userPlaceVisits.visitedAt})::int`.mapWith(Number),
            visited: sql<number>`count(*)`.mapWith(Number),
        }).from(userPlaceVisits).innerJoin(userPlaces, eq(userPlaces.id, userPlaceVisits.userPlaceId))
            .where(eq(userPlaces.userId, userId)).groupBy(sql`EXTRACT(YEAR FROM ${userPlaceVisits.visitedAt})`)
            .orderBy(sql`EXTRACT(YEAR FROM ${userPlaceVisits.visitedAt}) DESC`),
    ]);
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
        byRegion,
        byYear,
        highestPeak: highest && highest.elevation !== null ? {...highest, elevation: highest.elevation} : null,
    };
}
