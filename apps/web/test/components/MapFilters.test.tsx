import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {Region} from '@relieve/shared';
import {MapFilters} from '../../src/map/MapFilters';

const regions: Region[] = [
    {id: '00000000-0000-4000-8000-000000000001', name: 'Pirineos', slug: 'pirineos', type: 'mountain_system', parentId: null},
    {id: '00000000-0000-4000-8000-000000000002', name: 'Sector central', slug: 'central', type: 'sector', parentId: '00000000-0000-4000-8000-000000000001'},
    {id: '00000000-0000-4000-8000-000000000003', name: 'Posets', slug: 'posets', type: 'massif', parentId: '00000000-0000-4000-8000-000000000002'},
    {id: '00000000-0000-4000-8000-000000000004', name: 'Benasque', slug: 'benasque', type: 'valley', parentId: '00000000-0000-4000-8000-000000000002'},
];

describe('MapFilters', () => {
    it('shows hierarchical region options, active count and updates selected filters', () => {
        const onChange = vi.fn();
        render(<MapFilters filters={{type: 'peak', region: 'posets'}} disabled={false} onChange={onChange}
            regionState={{regions, status: 'ready', retry: vi.fn()}}/>);
        fireEvent.click(screen.getByText('Filtros del mapa'));
        expect(screen.getByText('2 activos')).toBeTruthy();
        const region = screen.getByLabelText('Región') as HTMLSelectElement;
        expect([...region.options].map((option) => option.textContent)).toEqual([
            'Todas las regiones', 'Pirineos', '— Todo Sector central', '— — Posets', '— — Benasque',
        ]);
        fireEvent.change(screen.getByLabelText('Tipo'), {target: {value: 'hut'}});
        expect(onChange).toHaveBeenCalledWith({type: 'hut', region: 'posets'});
    });

    it('blocks inverted altitude ranges, applies valid bounds and clears them', () => {
        const onChange = vi.fn();
        render(<MapFilters filters={{elevationMin: 1000}} disabled={false} onChange={onChange}
            regionState={{regions: [], status: 'ready', retry: vi.fn()}}/>);
        fireEvent.click(screen.getByText('Filtros del mapa'));
        fireEvent.click(screen.getByText('Altitud'));
        const minimum = screen.getByLabelText('Mínima (m)');
        const maximum = screen.getByLabelText('Máxima (m)');
        fireEvent.change(minimum, {target: {value: '5000'}});
        fireEvent.change(maximum, {target: {value: '3000'}});
        expect(screen.getByRole('alert').textContent).toContain('mínima no puede superar');
        expect(screen.getByRole('button', {name: 'Aplicar altitud'}).hasAttribute('disabled')).toBe(true);

        fireEvent.change(maximum, {target: {value: '6000'}});
        fireEvent.click(screen.getByRole('button', {name: 'Aplicar altitud'}));
        expect(onChange).toHaveBeenCalledWith({elevationMin: 5000, elevationMax: 6000});
        fireEvent.click(screen.getByRole('button', {name: 'Quitar altitud'}));
        expect(onChange).toHaveBeenLastCalledWith({elevationMin: undefined, elevationMax: undefined});
    });

    it('hides personal state in read-only mode and allows retrying region failures', () => {
        const retry = vi.fn();
        render(<MapFilters filters={{}} disabled={false} onChange={vi.fn()} publicReadOnly
            regionState={{regions: [], status: 'error', retry}}/>);
        fireEvent.click(screen.getByText('Filtros del mapa'));
        expect(screen.queryByLabelText('Estado')).toBeNull();
        fireEvent.click(screen.getByRole('button', {name: 'Reintentar regiones'}));
        expect(retry).toHaveBeenCalledOnce();
    });
});
