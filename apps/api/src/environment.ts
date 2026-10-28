export type ApiEnvironment = {
    Bindings: {
        DATABASE_URL: string;
        NEON_AUTH_URL?: string;
        PUBLIC_READ_ONLY?: string;
        LOCAL_DEVELOPMENT?: string;
        ACCESS_TEAM_DOMAIN?: string;
        ACCESS_AUDIENCE?: string;
        CATALOG_EDITOR_EMAILS?: string;
    };
    Variables: {
        userId: string;
        canEditCatalog: boolean;
        authenticated: boolean;
        user: {id: string; name: string; email: string | null} | null;
    };
};
