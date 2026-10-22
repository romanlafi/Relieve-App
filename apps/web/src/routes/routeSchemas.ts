import {z} from 'zod';
import type {NearbyRoutePlace, RouteDetail} from '@relieve/shared';
import {userPlaceStateSchema} from '../map/placeSchemas';
const metric = z.number().finite();
export const routeSummarySchema = z.object({
    id: z.uuid(), name: z.string(), activityDate: z.iso.date().nullable(),
    distanceMeters: metric.nonnegative(), elevationGainMeters: metric.nullable(),
    elevationLossMeters: metric.nullable(), minElevationMeters: metric.nullable(), maxElevationMeters: metric.nullable(),
    startedAt: z.iso.datetime().nullable(), endedAt: z.iso.datetime().nullable(), durationSeconds: metric.nullable(),
    createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
});
export const routeDetailSchema: z.ZodType<RouteDetail> = z.object({
    ...routeSummarySchema.shape,
    geometry: z.object({type: z.literal('MultiLineString'), coordinates: z.array(z.array(z.array(metric).min(2).max(3)).min(2)).min(1)}),
});
export const nearbyPlacesSchema: z.ZodType<NearbyRoutePlace[]> = z.array(z.object({
    place: z.object({id: z.uuid(), name: z.string(), slug: z.string(), type: z.enum(['peak','lake','hut','pass','viewpoint']),
        elevation: metric.nullable(), longitude: metric.min(-180).max(180), latitude: metric.min(-90).max(90),
        description: z.string().nullable()}),
    distanceFromRoute: metric.nonnegative(), userState: userPlaceStateSchema.nullable(),
}));
