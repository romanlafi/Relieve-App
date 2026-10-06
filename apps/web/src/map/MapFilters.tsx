import type {PlaceFilters, PlaceType} from '@relieve/shared';
import type {useRegions} from './useRegions';
import type {PersonalFilter} from './placeFilters';
import * as styles from './MapFilters.css';

interface Props {
    filters: PlaceFilters;
    disabled: boolean;
    onChange: (filters: PlaceFilters) => void;
    regionState: ReturnType<typeof useRegions>;
}

export function MapFilters({filters, disabled, onChange, regionState}: Props) {
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

    return <details className={styles.panel}>
        <summary className={styles.summary}>Filtros del
            mapa{activeCount > 0 ? ` · ${activeCount} ${activeCount === 1 ? 'activo' : 'activos'}` : ''}</summary>
        <div className={styles.fields}>
            <label className={styles.label}>Tipo
                <select className={styles.select} disabled={disabled} value={filters.type ?? ''}
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
                <select className={styles.select} disabled={disabled} value={personal} onChange={(event) => {
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
                <select className={styles.select} disabled={disabled || status !== 'ready'} value={filters.region ?? ''}
                        onChange={(event) => onChange({...filters, region: event.target.value || undefined})}>
                    <option value="">Todas las regiones</option>
                    {options.map(({region, depth}) => <option key={region.id} value={region.slug}>
                        {`${'— '.repeat(depth)}${region.type === 'sector' && children.has(region.id) ? 'Todo ' : ''}${region.name}`}
                    </option>)}
                </select>
            </label>
            {status === 'loading' && <p className={styles.message} role="status">Cargando regiones…</p>}
            {status === 'error' && <p className={styles.message} role="alert">No se han podido cargar las regiones.
                <button type="button" className={styles.select} onClick={retry}>Reintentar regiones</button>
            </p>}
        </div>
    </details>;
}
