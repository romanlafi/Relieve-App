import {createContext, useContext} from 'react';

export type Identity = {
    authenticated: boolean; authAvailable: boolean; canEditCatalog: boolean;
    user: {id: string; name: string; email: string | null} | null;
};
export type AuthMode = 'signin' | 'signup';
export type AuthState = Identity & {
    status: 'loading' | 'ready' | 'error'; dialog: AuthMode | null;
    refresh: () => Promise<Identity>; open: (mode?: AuthMode) => void; close: () => void;
};
export const AuthContext = createContext<AuthState | null>(null);
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('Missing AuthProvider');
    return context;
}
