import {z} from 'zod';
export const routeIdSchema = z.uuid();
export const routeNameSchema = z.string().trim().max(200).optional();
export const proximitySchema = z.coerce.number().finite().min(1).max(500).default(100);
export const confirmRoutePlacesSchema = z.strictObject({
    placeIds: z.array(z.uuid()).min(1).max(100).refine((ids) => new Set(ids).size === ids.length),
    useActivityDate: z.boolean().default(false),
});
