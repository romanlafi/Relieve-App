ALTER TABLE "users"
    ADD COLUMN "access_subject" text;--> statement-breakpoint
ALTER TABLE "users"
    ADD CONSTRAINT "users_access_subject_unique" UNIQUE ("access_subject");