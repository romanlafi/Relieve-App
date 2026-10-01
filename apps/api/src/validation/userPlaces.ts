import {z} from 'zod';

export const placeIdSchema = z.uuid();

export const updateUserPlaceSchema = z.strictObject({
    status: z.enum(['pending', 'visited']).optional(),
    favorite: z.boolean().optional(),
    visitedAt: z.iso.date().nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
}).refine((input) => Object.keys(input).length > 0, {message: 'At least one field is required'})
    .refine((input) => !(input.status === 'pending' && input.visitedAt), {
        message: 'A pending place cannot have a visit date', path: ['visitedAt'],
    });
