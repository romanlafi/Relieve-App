import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {AuthState, Identity} from '../../src/auth/authContext';
import {AuthContext} from '../../src/auth/authContext';
import {AccountPanel, AuthDialog, SignInPrompt} from '../../src/auth/AccountPanel';

const guest: Identity = {authenticated: false, authAvailable: true, canEditCatalog: false, user: null};
function auth(overrides: Partial<AuthState> = {}): AuthState {
    return { ...guest, status: 'ready', dialog: null, refresh: vi.fn().mockResolvedValue(guest),
        open: vi.fn(), close: vi.fn(), ...overrides };
}
function renderWithAuth(view: React.ReactNode, state: AuthState) {
    return render(<AuthContext.Provider value={state}>{view}</AuthContext.Provider>);
}

describe('AccountPanel', () => {
    it('shows account prompts and exposes the correct auth actions', () => {
        const state = auth();
        renderWithAuth(<><SignInPrompt/><AccountPanel/></>, state);
        fireEvent.click(screen.getByRole('button', {name: 'Iniciar sesión'}));
        expect(state.open).toHaveBeenCalledWith();
        fireEvent.click(screen.getAllByRole('button', {name: 'Crear cuenta'})[0]!);
        expect(state.open).toHaveBeenCalledWith('signup');
    });

    it('shows loading and error states and retries session checks', async () => {
        const loading = auth({status: 'loading'});
        const {rerender} = renderWithAuth(<AccountPanel/>, loading);
        expect(screen.getByText('Comprobando sesión…')).toBeTruthy();
        const failed = auth({status: 'error', refresh: vi.fn().mockRejectedValue(new Error('offline'))});
        rerender(<AuthContext.Provider value={failed}><AccountPanel/></AuthContext.Provider>);
        fireEvent.click(screen.getByRole('button', {name: 'Reintentar'}));
        await waitFor(() => expect(failed.refresh).toHaveBeenCalledOnce());
    });

    it('signs out, refreshes the identity and announces the session change', async () => {
        const state = auth({authenticated: true, user: {id: 'user', name: 'Ana', email: 'ana@example.com'}});
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({success: true})));
        renderWithAuth(<AccountPanel/>, state);
        fireEvent.click(screen.getByRole('button', {name: 'Cerrar sesión'}));
        await waitFor(() => expect(state.refresh).toHaveBeenCalledOnce());
        expect(screen.getByText('Ana')).toBeTruthy();
    });
});

describe('AuthDialog', () => {
    it('signs up, verifies the email and returns to sign-in when no session was created', async () => {
        const state = auth();
        const fetch = vi.fn()
            .mockResolvedValueOnce(Response.json({success: true, requiresVerification: true}))
            .mockResolvedValueOnce(Response.json({success: true}));
        vi.stubGlobal('fetch', fetch);
        renderWithAuth(<AuthDialog/>, state);
        fireEvent.click(screen.getByRole('button', {name: /Primera vez/}));
        fireEvent.change(screen.getByLabelText('Nombre'), {target: {value: 'Ana'}});
        fireEvent.change(screen.getByLabelText('Correo electrónico'), {target: {value: 'ana@example.com'}});
        fireEvent.change(screen.getByLabelText('Contraseña'), {target: {value: 'password123'}});
        fireEvent.click(screen.getByRole('button', {name: 'Crear cuenta'}));
        expect(await screen.findByText(/Introduce el código de 6 cifras/)).toBeTruthy();
        fireEvent.change(screen.getByLabelText('Código de verificación'), {target: {value: '123456'}});
        fireEvent.click(screen.getByRole('button', {name: 'Confirmar correo'}));
        expect(await screen.findByText('Correo confirmado. Ya puedes iniciar sesión.')).toBeTruthy();
        expect(state.refresh).toHaveBeenCalledOnce();
        expect(fetch).toHaveBeenNthCalledWith(1, '/api/auth/sign-up/email', expect.objectContaining({
            body: JSON.stringify({email: 'ana@example.com', password: 'password123', name: 'Ana'}),
        }));
        expect(fetch).toHaveBeenNthCalledWith(2, '/api/auth/email-otp/verify-email', expect.objectContaining({
            body: JSON.stringify({email: 'ana@example.com', otp: '123456'}),
        }));
    });

    it('maps server auth errors and completes a password reset', async () => {
        const state = auth();
        const fetch = vi.fn()
            .mockResolvedValueOnce(Response.json({error: {code: 'INVALID_EMAIL_OR_PASSWORD'}}, {status: 400}))
            .mockResolvedValueOnce(Response.json({success: true}))
            .mockResolvedValueOnce(Response.json({success: true}));
        vi.stubGlobal('fetch', fetch);
        renderWithAuth(<AuthDialog/>, state);
        fireEvent.change(screen.getByLabelText('Correo electrónico'), {target: {value: 'ana@example.com'}});
        fireEvent.change(screen.getByLabelText('Contraseña'), {target: {value: 'password123'}});
        fireEvent.click(screen.getByRole('button', {name: 'Iniciar sesión'}));
        expect(await screen.findByText(/El correo o la contraseña no son correctos/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', {name: 'He olvidado mi contraseña'}));
        fireEvent.change(screen.getByLabelText('Correo electrónico'), {target: {value: 'ana@example.com'}});
        fireEvent.click(screen.getByRole('button', {name: 'Enviar código'}));
        expect(await screen.findByLabelText('Código de verificación')).toBeTruthy();
        fireEvent.change(screen.getByLabelText('Código de verificación'), {target: {value: '654321'}});
        fireEvent.change(screen.getByLabelText('Nueva contraseña'), {target: {value: 'new-password'}});
        fireEvent.click(screen.getByRole('button', {name: 'Guardar contraseña'}));
        expect(await screen.findByText('Contraseña actualizada. Ya puedes iniciar sesión.')).toBeTruthy();
        expect(fetch).toHaveBeenNthCalledWith(3, '/api/auth/email-otp/reset-password', expect.objectContaining({
            body: JSON.stringify({email: 'ana@example.com', otp: '654321', password: 'new-password'}),
        }));
    });
});
