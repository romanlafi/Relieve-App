import {z} from 'zod';

const coordinate = (minimum: number, maximum: number) => z.string().trim().min(1)
    .transform(Number).pipe(z.number().finite().min(minimum).max(maximum)).optional();
const elevation = z.string().trim().min(1).transform(Number)
    .pipe(z.number().finite().int().min(-500).max(9000)).optional();

export const placeFiltersSchema = z.strictObject({
    type: z.enum(['peak', 'lake', 'hut', 'pass', 'viewpoint']).optional(),
    region: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(100).optional(),
    massif: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(100).optional(),
    status: z.enum(['pending', 'visited', 'unregistered']).optional(),
    favorite: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
    elevationMin: elevation,
    elevationMax: elevation,
    north: coordinate(-90, 90), south: coordinate(-90, 90),
    east: coordinate(-180, 180), west: coordinate(-180, 180),
}).superRefine((filters, context) => {
    const bounds = [filters.north, filters.south, filters.east, filters.west];
    const supplied = bounds.filter((value) => value !== undefined).length;
    if (supplied !== 0 && supplied !== 4) {
        context.addIssue({code: 'custom', message: 'Viewport requires north, south, east and west'});
    }
    if (filters.north !== undefined && filters.south !== undefined && filters.north <= filters.south) {
        context.addIssue({code: 'custom', message: 'North must be greater than south'});
    }
    if (filters.east !== undefined && filters.west !== undefined && filters.east <= filters.west) {
        context.addIssue({
            code: 'custom',
            message: 'East must be greater than west; antimeridian viewports are not supported'
        });
    }
    if (filters.elevationMin !== undefined && filters.elevationMax !== undefined
        && filters.elevationMin > filters.elevationMax) {
        context.addIssue({code: 'custom', message: 'Minimum elevation must not exceed maximum elevation'});
    }
});
