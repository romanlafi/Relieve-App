import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {PlaceWithUserState} from '@relieve/shared';
import {PlacePersonalForm} from '../../src/map/PlacePersonalForm';

const place: PlaceWithUserState = {
    id: '00000000-0000-4000-8000-000000000001', name: 'Aneto', slug: 'aneto', type: 'peak',
    elevation: 3404, latitude: 42.6, longitude: 0.6, description: null, regionId: null, userState: null,
};

describe('PlacePersonalForm', () => {
    it('saves a changed personal status, favorite and notes', async () => {
        const onSave = vi.fn().mockResolvedValue({status: 'pending', favorite: true, visitedAt: null, notes: 'Preparar ruta'});
        const {rerender} = render(<PlacePersonalForm place={place} saveState={null} onSave={onSave}/>);
        const save = screen.getByRole('button', {name: 'Guardar cambios'});
        expect(save.hasAttribute('disabled')).toBe(true);
        fireEvent.change(screen.getByLabelText('Estado personal'), {target: {value: 'pending'}});
        fireEvent.click(screen.getByLabelText(/Favorito/));
        fireEvent.change(screen.getByLabelText('Notas'), {target: {value: 'Preparar ruta'}});
        expect(screen.getByText('Cambios sin guardar.')).toBeTruthy();
        fireEvent.click(save);
        await waitFor(() => expect(onSave).toHaveBeenCalledWith(place.id, {
            status: 'pending', favorite: true, notes: 'Preparar ruta',
        }));
        rerender(<PlacePersonalForm place={{...place, userState: {
            status: 'pending', favorite: true, visitedAt: null, notes: 'Preparar ruta',
        }}} saveState={{placeId: place.id, status: 'saved'}} onSave={onSave}/>);
        expect(screen.getByText('Cambios guardados.')).toBeTruthy();
    });

    it('removes an existing record and leaves the draft intact after a failed save', async () => {
        const registered: PlaceWithUserState = {...place, userState: {
            status: 'visited', favorite: false, visitedAt: '2026-08-12', notes: 'Cima',
        }};
        const onSave = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce(null);
        const {rerender} = render(<PlacePersonalForm place={registered} saveState={null} onSave={onSave}/>);
        fireEvent.change(screen.getByLabelText('Notas'), {target: {value: 'Borrador'}});
        fireEvent.click(screen.getByRole('button', {name: 'Guardar cambios'}));
        await waitFor(() => expect(onSave).toHaveBeenCalledWith(place.id, {
            status: 'visited', favorite: false, notes: 'Borrador',
        }));
        expect(screen.getByDisplayValue('Borrador')).toBeTruthy();
        rerender(<PlacePersonalForm place={registered} saveState={{placeId: place.id, status: 'error'}} onSave={onSave}/>);
        expect(screen.getByText(/Tu borrador se conserva/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', {name: 'Quitar registro'}));
        await waitFor(() => expect(onSave).toHaveBeenLastCalledWith(place.id, null));
        expect((screen.getByLabelText('Estado personal') as HTMLSelectElement).value).toBe('');
    });
});
