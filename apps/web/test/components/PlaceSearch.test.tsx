import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {PlaceWithUserState} from '@relieve/shared';
import {PlaceSearch} from '../../src/map/PlaceSearch';

const place = (id: string, name: string, type: PlaceWithUserState['type'] = 'peak'): PlaceWithUserState => ({
    id, name, slug: id, type, elevation: 3404, latitude: 42.6, longitude: 0.6,
    description: null, regionId: null, userState: null,
});

describe('PlaceSearch', () => {
    it('matches without accents, hides non-map types and reports the result count', () => {
        render(<PlaceSearch places={[place('a', 'Ibón de Plan', 'lake'), place('b', 'Collado', 'pass')]}
            query="ibon" onQueryChange={vi.fn()} status="success" onSelect={vi.fn()}/>);
        fireEvent.focus(screen.getByRole('combobox'));
        expect(screen.getByRole('option', {name: /Ibón de Plan/})).toBeTruthy();
        expect(screen.queryByRole('option', {name: /Collado/})).toBeNull();
        expect(screen.getByRole('status').textContent).toContain('1 lugar');
    });

    it('supports keyboard selection and closes the results list', async () => {
        const first = place('first', 'Aneto');
        const second = place('second', 'Posets');
        const onQueryChange = vi.fn();
        const onSelect = vi.fn();
        render(<PlaceSearch places={[first, second]} query="" onQueryChange={onQueryChange} status="success" onSelect={onSelect}/>);
        const input = screen.getByRole('combobox');
        fireEvent.focus(input);
        fireEvent.keyDown(input, {key: 'ArrowDown'});
        expect(input.getAttribute('aria-activedescendant')).toBe('place-search-result-first');
        fireEvent.keyDown(input, {key: 'ArrowDown'});
        fireEvent.keyDown(input, {key: 'Enter'});
        expect(onQueryChange).toHaveBeenCalledWith('Posets');
        expect(onSelect).toHaveBeenCalledWith(second);
        await waitFor(() => expect(document.querySelector('[role="listbox"]')?.hasAttribute('hidden')).toBe(true));
    });

    it('closes on Escape and allows clearing the query without losing focus', () => {
        const onQueryChange = vi.fn();
        render(<PlaceSearch places={[place('a', 'Aneto')]} query="Ane" onQueryChange={onQueryChange} status="success" onSelect={vi.fn()}/>);
        const input = screen.getByRole('combobox');
        fireEvent.focus(input);
        fireEvent.keyDown(input, {key: 'Escape'});
        expect(document.querySelector('[role="listbox"]')?.hasAttribute('hidden')).toBe(true);
        fireEvent.click(screen.getByRole('button', {name: 'Limpiar búsqueda'}));
        expect(onQueryChange).toHaveBeenCalledWith('');
        expect(document.activeElement).toBe(input);
    });
});
