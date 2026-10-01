CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at
= clock_timestamp();
RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER regions_updated_at
    BEFORE UPDATE
    ON public.regions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER places_updated_at
    BEFORE UPDATE
    ON public.places
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER users_updated_at
    BEFORE UPDATE
    ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER user_places_updated_at
    BEFORE UPDATE
    ON public.user_places
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
