import {useCallback, useEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import {z} from 'zod';
import {AuthContext} from './authContext';
import type {Identity, AuthMode, AuthState} from './authContext';

const identitySchema = z.object({
    authenticated: z.boolean(), authAvailable: z.boolean(), canEditCatalog: z.boolean(),
    user: z.object({id: z.string(), name: z.string(), email: z.string().nullable()}).nullable(),
});
const anonymous: Identity = {authenticated: false, authAvailable: false, canEditCatalog: false, user: null};

export function AuthProvider({children}: {children: ReactNode}) {
    const [identity, setIdentity] = useState(anonymous);
    const [status, setStatus] = useState<AuthState['status']>('loading');
    const [dialog, setDialog] = useState<AuthMode | null>(null);
    const requestVersion = useRef(0);
    const refresh = useCallback(async () => {
        const version = ++requestVersion.current;
        try {
            const response = await fetch('/api/me', {credentials: 'same-origin', cache: 'no-store'});
            if (!response.ok) throw new Error('No se ha podido comprobar la sesión.');
            const next = identitySchema.parse(await response.json());
            if (version === requestVersion.current) { setIdentity(next); setStatus('ready'); }
            return next;
        } catch (error) {
            if (version === requestVersion.current) setStatus('error');
            throw error;
        }
    }, []);
    useEffect(() => {
        void refresh().catch(() => {});
        function expired() { void refresh().then(() => setDialog('signin')).catch(() => {}); }
        function changed(event: StorageEvent) {
            if (event.key === 'relieve-auth-changed') void refresh().catch(() => {});
        }
        function focused() { void refresh().catch(() => {}); }
        window.addEventListener('relieve-session-expired', expired);
        window.addEventListener('storage', changed);
        window.addEventListener('focus', focused);
        return () => {
            window.removeEventListener('relieve-session-expired', expired);
            window.removeEventListener('storage', changed);
            window.removeEventListener('focus', focused);
        };
    }, [refresh]);
    return <AuthContext.Provider value={{...identity, status, dialog, refresh,
        open: (mode = 'signin') => setDialog(mode), close: () => setDialog(null)}}>{children}</AuthContext.Provider>;
}

