import {z} from 'zod';
import type {PlaceWithUserState, UserPlace} from '@relieve/shared';

export const userPlaceStateSchema = z.object({
    status: z.enum(['pending', 'visited']),
    favorite: z.boolean(),
    visitedAt: z.iso.date().nullable(),
    notes: z.string().nullable(),
});

export const userPlaceSchema: z.ZodType<UserPlace> = userPlaceStateSchema.extend({placeId: z.uuid()});

export const placesSchema: z.ZodType<PlaceWithUserState[]> = z.array(z.object({
    id: z.uuid(),
    name: z.string().min(1),
    slug: z.string().min(1),
    type: z.enum(['peak', 'lake', 'hut', 'pass', 'viewpoint']),
    elevation: z.number().finite().nullable(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    userState: userPlaceStateSchema.nullable(),
}));
