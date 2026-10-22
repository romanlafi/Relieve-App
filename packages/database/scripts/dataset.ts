import {readFile} from 'node:fs/promises';
import {z} from 'zod';

const slugSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const regionsSchema = z.array(z.object({
    id: z.uuid(), name: z.string().trim().min(1), slug: slugSchema,
    type: z.enum(['mountain_system', 'sector', 'massif', 'valley']),
    parentId: z.uuid().nullable(), geometry: z.null(),
})).min(1);

const placesSchema = z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(z.object({
        type: z.literal('Feature'), id: z.uuid(),
        properties: z.object({
            name: z.string().trim().min(1), slug: slugSchema,
            type: z.enum(['peak', 'lake', 'hut']),
            elevation: z.number().int().min(-500).max(9000).nullable(),
            description: z.string().trim().min(1).max(2000).optional(),
            region: slugSchema, source: z.url(),
            osmId: z.string().regex(/^(node|way|relation)\/[0-9]+$/).optional(),
            wikidataId: z.string().regex(/^Q[0-9]+$/).optional(),
            additionalSources: z.array(z.url()).optional(),
            coordinateMethod: z.enum(['osm-node', 'overpass-bounds-center', 'official-published']).optional(),
        }),
        geometry: z.object({
            type: z.literal('Point'),
            coordinates: z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90)]),
        }),
    })).min(1),
});

export function validateDataset(placesInput: unknown, regionsInput: unknown) {
    const places = placesSchema.parse(placesInput);
    const regions = regionsSchema.parse(regionsInput);

    function unique(values: string[], label: string) {
        if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label}`);
    }

    unique(places.features.map((feature) => feature.id), 'place IDs');
    unique(places.features.map((feature) => feature.properties.slug), 'place slugs');
    unique(regions.map((region) => region.id), 'region IDs');
    unique(regions.map((region) => region.slug), 'region slugs');
    const byId = new Map(regions.map((region) => [region.id, region]));
    const regionSlugs = new Set(regions.map((region) => region.slug));
    for (const region of regions) {
        const ancestors = new Set<string>([region.id]);
        let parentId = region.parentId;
        while (parentId !== null) {
            const parent = byId.get(parentId);
            if (!parent) throw new Error(`Unknown parent for region ${region.slug}`);
            if (ancestors.has(parentId)) throw new Error(`Region hierarchy cycle at ${region.slug}`);
            ancestors.add(parentId);
            parentId = parent.parentId;
        }
    }
    for (const feature of places.features) {
        const {region, slug} = feature.properties;
        if (!regionSlugs.has(region)) throw new Error(`Unknown region for ${slug}`);
        const [longitude, latitude] = feature.geometry.coordinates;
        if (longitude < -0.95 || longitude > 0.8 || latitude < 42.45 || latitude > 42.94) {
            throw new Error(`Coordinates outside the review envelope for ${slug}`);
        }
    }
    const orderedRegions: typeof regions = [];
    const remaining = new Set(regions);
    while (remaining.size > 0) {
        for (const region of remaining) {
            if (region.parentId === null || orderedRegions.some((parent) => parent.id === region.parentId)) {
                orderedRegions.push(region);
                remaining.delete(region);
            }
        }
    }
    return {places, regions: orderedRegions};
}

export type Dataset = ReturnType<typeof validateDataset>;

export async function loadDataset(): Promise<Dataset> {
    const [places, regions] = await Promise.all([
        readFile(new URL('../../../data/places.geojson', import.meta.url), 'utf8'),
        readFile(new URL('../../../data/regions.json', import.meta.url), 'utf8'),
    ]);
    return validateDataset(JSON.parse(places), JSON.parse(regions));
}
