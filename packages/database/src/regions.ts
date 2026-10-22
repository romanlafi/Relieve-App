import type {Region} from '@relieve/shared';
import {eq} from 'drizzle-orm';
import type {Database} from './client.js';
import {regions} from './schema/index.js';

export function listRegions(database: Database): Promise<Region[]> {
    return database.select({
        id: regions.id, name: regions.name, slug: regions.slug, type: regions.type, parentId: regions.parentId,
    }).from(regions).orderBy(regions.name, regions.id);
}

export async function regionExists(database: Database, id: string): Promise<boolean> {
    const [region] = await database.select({id: regions.id}).from(regions).where(eq(regions.id, id)).limit(1);
    return Boolean(region);
}
