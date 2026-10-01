import {useMemo, useRef, useState} from 'react';
import type {PlaceFilters, PlaceWithUserState} from '@relieve/shared';
import 'maplibre-gl/dist/maplibre-gl.css';
import {placesToGeoJson, visiblePlaceTypes} from './placesGeoJson';
import {usePlaces} from './usePlaces';
import {usePlacesMap} from './usePlacesMap';
import {PlacePersonalForm} from './PlacePersonalForm';
import {MapFilters} from './MapFilters';
import * as styles from './MapView.css';

const emptyPlaces: PlaceWithUserState[] = [];
const placeTypeLabels = {peak: 'Pico', lake: 'Ibón', hut: 'Refugio', pass: 'Collado', viewpoint: 'Mirador'};
const elevationFormat = new Intl.NumberFormat('es-ES');

export function MapView() {
    const container = useRef<HTMLDivElement>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [filters, setFilters] = useState<PlaceFilters>({region: 'pirineo-aragones'});
    const {state, retry, personalSave, saveUserPlace} = usePlaces(filters);
    const places = state.status === 'success' ? state.places : emptyPlaces;
    const geoJson = useMemo(() => placesToGeoJson(places), [places]);
    const frameRegion = state.status === 'success' ? new URLSearchParams(state.query).get('region') ?? '' : null;
    const {status, terrainUnavailable} = usePlacesMap(container, geoJson, selectedId, setSelectedId, frameRegion);
    const selectedPlace = places.find((place) => place.id === selectedId);

    return (
        <section className={styles.view} aria-label="Explorar los Pirineos">
            <div ref={container} className={styles.map} aria-label="Mapa de lugares de montaña"/>
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
            <MapFilters filters={filters} disabled={personalSave?.status === 'saving'} onChange={(next) => {
                setSelectedId(null);
                setFilters(next);
            }}/>
            <div className={styles.legend} aria-label="Leyenda del mapa">
                {visiblePlaceTypes.map((type) => <span className={styles.legendItem} key={type}>
                    <span className={styles.swatch[type]} aria-hidden="true"/>{placeTypeLabels[type]}
                </span>)}
                <span className={styles.legendItem}><span className={styles.pendingSwatch} aria-hidden="true"/>Pendiente: hueco</span>
                <span className={styles.legendItem}><span className={styles.visitedSwatch} aria-hidden="true"/>Visitado: borde claro</span>
            </div>
            {places.length > 0 && <div className={styles.placePicker}>
                <label htmlFor="place-picker">Explorar lugares</label>
                <select id="place-picker" className={styles.select} value={selectedId ?? ''}
                        onChange={(event) => setSelectedId(event.target.value || null)}>
                    <option value="">Selecciona un lugar</option>
                    {places.filter((place) => visiblePlaceTypes.some((type) => type === place.type)).map((place) =>
                        <option key={place.id} value={place.id}>{place.name}</option>)}
                </select>
            </div>}
            {selectedPlace && <aside className={styles.details} aria-label="Lugar seleccionado"
                                     data-place-id={selectedPlace.id}>
                <button className={styles.close} type="button" aria-label="Cerrar lugar seleccionado"
                        onClick={() => setSelectedId(null)}>×
                </button>
                <p className={styles.type}>{placeTypeLabels[selectedPlace.type]}</p>
                <h2 className={styles.placeName}>{selectedPlace.name}</h2>
                <p className={styles.elevation}>{selectedPlace.elevation === null
                    ? 'Altitud no verificada' : `${elevationFormat.format(selectedPlace.elevation)} m`}</p>
                <PlacePersonalForm key={selectedPlace.id} place={selectedPlace} saveState={personalSave}
                                   onSave={saveUserPlace}/>
            </aside>}
        </section>
    );
}
