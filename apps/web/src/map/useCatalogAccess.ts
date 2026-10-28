import {useAuth} from '../auth/authContext';

export function useCatalogAccess() {
    const auth = useAuth();
    return {canEditCatalog: auth.canEditCatalog, publicReadOnly: !auth.authenticated,
        authenticated: auth.authenticated, authAvailable: auth.authAvailable};
}
