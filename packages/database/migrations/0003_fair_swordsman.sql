CREATE TABLE "routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"activity_date" date,
	"geometry" geometry NOT NULL,
	"elevation_samples" jsonb,
	"distance_m" double precision NOT NULL,
	"elevation_gain_m" double precision,
	"elevation_loss_m" double precision,
	"min_elevation_m" double precision,
	"max_elevation_m" double precision,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routes_name_valid" CHECK (length(trim("routes"."name")) BETWEEN 1 AND 200),
	CONSTRAINT "routes_geometry_valid" CHECK (ST_SRID("routes"."geometry") = 4326 AND GeometryType("routes"."geometry") = 'MULTILINESTRING' AND ST_NDims("routes"."geometry") IN (2,3) AND NOT ST_IsEmpty("routes"."geometry") AND ST_IsValid("routes"."geometry")),
	CONSTRAINT "routes_distance_valid" CHECK ("routes"."distance_m" >= 0 AND "routes"."distance_m" < 'Infinity'::float8)
);
--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "routes_user_id_idx" ON "routes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "routes_geometry_gist_idx" ON "routes" USING gist ("geometry");
--> statement-breakpoint
CREATE TRIGGER routes_updated_at BEFORE UPDATE ON public.routes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
