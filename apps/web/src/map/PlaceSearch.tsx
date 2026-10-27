import {useEffect, useRef, useState} from 'react';
import type {PlaceWithUserState} from '@relieve/shared';
import {Icon} from '../ui/Icon';
import {visiblePlaceTypes} from './placesGeoJson';
import * as styles from './MapView.css';

const typeLabels = {peak: 'Pico', lake: 'Ibón', hut: 'Refugio', pass: 'Collado', viewpoint: 'Mirador'};
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();

interface Props {
    places: PlaceWithUserState[];
    query: string;
    onQueryChange: (query: string) => void;
    status: 'loading' | 'error' | 'success';
    onSelect: (place: PlaceWithUserState) => void;
}

export function PlaceSearch({places, query, onQueryChange, status, onSelect}: Props) {
    const [open, setOpen] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const input = useRef<HTMLInputElement>(null);
    const results = places.filter((place) => visiblePlaceTypes.some((type) => type === place.type)
        && normalize(place.name).includes(normalize(query)));
    const activeIndex = results.findIndex((place) => place.id === activeId);
    const resultId = (id: string) => `place-search-result-${id}`;

    useEffect(() => {
        if (open && activeId) document.getElementById(resultId(activeId))?.scrollIntoView({block: 'nearest'});
    }, [activeId, open]);

    function select(place: PlaceWithUserState) {
        input.current?.focus();
        onQueryChange(place.name);
        setOpen(false);
        setActiveId(null);
        onSelect(place);
    }

    return <div className={styles.placePicker} onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
        <label className={styles.fieldLabel} htmlFor="place-search">Buscar un lugar</label>
        <div>
            <div className={styles.searchField}>
                <Icon name="search" className={styles.searchIcon} size={17}/>
                <input ref={input} id="place-search" className={styles.searchInput} type="text" inputMode="search" enterKeyHint="go"
                       role="combobox" autoComplete="off" placeholder="Aneto, ibón, refugio…"
                       aria-autocomplete="list" aria-expanded={open} aria-controls="place-search-results"
                       aria-activedescendant={open && activeIndex >= 0 && activeId ? resultId(activeId) : undefined}
                       aria-describedby="search-scope" value={query}
                       onFocus={() => setOpen(true)}
                       onChange={(event) => {
                           onQueryChange(event.target.value);
                           setActiveId(null);
                           setOpen(true);
                       }} onKeyDown={(event) => {
                    if (event.nativeEvent.isComposing) return;
                    if (event.key === 'Escape' && open) {
                        event.preventDefault();
                        event.stopPropagation();
                        setOpen(false);
                        setActiveId(null);
                    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                        event.preventDefault();
                        setOpen(true);
                        if (!results.length) return;
                        const next = event.key === 'ArrowDown'
                            ? (activeIndex + 1) % results.length
                            : activeIndex <= 0 ? results.length - 1 : activeIndex - 1;
                        setActiveId(results[next]?.id ?? null);
                    } else if (event.key === 'Enter' && open && results.length > 0) {
                        event.preventDefault();
                        const place = results[activeIndex >= 0 ? activeIndex : 0];
                        if (place) select(place);
                    }
                }}/>
                {query && <button className={styles.clearSearch} type="button" aria-label="Limpiar búsqueda"
                                  onMouseDown={(event) => event.preventDefault()} onClick={() => {
                    input.current?.focus();
                    onQueryChange('');
                    setActiveId(null);
                    setOpen(true);
                }}><Icon name="close" size={15}/></button>}
            </div>
            <div id="place-search-results" className={styles.searchResults} role="listbox"
                 aria-label="Resultados de lugares" hidden={!open}>
                {results.map((place) => <button key={place.id} id={resultId(place.id)}
                    className={styles.searchResult} type="button" role="option" tabIndex={-1}
                    aria-selected={place.id === activeId} onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(place)}>
                    <span className={`${styles.resultIcon} ${styles.typeColor[place.type]}`}><Icon name={place.type} size={19}/></span>
                    <span className={styles.resultText}>
                        <span className={styles.resultName}>{place.name}</span>
                        <span className={styles.resultMeta}>{typeLabels[place.type]} · {place.elevation === null
                            ? 'Sin altitud verificada' : `${place.elevation.toLocaleString('es-ES')} m`}</span>
                    </span>
                    {place.userState?.favorite && <Icon name="star" className={styles.favoriteSwatch} size={14}/>}
                </button>)}
            </div>
            {open && results.length === 0 && <p className={styles.searchEmpty}>
                {status === 'loading' ? 'Cargando lugares…' : status === 'error' ? 'No se han podido cargar los lugares.'
                    : 'Sin coincidencias. Prueba otro nombre o cambia los filtros.'}
            </p>}
        </div>
        <p id="search-scope" className={styles.muted} role="status" aria-live="polite">
            {status === 'success' ? `${results.length} ${results.length === 1 ? 'lugar' : 'lugares'} · filtros actuales`
                : status === 'loading' ? 'Cargando lugares…' : 'Búsqueda no disponible.'}
        </p>
    </div>;
}
