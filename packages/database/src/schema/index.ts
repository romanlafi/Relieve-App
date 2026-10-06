import {sql} from 'drizzle-orm';
import type {AnyPgColumn} from 'drizzle-orm/pg-core';
import {
    boolean,
    check,
    customType,
    index,
    integer,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
} from 'drizzle-orm/pg-core';

export const placeType = pgEnum('place_type', ['peak', 'lake', 'hut', 'pass', 'viewpoint']);
export const regionType = pgEnum('region_type', ['mountain_system', 'sector', 'massif', 'valley']);
export const placeStatus = pgEnum('place_status', ['pending', 'visited']);

const multiPolygon = customType<{ data: string }>({
    dataType: () => 'geometry(MultiPolygon,4326)',
});

const point = customType<{ data: string }>({
    dataType: () => 'geometry(Point,4326)',
});

const timestamps = () => ({
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
});

export const regions = pgTable('regions', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    type: regionType('type').notNull(),
    parentId: uuid('parent_id').references((): AnyPgColumn => regions.id, {onDelete: 'restrict'}),
    geometry: multiPolygon('geometry'),
    ...timestamps(),
}, (table) => [
    index('regions_parent_id_idx').on(table.parentId),
    index('regions_geometry_gist_idx').using('gist', table.geometry),
    check('regions_name_not_blank', sql`length(trim(${table.name})) > 0`),
    check('regions_slug_format', sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('regions_no_self_parent', sql`${table.parentId} IS NULL OR ${table.parentId} <> ${table.id}`),
    check('regions_geometry_valid', sql`${table.geometry} IS NULL OR (ST_IsValid(${table.geometry}) AND NOT ST_IsEmpty(${table.geometry}))`),
]);

export const places = pgTable('places', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    type: placeType('type').notNull(),
    elevation: integer('elevation'),
    location: point('location').notNull(),
    regionId: uuid('region_id').references(() => regions.id, {onDelete: 'set null'}),
    description: text('description'),
    ...timestamps(),
}, (table) => [
    index('places_type_idx').on(table.type),
    index('places_region_id_idx').on(table.regionId),
    index('places_location_gist_idx').using('gist', table.location),
    index('places_location_geography_gist_idx').using('gist', sql`(${table.location}::geography)`),
    check('places_name_not_blank', sql`length(trim(${table.name})) > 0`),
    check('places_slug_format', sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('places_elevation_range', sql`${table.elevation} IS NULL OR ${table.elevation} BETWEEN -500 AND 9000`),
    check('places_location_valid', sql`NOT ST_IsEmpty(${table.location}) AND ST_X(${table.location}) BETWEEN -180 AND 180 AND ST_Y(${table.location}) BETWEEN -90 AND 90`),
]);

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    accessSubject: text('access_subject').unique(),
    name: text('name').notNull(),
    ...timestamps(),
}, (table) => [check('users_name_not_blank', sql`length(trim(${table.name})) > 0`)]);

export const userPlaces = pgTable('user_places', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, {onDelete: 'cascade'}),
    placeId: uuid('place_id').notNull().references(() => places.id, {onDelete: 'cascade'}),
    status: placeStatus('status').notNull().default('pending'),
    visitedAt: timestamp('visited_at', {withTimezone: true}),
    favorite: boolean('favorite').notNull().default(false),
    notes: text('notes'),
    ...timestamps(),
}, (table) => [
    uniqueIndex('user_places_user_place_idx').on(table.userId, table.placeId),
    index('user_places_place_id_idx').on(table.placeId),
    index('user_places_user_status_idx').on(table.userId, table.status),
    check('user_places_visit_status', sql`${table.status} = 'visited' OR ${table.visitedAt} IS NULL`),
]);
