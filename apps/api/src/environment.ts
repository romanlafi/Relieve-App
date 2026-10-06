export type ApiEnvironment = {
    Bindings: {
        DATABASE_URL: string;
        LOCAL_DEVELOPMENT?: string;
        ACCESS_TEAM_DOMAIN?: string;
        ACCESS_AUDIENCE?: string;
    };
    Variables: { userId: string };
};
