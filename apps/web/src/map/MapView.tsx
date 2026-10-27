import {RoutesPanel} from '../routes/RoutesPanel';
import {useRoutes} from '../routes/useRoutes';
import {tabs, tab} from '../routes/RoutesPanel.css';
import {Icon} from '../ui/Icon';
import {useEffect, useMemo, useRef, useState} from 'react';
import type {PlaceFilters, PlaceWithUserState} from '@relieve/shared';
import 'maplibre-gl/dist/maplibre-gl.css';
import {placesToGeoJson, visiblePlaceTypes} from './placesGeoJson';
import {usePlaces} from './usePlaces';
import {usePlacesMap} from './usePlacesMap';
import {PlacePersonalForm} from './PlacePersonalForm';
import {PlaceVisitHistory} from './PlaceVisitHistory';
import {PlaceCatalogForm} from './PlaceCatalogForm';
import {MapFilters} from './MapFilters';
import {PlaceSearch} from './PlaceSearch';
import {useRegions} from './useRegions';
import {useCatalogAccess} from './useCatalogAccess';
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
    const {canEditCatalog, publicReadOnly} = useCatalogAccess();
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
    const selectedRegion = regionState.regions.find((region) => region.id === selectedPlace?.regionId);
    const selectedPlaceId = selectedPlace?.id;
    useEffect(() => {
        if (selectedPlaceId && window.matchMedia('(max-width: 900px)').matches) {
            document.querySelector<HTMLButtonElement>('aside[data-place-id] button')?.focus();
        }
    }, [selectedPlaceId]);

    function closePlace() {
        setSelectedId(null);
        requestAnimationFrame(() => document.getElementById(controlsHidden ? 'map-show-controls' : 'place-search')?.focus());
    }

    return (
        <section className={styles.view} aria-label="Explorar los Pirineos" data-selected={Boolean(selectedPlace)}
                 onKeyDown={(event) => {
                     if (event.key === 'Escape' && selectedPlace) {
                         closePlace();
                     }
                 }}>
            <div ref={container} className={styles.map} aria-label="Mapa de lugares de montaña"/>
            {controlsHidden && !selectedPlace && <button id="map-show-controls" className={styles.showControls} type="button" onClick={() => {
                setControlsHidden(false);
                requestAnimationFrame(() => document.getElementById('map-hide-controls')?.focus());
            }}><Icon name="layers"/>Mostrar controles</button>}
            <div className={styles.controlRail}>
            <div className={styles.toolbar} hidden={controlsHidden}>
            <header className={styles.brand}>
                <span className={styles.brandMark}><Icon name="peak" size={28}/></span>
                <div><h1 className={styles.title}>Relieve</h1>
                <p className={styles.subtitle}>Tu atlas de los Pirineos</p></div>
                <button id="map-hide-controls" className={styles.iconButton} type="button" aria-label="Ocultar controles" title="Ver solo el mapa"
                        onClick={() => {
                            setControlsHidden(true);
                            requestAnimationFrame(() => document.getElementById('map-show-controls')?.focus());
                        }}><Icon name="close" size={16}/></button>
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
                <div className={tabs} aria-label="Secciones">
                    <button className={tab} type="button" aria-pressed={section === 'places'} onClick={() => setSection('places')}><Icon name="pin" size={16}/>Lugares</button>
                    {!publicReadOnly && <button className={tab} type="button" aria-pressed={section === 'routes'} onClick={() => { setSection('routes'); setSelectedId(null); }}><Icon name="route" size={16}/>Mis rutas</button>}
                </div>
                {section === 'routes' && <RoutesPanel key={routes.selectedId ?? 'import'} state={routes}/>}
                {section === 'places' && <>
                <PlaceSearch places={places} query={search} onQueryChange={setSearch} status={state.status}
                             onSelect={(place) => {
                                 setSelectedId(place.id);
                                 focusPlace(place.longitude, place.latitude);
                             }}/>
                <MapFilters regionState={regionState} filters={filters} publicReadOnly={publicReadOnly} disabled={personalSave?.status === 'saving'}
                            onChange={(next) => {
                setSelectedId(null);
                                setSearch('');
                setFilters(next);
            }}/>
                </>}
                {!publicReadOnly && <StatsSummary version={mutationVersion}/>}
            </div>
            <details className={styles.legend}>
                <summary className={styles.summary}><Icon name="layers" size={16}/>Leyenda del mapa</summary>
                <div className={styles.legendContent}>
                {routes.detail && <span className={styles.legendItem}><span className={styles.routeSwatch} aria-hidden="true"/>Ruta GPX</span>}
                {visiblePlaceTypes.map((type) => <span className={styles.legendItem} key={type}>
                    <Icon name={type} className={styles.typeColor[type]}/>{placeTypeLabels[type]}
                </span>)}
                {!publicReadOnly && <>
                    <span className={styles.legendItem}><span className={styles.pendingSwatch} aria-hidden="true"/>Pendiente: hueco</span>
                    <span className={styles.legendItem}><span className={styles.visitedSwatch} aria-hidden="true"/>Visitado: borde claro</span>
                    <span className={styles.legendItem}><Icon name="star" className={styles.favoriteSwatch} size={18}/>Favorito</span>
                </>}
                </div>
            </details>
            </div>
            {selectedPlace && <aside key={selectedPlace.id} className={styles.details} aria-label="Lugar seleccionado"
                                     data-place-id={selectedPlace.id}>
                <header className={styles.detailsHeader}>
                    <span className={styles.sheetGrabber} aria-hidden="true"/>
                    <div className={styles.detailsHeading}>
                        <p className={`${styles.type} ${styles.typeColor[selectedPlace.type]}`}><Icon name={selectedPlace.type} size={17}/>{placeTypeLabels[selectedPlace.type]}</p>
                        <h2 className={styles.placeName}>{selectedPlace.name}</h2>
                        <p className={styles.elevation}>{selectedPlace.elevation === null
                            ? 'Altitud no verificada' : `${elevationFormat.format(selectedPlace.elevation)} m`}</p>
                    </div>
                    <button className={styles.close} type="button" aria-label="Cerrar lugar seleccionado"
                            onClick={closePlace}><Icon name="close"/>
                    </button>
                </header>
                <div className={styles.detailsContent}>
                <dl className={styles.metadata}>
                    <dt>Región</dt>
                    <dd>{selectedRegion?.name ?? (selectedPlace.regionId
                        ? regionState.status === 'error' ? 'No disponible' : 'Cargando región…' : 'Sin región asignada')}</dd>
                    <dt>Coordenadas</dt>
                    <dd>{selectedPlace.latitude.toFixed(5)}, {selectedPlace.longitude.toFixed(5)}</dd>
                </dl>
                {selectedPlace.description && <p className={styles.muted}>{selectedPlace.description}</p>}
                {!publicReadOnly && <>
                    <PlacePersonalForm key={`personal-${selectedPlace.id}-${selectedPlace.userState?.status ?? ''}`}
                                       place={selectedPlace} saveState={personalSave}
                                       onSave={saveUserPlace}/>
                    <PlaceVisitHistory key={`visits-${selectedPlace.id}`} placeId={selectedPlace.id} onChanged={visitsChanged}/>
                </>}
                {canEditCatalog && <PlaceCatalogForm key={`catalog-${selectedPlace.id}`} place={selectedPlace}
                                                     regions={regionState.regions} onSaved={visitsChanged}/>}
                </div>
            </aside>}
        </section>
    );
}
