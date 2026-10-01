import type {Region} from '@relieve/shared';
import type {Database} from './client.js';
import {regions} from './schema/index.js';

export function listRegions(database: Database): Promise<Region[]> {
    return database.select({
        id: regions.id, name: regions.name, slug: regions.slug, type: regions.type, parentId: regions.parentId,
    }).from(regions).orderBy(regions.name, regions.id);
}
