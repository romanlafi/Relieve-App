CREATE TABLE "user_place_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_place_id" uuid NOT NULL,
	"visited_at" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_place_visits" ADD CONSTRAINT "user_place_visits_user_place_id_user_places_id_fk" FOREIGN KEY ("user_place_id") REFERENCES "public"."user_places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_place_visits_user_place_date_idx" ON "user_place_visits" USING btree ("user_place_id","visited_at");--> statement-breakpoint
CREATE INDEX "user_place_visits_visited_at_idx" ON "user_place_visits" USING btree ("visited_at");--> statement-breakpoint
INSERT INTO "user_place_visits" ("user_place_id", "visited_at")
SELECT "id", ("visited_at" AT TIME ZONE 'UTC')::date
FROM "user_places"
WHERE "status" = 'visited' AND "visited_at" IS NOT NULL
ON CONFLICT ("user_place_id", "visited_at") DO NOTHING;
