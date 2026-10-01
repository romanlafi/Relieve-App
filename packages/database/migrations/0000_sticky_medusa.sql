CREATE
EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE TYPE "public"."place_status" AS ENUM('pending', 'visited');--> statement-breakpoint
CREATE TYPE "public"."place_type" AS ENUM('peak', 'lake', 'hut', 'pass', 'viewpoint');--> statement-breakpoint
CREATE TYPE "public"."region_type" AS ENUM('mountain_system', 'sector', 'massif', 'valley');--> statement-breakpoint
CREATE TABLE "places"
(
    "id"          uuid PRIMARY KEY         DEFAULT gen_random_uuid() NOT NULL,
    "name"        text                                               NOT NULL,
    "slug"        text                                               NOT NULL,
    "type"        "place_type"                                       NOT NULL,
    "elevation"   integer,
    "location"    geometry(Point,4326) NOT NULL,
    "region_id"   uuid,
    "description" text,
    "created_at"  timestamp with time zone DEFAULT now()             NOT NULL,
    "updated_at"  timestamp with time zone DEFAULT now()             NOT NULL,
    CONSTRAINT "places_slug_unique" UNIQUE ("slug"),
    CONSTRAINT "places_name_not_blank" CHECK (length(trim("places"."name")) > 0),
    CONSTRAINT "places_slug_format" CHECK ("places"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
) ,
	CONSTRAINT "places_elevation_range" CHECK ("places"."elevation" IS NULL OR "places"."elevation" BETWEEN -500 AND 9000),
	CONSTRAINT "places_location_valid" CHECK (NOT ST_IsEmpty("places"."location") AND ST_X("places"."location") BETWEEN -180 AND 180 AND ST_Y("places"."location") BETWEEN -90 AND 90)
);
--> statement-breakpoint
CREATE TABLE "regions"
(
    "id"         uuid PRIMARY KEY         DEFAULT gen_random_uuid() NOT NULL,
    "name"       text                                               NOT NULL,
    "slug"       text                                               NOT NULL,
    "type"       "region_type"                                      NOT NULL,
    "parent_id"  uuid,
    "geometry"   geometry(MultiPolygon,4326),
    "created_at" timestamp with time zone DEFAULT now()             NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now()             NOT NULL,
    CONSTRAINT "regions_slug_unique" UNIQUE ("slug"),
    CONSTRAINT "regions_name_not_blank" CHECK (length(trim("regions"."name")) > 0),
    CONSTRAINT "regions_slug_format" CHECK ("regions"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
) ,
	CONSTRAINT "regions_no_self_parent" CHECK ("regions"."parent_id" IS NULL OR "regions"."parent_id" <> "regions"."id"),
	CONSTRAINT "regions_geometry_valid" CHECK ("regions"."geometry" IS NULL OR (ST_IsValid("regions"."geometry") AND NOT ST_IsEmpty("regions"."geometry")))
);
--> statement-breakpoint
CREATE TABLE "user_places"
(
    "id"         uuid PRIMARY KEY         DEFAULT gen_random_uuid() NOT NULL,
    "user_id"    uuid                                               NOT NULL,
    "place_id"   uuid                                               NOT NULL,
    "status"     "place_status"           DEFAULT 'pending'         NOT NULL,
    "visited_at" timestamp with time zone,
    "favorite"   boolean                  DEFAULT false             NOT NULL,
    "notes"      text,
    "created_at" timestamp with time zone DEFAULT now()             NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now()             NOT NULL,
    CONSTRAINT "user_places_visit_status" CHECK ("user_places"."status" = 'visited' OR "user_places"."visited_at" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "users"
(
    "id"         uuid PRIMARY KEY         DEFAULT gen_random_uuid() NOT NULL,
    "name"       text                                               NOT NULL,
    "created_at" timestamp with time zone DEFAULT now()             NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now()             NOT NULL,
    CONSTRAINT "users_name_not_blank" CHECK (length(trim("users"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "places"
    ADD CONSTRAINT "places_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions" ("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regions"
    ADD CONSTRAINT "regions_parent_id_regions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."regions" ("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_places"
    ADD CONSTRAINT "user_places_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_places"
    ADD CONSTRAINT "user_places_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places" ("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "places_type_idx" ON "places" USING btree ("type");--> statement-breakpoint
CREATE INDEX "places_region_id_idx" ON "places" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "places_location_gist_idx" ON "places" USING gist ("location");--> statement-breakpoint
CREATE INDEX "places_location_geography_gist_idx" ON "places" USING gist (("location"::geography));--> statement-breakpoint
CREATE INDEX "regions_parent_id_idx" ON "regions" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "regions_geometry_gist_idx" ON "regions" USING gist ("geometry");--> statement-breakpoint
CREATE UNIQUE INDEX "user_places_user_place_idx" ON "user_places" USING btree ("user_id","place_id");--> statement-breakpoint
CREATE INDEX "user_places_place_id_idx" ON "user_places" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "user_places_user_status_idx" ON "user_places" USING btree ("user_id","status");
