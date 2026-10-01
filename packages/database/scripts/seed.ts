import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {drizzle} from 'drizzle-orm/node-postgres';
import {sql} from 'drizzle-orm';
import {z} from 'zod';
import {places, regions, users} from '../src/schema/index.js';
import {databaseUrl} from './environment.js';
import {developmentUserId} from '../src/developmentUser.js';

const datasetSchema = z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(z.object({
        type: z.literal('Feature'),
        properties: z.object({
            name: z.string().trim().min(1),
            slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
            type: z.enum(['peak', 'lake', 'hut', 'pass', 'viewpoint']),
            elevation: z.number().int().min(-500).max(9000).nullable(),
            source: z.url(),
        }),
        geometry: z.object({
            type: z.literal('Point'),
            coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
        }),
    })).min(1),
}).superRefine((dataset, context) => {
    const slugs = dataset.features.map((feature) => feature.properties.slug);
    if (new Set(slugs).size !== slugs.length) {
        context.addIssue({code: 'custom', message: 'Duplicate place slugs'});
    }
});

async function main() {
    const dataset = datasetSchema.parse(JSON.parse(await readFile(new URL('../../../data/places.geojson', import.meta.url), 'utf8')));
    const pool = new pg.Pool({connectionString: databaseUrl('DATABASE_URL_DIRECT'), max: 1});
    try {
        await drizzle(pool).transaction(async (transaction) => {
            const [region] = await transaction.insert(regions).values({
                name: 'Pirineos',
                slug: 'pirineos',
                type: 'mountain_system'
            })
                .onConflictDoUpdate({target: regions.slug, set: {name: 'Pirineos'}}).returning({id: regions.id});
            if (!region) throw new Error('Unable to seed region');
            await transaction.insert(users).values({
                id: developmentUserId,
                name: 'Usuario de desarrollo'
            })
                .onConflictDoNothing({target: users.id});
            for (const feature of dataset.features) {
                const {name, slug, type, elevation} = feature.properties;
                const [longitude, latitude] = feature.geometry.coordinates;
                const values = {
                    name, slug, type, elevation, regionId: region.id,
                    location: sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`,
                };
                await transaction.insert(places).values(values).onConflictDoUpdate({target: places.slug, set: values});
            }
        });
        console.info(`Seed complete: ${dataset.features.length} places, Pirineos region and development user. Safe to repeat.`);
    } finally {
        await pool.end();
    }
}

main().catch(() => {
    console.error('Seed failed. Check the dataset, DATABASE_URL_DIRECT and applied migrations. No credentials logged.');
    process.exitCode = 1;
});
