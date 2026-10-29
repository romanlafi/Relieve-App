import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {ReactNode} from 'react';

const mocks = vi.hoisted(() => ({dialog: null as string | null}));
vi.mock('../../src/map/MapView', () => ({MapView: () => <div>Mapa principal</div>}));
vi.mock('../../src/auth/AuthProvider', () => ({AuthProvider: ({children}: {children: ReactNode}) => <>{children}</>}));
vi.mock('../../src/auth/authContext', () => ({useAuth: () => ({user: null, dialog: mocks.dialog})}));
vi.mock('../../src/auth/AccountPanel', () => ({AuthDialog: () => <div>Diálogo de cuenta</div>}));

const {App} = await import('../../src/App');

describe('App', () => {
    beforeEach(() => { mocks.dialog = null; });

    it('renders the map inside the authentication provider', () => {
        render(<App/>);
        expect(screen.getByText('Mapa principal')).toBeTruthy();
        expect(screen.queryByText('Diálogo de cuenta')).toBeNull();
    });

    it('renders the account dialog when authentication state requests it', () => {
        mocks.dialog = 'login';
        render(<App/>);
        expect(screen.getByText('Mapa principal')).toBeTruthy();
        expect(screen.getByText('Diálogo de cuenta')).toBeTruthy();
    });
});
