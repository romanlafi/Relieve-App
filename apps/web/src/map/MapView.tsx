import {RoutesPanel} from '../routes/RoutesPanel';
import {useRoutes} from '../routes/useRoutes';
import {tabs} from '../routes/RoutesPanel.css';
import {useEffect, useMemo, useRef, useState} from 'react';
import type {PlaceFilters, PlaceWithUserState} from '@relieve/shared';
import 'maplibre-gl/dist/maplibre-gl.css';
import {placesToGeoJson, visiblePlaceTypes} from './placesGeoJson';
import {usePlaces} from './usePlaces';
import {usePlacesMap} from './usePlacesMap';
import {PlacePersonalForm} from './PlacePersonalForm';
import {MapFilters} from './MapFilters';
import {useRegions} from './useRegions';
import {StatsSummary} from './StatsSummary';
import * as styles from './MapView.css';

const emptyPlaces: PlaceWithUserState[] = [];
const placeTypeLabels = {peak: 'Pico', lake: 'Ibón', hut: 'Refugio', pass: 'Collado', viewpoint: 'Mirador'};
const elevationFormat = new Intl.NumberFormat('es-ES');

export function MapView() {
    const [controlsHidden, setControlsHidden] = useState(false);
    const [section, setSection] = useState<'places' | 'routes'>('places');
    const container = useRef<HTMLDivElement>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const regionState = useRegions();
    const [filters, setFilters] = useState<PlaceFilters>({region: 'pirineo-aragones'});
    const {state, retry, personalSave, saveUserPlace, mutationVersion, visitsChanged} = usePlaces(filters);
    const routes = useRoutes(visitsChanged);
    const places = state.status === 'success' ? state.places : emptyPlaces;
    const geoJson = useMemo(() => placesToGeoJson(places), [places]);
    const frameRegion = state.status === 'success' ? new URLSearchParams(state.query).get('region') ?? '' : null;
    const {
        status,
        terrainUnavailable,
        focusPlace
    } = usePlacesMap(container, geoJson, selectedId, setSelectedId, frameRegion, routes.detail);
    const selectedPlace = places.find((place) => place.id === selectedId);
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
    const searchResults = places.filter((place) => visiblePlaceTypes.some((type) => type === place.type)
        && normalize(place.name).includes(normalize(search)));
    const selectedRegion = regionState.regions.find((region) => region.id === selectedPlace?.regionId);
    const selectedPlaceId = selectedPlace?.id;
    useEffect(() => {
        if (selectedPlaceId && window.matchMedia('(max-width: 640px)').matches) {
            document.querySelector<HTMLButtonElement>('aside[data-place-id] button')?.focus();
        }
    }, [selectedPlaceId]);

    function closePlace() {
        setSelectedId(null);
        requestAnimationFrame(() => document.getElementById('place-picker')?.focus());
    }

    return (
        <section className={styles.view} aria-label="Explorar los Pirineos" data-selected={Boolean(selectedPlace)}
                 onKeyDown={(event) => {
                     if (event.key === 'Escape' && selectedPlace) {
                         closePlace();
                     }
                 }}>
            <div ref={container} className={styles.map} aria-label="Mapa de lugares de montaña"/>
            {controlsHidden && <button className={styles.showControls} type="button" onClick={() => setControlsHidden(false)}>Mostrar controles</button>}
            <div className={styles.toolbar} hidden={controlsHidden}>
            <header className={styles.brand}>
                <h1 className={styles.title}>Relieve</h1>
                <p className={styles.subtitle}>Pirineos · explora el terreno</p>
            </header>
            <div className={styles.status} role="status" aria-live="polite">
                {status === 'loading' && <p>Cargando mapa…</p>}
                {status === 'error' &&
                    <p>No se ha podido cargar el mapa. Comprueba la conexión y recarga la página.</p>}
                {state.status === 'loading' && <p>Cargando lugares…</p>}
                {state.status === 'error' && <>
                    <p>{state.message}</p>
                    <button className={styles.button} type="button" onClick={retry}>Reintentar</button>
                </>}
                {state.status === 'success' && <p>{geoJson.features.length === 0
                    ? 'No hay lugares que cumplan estos filtros.'
                    : `${geoJson.features.length} ${geoJson.features.length === 1 ? 'lugar' : 'lugares'} · selecciona un punto`}</p>}
                {terrainUnavailable && <p>Relieve 3D no disponible. Puedes seguir explorando el mapa.</p>}
                {personalSave?.status === 'saved' && personalSave.placeId === selectedId
                    && state.status === 'success' && !selectedPlace &&
                    <p>Registro guardado. El lugar ya no cumple los filtros actuales.</p>}
            </div>
                {section === 'routes' && <button className={styles.button} type="button" onClick={() => setControlsHidden(true)}>Ver mapa · ocultar controles</button>}
                <div className={tabs} aria-label="Secciones">
                    <button className={styles.button} type="button" aria-pressed={section === 'places'} onClick={() => setSection('places')}>Lugares</button>
                    <button className={styles.button} type="button" aria-pressed={section === 'routes'} onClick={() => { setSection('routes'); setSelectedId(null); }}>Rutas</button>
                </div>
                {section === 'routes' && <RoutesPanel key={routes.selectedId ?? 'import'} state={routes}/>}
                {section === 'places' && <>
                <div className={styles.placePicker}>
                    <label htmlFor="place-search">Buscar un lugar</label>
                    <input id="place-search" className={styles.select} type="search" placeholder="Aneto, ibón, refugio…"
                           value={search} onChange={(event) => setSearch(event.target.value)}
                           aria-describedby="search-scope"/>
                    <p id="search-scope" className={styles.muted}>Busca entre los resultados de los filtros
                        actuales.</p>
                    <label
                        htmlFor="place-picker">{searchResults.length} {searchResults.length === 1 ? 'lugar disponible' : 'lugares disponibles'}</label>
                    <select id="place-picker" className={styles.select}
                            value={searchResults.some((place) => place.id === selectedId) ? selectedId ?? '' : ''}
                            onChange={(event) => {
                                const id = event.target.value;
                                setSelectedId(id || null);
                                const place = places.find((item) => item.id === id);
                                if (place) focusPlace(place.longitude, place.latitude);
                            }}>
                        <option value="">Selecciona un lugar</option>
                        {searchResults.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
                    </select>
                    {state.status === 'success' && searchResults.length === 0 &&
                        <p className={styles.muted} role="status">Sin coincidencias. Prueba otro nombre o cambia los
                            filtros.</p>}
                </div>
                <MapFilters regionState={regionState} filters={filters} disabled={personalSave?.status === 'saving'}
                            onChange={(next) => {
                setSelectedId(null);
                                setSearch('');
                setFilters(next);
            }}/>
                </>}
                <StatsSummary version={mutationVersion}/>
            </div>
            <div className={styles.legend} aria-label="Leyenda del mapa">
                {routes.detail && <span className={styles.legendItem}><span className={styles.routeSwatch} aria-hidden="true"/>Ruta GPX</span>}
                {visiblePlaceTypes.map((type) => <span className={styles.legendItem} key={type}>
                    <span className={styles.swatch[type]} aria-hidden="true"/>{placeTypeLabels[type]}
                </span>)}
                <span className={styles.legendItem}><span className={styles.pendingSwatch} aria-hidden="true"/>Pendiente: hueco</span>
                <span className={styles.legendItem}><span className={styles.visitedSwatch} aria-hidden="true"/>Visitado: borde claro</span>
            </div>
            {selectedPlace && <aside className={styles.details} aria-label="Lugar seleccionado"
                                     data-place-id={selectedPlace.id}>
                <button className={styles.close} type="button" aria-label="Cerrar lugar seleccionado"
                        onClick={closePlace}>×
                </button>
                <p className={styles.type}>{placeTypeLabels[selectedPlace.type]}</p>
                <h2 className={styles.placeName}>{selectedPlace.name}</h2>
                <p className={styles.elevation}>{selectedPlace.elevation === null
                    ? 'Altitud no verificada' : `${elevationFormat.format(selectedPlace.elevation)} m`}</p>
                <dl className={styles.metadata}>
                    <dt>Región</dt>
                    <dd>{selectedRegion?.name ?? (selectedPlace.regionId
                        ? regionState.status === 'error' ? 'No disponible' : 'Cargando región…' : 'Sin región asignada')}</dd>
                    <dt>Coordenadas</dt>
                    <dd>{selectedPlace.latitude.toFixed(5)}, {selectedPlace.longitude.toFixed(5)}</dd>
                </dl>
                <PlacePersonalForm key={selectedPlace.id} place={selectedPlace} saveState={personalSave}
                                   onSave={saveUserPlace}/>
            </aside>}
        </section>
    );
}
