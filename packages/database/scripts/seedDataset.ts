import {sql} from 'drizzle-orm';
import type {NodePgDatabase} from 'drizzle-orm/node-postgres';
import {places, regions, users} from '../src/schema/index.js';
import {developmentUserId} from '../src/developmentUser.js';
import type {Dataset} from './dataset.js';

export async function seedDataset(database: NodePgDatabase, dataset: Dataset) {
    await database.transaction(async (transaction) => {
        const existingPlaces = await transaction.select({id: places.id, slug: places.slug}).from(places);
        const existingRegions = await transaction.select({id: regions.id, slug: regions.slug}).from(regions);
        for (const feature of dataset.places.features) {
            const collision = existingPlaces.find((place) => place.slug === feature.properties.slug && place.id !== feature.id);
            if (collision) throw new Error(`Place identity conflict for ${feature.properties.slug}; reconcile the dataset UUID explicitly`);
        }
        for (const region of dataset.regions) {
            const collision = existingRegions.find((row) => row.slug === region.slug && row.id !== region.id);
            if (collision) throw new Error(`Region identity conflict for ${region.slug}; reconcile the dataset UUID explicitly`);
            const {id, ...values} = region;
            await transaction.insert(regions).values({id, ...values}).onConflictDoUpdate({
                target: regions.id,
                set: values
            });
        }
        await transaction.insert(users).values({id: developmentUserId, name: 'Usuario de desarrollo'})
            .onConflictDoNothing({target: users.id});
        const regionIds = new Map(dataset.regions.map((region) => [region.slug, region.id]));
        for (const feature of dataset.places.features) {
            const {name, slug, type, elevation, region, description} = feature.properties;
            const regionId = regionIds.get(region);
            if (!regionId) throw new Error(`Missing region ${region}`);
            const [longitude, latitude] = feature.geometry.coordinates;
            const values = {
                name, slug, type, elevation, regionId,
                ...(description === undefined ? {} : {description}),
                location: sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`,
            };
            await transaction.insert(places).values({id: feature.id, ...values})
                .onConflictDoUpdate({target: places.id, set: values});
        }
    });
}
