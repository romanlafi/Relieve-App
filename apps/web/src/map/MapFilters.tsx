import {useState} from 'react';
import type {PlaceFilters, PlaceType} from '@relieve/shared';
import type {useRegions} from './useRegions';
import type {PersonalFilter} from './placeFilters';
import * as styles from './MapFilters.css';
import {Icon} from '../ui/Icon';

interface Props {
    filters: PlaceFilters;
    disabled: boolean;
    onChange: (filters: PlaceFilters) => void;
    regionState: ReturnType<typeof useRegions>;
}

export function MapFilters({filters, disabled, onChange, regionState}: Props) {
    const [minimumInput, setMinimumInput] = useState(String(filters.elevationMin ?? ''));
    const [maximumInput, setMaximumInput] = useState(String(filters.elevationMax ?? ''));
    const {regions, status, retry} = regionState;
    const personal: PersonalFilter = filters.favorite === true ? 'favorite' : filters.status ?? 'all';
    const activeCount = Object.values(filters).filter((value) => value !== undefined).length;
    const children = new Map<string | null, typeof regions>();
    for (const region of regions) children.set(region.parentId, [...(children.get(region.parentId) ?? []), region]);
    const options: { region: typeof regions[number]; depth: number }[] = [];
    const seen = new Set<string>();

    function visit(parentId: string | null, depth: number) {
        for (const region of children.get(parentId) ?? []) {
            if (seen.has(region.id)) continue;
            seen.add(region.id);
            options.push({region, depth});
            visit(region.id, depth + 1);
        }
    }

    visit(null, 0);
    const massifs = regions.filter((region) => region.type === 'massif');
    const minimum = minimumInput === '' ? undefined : Number(minimumInput);
    const maximum = maximumInput === '' ? undefined : Number(maximumInput);
    const validElevationRange = [minimum, maximum].every((value) => value === undefined
        || (Number.isInteger(value) && value >= -500 && value <= 9000))
        && (minimum === undefined || maximum === undefined || minimum <= maximum);

    return <details className={styles.panel}>
        <summary className={styles.summary}><Icon name="filters" size={17}/>Filtros del mapa
            {activeCount > 0 && <span className={styles.badge}>{activeCount} {activeCount === 1 ? 'activo' : 'activos'}</span>}</summary>
        <div className={styles.fields}>
            <label className={styles.label}>Tipo
                <select id="map-filter-type" className={styles.select} disabled={disabled} value={filters.type ?? ''}
                        onChange={(event) => onChange({
                            ...filters,
                            type: event.target.value as PlaceType || undefined
                        })}>
                    <option value="">Todos</option>
                    <option value="peak">Picos</option>
                    <option value="lake">Ibones</option>
                    <option value="hut">Refugios</option>
                </select>
            </label>
            <label className={styles.label}>Estado
                <select id="map-filter-state" className={styles.select} disabled={disabled} value={personal} onChange={(event) => {
                    const value = event.target.value as PersonalFilter;
                    onChange({
                        ...filters, status: value === 'all' || value === 'favorite' ? undefined : value,
                        favorite: value === 'favorite' ? true : undefined
                    });
                }}>
                    <option value="all">Todos</option>
                    <option value="visited">Visitados</option>
                    <option value="pending">Pendientes</option>
                    <option value="favorite">Favoritos</option>
                    <option value="unregistered">Sin registrar</option>
                </select>
            </label>
            <label className={styles.label}>Región
                <select id="map-filter-region" className={styles.select} disabled={disabled || status !== 'ready'} value={filters.region ?? ''}
                        onChange={(event) => onChange({...filters, region: event.target.value || undefined})}>
                    <option value="">Todas las regiones</option>
                    {options.map(({region, depth}) => <option key={region.id} value={region.slug}>
                        {`${'— '.repeat(depth)}${region.type === 'sector' && children.has(region.id) ? 'Todo ' : ''}${region.name}`}
                    </option>)}
                </select>
            </label>
            <label className={styles.label}>Macizo
                <select id="map-filter-massif" className={styles.select} disabled={disabled || status !== 'ready'}
                        value={filters.massif ?? ''}
                        onChange={(event) => onChange({...filters, massif: event.target.value || undefined})}>
                    <option value="">Todos los macizos</option>
                    {massifs.map((region) => <option key={region.id} value={region.slug}>{region.name}</option>)}
                </select>
            </label>
            <details>
                <summary>Altitud</summary>
                <form className={styles.fields} onSubmit={(event) => {
                    event.preventDefault();
                    if (validElevationRange) onChange({...filters, elevationMin: minimum, elevationMax: maximum});
                }}>
                    <label className={styles.label}>Mínima (m)
                        <input className={styles.numberInput} type="number" min={-500} max={9000} step={1}
                               value={minimumInput} disabled={disabled}
                               onChange={(event) => setMinimumInput(event.target.value)}/>
                    </label>
                    <label className={styles.label}>Máxima (m)
                        <input className={styles.numberInput} type="number" min={-500} max={9000} step={1}
                               value={maximumInput} disabled={disabled}
                               onChange={(event) => setMaximumInput(event.target.value)}/>
                    </label>
                    {!validElevationRange && <p className={styles.message} role="alert">
                        Revisa el rango: usa cotas entre -500 y 9000 m y la mínima no puede superar la máxima.
                    </p>}
                    <p className={styles.message}>Los lugares sin altitud conocida no aparecen al filtrar.</p>
                    <button className={styles.button} type="submit" disabled={disabled || !validElevationRange}>
                        Aplicar altitud
                    </button>
                    <button className={styles.button} type="button"
                            disabled={disabled || (filters.elevationMin === undefined && filters.elevationMax === undefined
                                && !minimumInput && !maximumInput)}
                            onClick={() => {
                                setMinimumInput('');
                                setMaximumInput('');
                                onChange({...filters, elevationMin: undefined, elevationMax: undefined});
                            }}>Quitar altitud</button>
                </form>
            </details>
            {status === 'loading' && <p className={styles.message} role="status">Cargando regiones…</p>}
            {status === 'error' && <p className={styles.message} role="alert">No se han podido cargar las regiones.
                <button type="button" className={styles.select} onClick={retry}>Reintentar regiones</button>
            </p>}
        </div>
    </details>;
}
