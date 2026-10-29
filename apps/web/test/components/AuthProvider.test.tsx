import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {AuthProvider} from '../../src/auth/AuthProvider';
import {useAuth} from '../../src/auth/authContext';

const identity = {authenticated: true, authAvailable: true, canEditCatalog: true,
    user: {id: 'user-1', name: 'Ana', email: 'ana@example.com'}};

function Consumer() {
    const auth = useAuth();
    return <div>
        <p>{auth.status}:{auth.authenticated ? auth.user?.name : 'guest'}:{auth.dialog ?? 'closed'}</p>
        <button onClick={() => auth.open('signup')}>Open signup</button>
        <button onClick={() => auth.close()}>Close dialog</button>
        <button onClick={() => void auth.refresh().catch(() => {})}>Refresh session</button>
    </div>;
}

describe('AuthProvider', () => {
    it('refreshes on matching storage, focus and session-expired events', async () => {
        const fetch = vi.fn(async () => Response.json(identity));
        vi.stubGlobal('fetch', fetch);
        render(<AuthProvider><Consumer/></AuthProvider>);
        expect(await screen.findByText('ready:Ana:closed')).toBeTruthy();

        window.dispatchEvent(new StorageEvent('storage', {key: 'other-key'}));
        expect(fetch).toHaveBeenCalledTimes(1);
        window.dispatchEvent(new StorageEvent('storage', {key: 'relieve-auth-changed'}));
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
        window.dispatchEvent(new Event('focus'));
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
        window.dispatchEvent(new Event('relieve-session-expired'));
        expect(await screen.findByText('ready:Ana:signin')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', {name: 'Open signup'}));
        expect(screen.getByText('ready:Ana:signup')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', {name: 'Close dialog'}));
        expect(screen.getByText('ready:Ana:closed')).toBeTruthy();
    });

    it('shows an error for failed or invalid identity responses and can recover', async () => {
        const fetch = vi.fn().mockResolvedValueOnce(new Response('', {status: 503}))
            .mockResolvedValueOnce(Response.json({...identity, canEditCatalog: 'yes'}))
            .mockResolvedValueOnce(Response.json(identity));
        vi.stubGlobal('fetch', fetch);
        render(<AuthProvider><Consumer/></AuthProvider>);
        expect(await screen.findByText('error:guest:closed')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', {name: 'Refresh session'}));
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(screen.getByText('error:guest:closed')).toBeTruthy());
        fireEvent.click(screen.getByRole('button', {name: 'Refresh session'}));
        expect(await screen.findByText('ready:Ana:closed')).toBeTruthy();
    });
});
