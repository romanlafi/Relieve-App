import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {PlaceWithUserState, Region} from '@relieve/shared';
import {PlaceCatalogForm} from '../../src/map/PlaceCatalogForm';

const place: PlaceWithUserState = {
    id: '00000000-0000-4000-8000-000000000001', name: 'Aneto', slug: 'aneto', type: 'peak',
    elevation: 3404, latitude: 42.6, longitude: 0.6, description: null, regionId: null, userState: null,
};
const regions: Region[] = [{id: '00000000-0000-4000-8000-000000000002', name: 'Benasque', slug: 'benasque',
    type: 'valley', parentId: null}];

describe('PlaceCatalogForm', () => {
    it('sends normalized catalog edits and notifies the parent on success', async () => {
        const fetch = vi.fn().mockResolvedValue(new Response('{}', {status: 200}));
        vi.stubGlobal('fetch', fetch);
        const onSaved = vi.fn();
        render(<PlaceCatalogForm place={place} regions={regions} onSaved={onSaved}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Editar datos del lugar'}));
        fireEvent.change(screen.getByLabelText('Nombre'), {target: {value: 'Pico Aneto'}});
        fireEvent.change(screen.getByLabelText('Altitud (m)'), {target: {value: ''}});
        fireEvent.change(screen.getByLabelText('Región'), {target: {value: regions[0]!.id}});
        fireEvent.change(screen.getByLabelText('Descripción'), {target: {value: '  Cima principal  '}});
        fireEvent.click(screen.getByRole('button', {name: 'Guardar catálogo'}));
        await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
        expect(fetch).toHaveBeenCalledWith('/api/places/' + place.id, expect.objectContaining({
            method: 'PUT', credentials: 'same-origin',
            body: JSON.stringify({name: 'Pico Aneto', type: 'peak', elevation: null, latitude: 42.6,
                longitude: 0.6, regionId: regions[0]!.id, description: 'Cima principal'}),
        }));
        expect(screen.getByRole('button', {name: 'Editar datos del lugar'})).toBeTruthy();
    });

    it('keeps the editor open and reports server errors', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', {status: 500})));
        render(<PlaceCatalogForm place={place} regions={[]} onSaved={vi.fn()}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Editar datos del lugar'}));
        fireEvent.click(screen.getByRole('button', {name: 'Guardar catálogo'}));
        expect((await screen.findByRole('alert')).textContent).toContain('No se han podido guardar los datos del catálogo.');
        expect(screen.getByRole('button', {name: 'Guardar catálogo'})).toBeTruthy();
    });
});
