import {useEffect, useRef, useState} from 'react';
import type {ErrorEvent, GeoJSONSource, MapLayerMouseEvent} from 'maplibre-gl';
import {LngLatBounds, Map, NavigationControl, setWorkerUrl} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type {PlacesGeoJson} from './placesGeoJson';
import {
    configureBasemapImages,
    hillshadeLayer,
    hillshadeLayerId,
    hillshadeSourceId,
    mapConfig,
    terrainSource,
    terrainSourceId,
} from './mapConfig';
import {placesLayer, placesLayerId, placesSourceId} from './layers/placesLayer';

setWorkerUrl(workerUrl);

function framePlaces(map: Map, data: PlacesGeoJson) {
    const bounds = new LngLatBounds();
    for (const feature of data.features) {
        const [longitude, latitude] = feature.geometry.coordinates;
        if (longitude !== undefined && latitude !== undefined) bounds.extend([longitude, latitude]);
    }
    const height = map.getContainer().clientHeight;
    const width = map.getContainer().clientWidth;
    map.fitBounds(bounds, {
        padding: {
            top: Math.min(160, height * 0.2),
            bottom: Math.min(220, height * 0.3),
            left: width > 640 ? 320 : 40,
            right: 40
        },
        maxZoom: mapConfig.zoom,
        duration: 0,
    });
}

export function usePlacesMap(container: React.RefObject<HTMLDivElement | null>, data: PlacesGeoJson,
                             selectedId: string | null, onSelect: (id: string) => void, frameRegion: string | null) {
    const mapRef = useRef<Map | null>(null);
    const dataRef = useRef(data);
    const selectedRef = useRef<string | null>(null);
    const framedPlaces = useRef(false);
    const regionRef = useRef(frameRegion);
    const framedRegion = useRef<string | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [terrainUnavailable, setTerrainUnavailable] = useState(false);

    useEffect(() => {
        dataRef.current = data;
        regionRef.current = frameRegion;
        const source = mapRef.current?.getSource<GeoJSONSource>(placesSourceId);
        if (source) {
            void source.setData(data);
            if (mapRef.current && data.features.length > 0 && frameRegion !== null
                && (!framedPlaces.current || framedRegion.current !== frameRegion)) {
                framePlaces(mapRef.current, data);
                framedPlaces.current = true;
                framedRegion.current = frameRegion;
            }
        }
    }, [data, frameRegion]);

    useEffect(() => {
        const map = mapRef.current;
        if (map?.getSource(placesSourceId)) {
            if (selectedRef.current) map.setFeatureState({
                source: placesSourceId,
                id: selectedRef.current
            }, {selected: false});
            if (selectedId) map.setFeatureState({source: placesSourceId, id: selectedId}, {selected: true});
        }
        selectedRef.current = selectedId;
    }, [selectedId]);

    useEffect(() => {
        if (!container.current) return;
        let map: Map;
        let disposed = false;
        try {
            map = new Map({...mapConfig, container: container.current});
        } catch {
            queueMicrotask(() => {
                if (!disposed) setStatus('error');
            });
            return () => {
                disposed = true;
            };
        }
        mapRef.current = map;
        configureBasemapImages(map);
        map.addControl(new NavigationControl({showCompass: true, showZoom: true, visualizePitch: true}), 'top-right');

        function onLoad() {
            if (disposed) return;
            map.addSource(terrainSourceId, terrainSource);
            map.addSource(hillshadeSourceId, terrainSource);
            const firstLabel = map.getStyle().layers.find((layer) => layer.type === 'symbol');
            map.addLayer(hillshadeLayer, firstLabel?.id);
            map.setTerrain({source: terrainSourceId, exaggeration: 1});
            map.addSource(placesSourceId, {type: 'geojson', data: dataRef.current, promoteId: 'id'});
            map.addLayer(placesLayer);
            if (dataRef.current.features.length > 0 && !framedPlaces.current) {
                framePlaces(map, dataRef.current);
                framedPlaces.current = true;
                framedRegion.current = regionRef.current;
            }
            if (selectedRef.current) map.setFeatureState({
                source: placesSourceId,
                id: selectedRef.current
            }, {selected: true});
            setStatus('ready');
        }

        function onClick(event: MapLayerMouseEvent) {
            const id = event.features?.[0]?.id;
            if (typeof id === 'string') onSelect(id);
        }

        function onEnter() {
            map.getCanvas().style.cursor = 'pointer';
        }

        function onLeave() {
            map.getCanvas().style.cursor = '';
        }

        function onError(event: ErrorEvent) {
            if (disposed) return;
            if ('sourceId' in event && (event.sourceId === terrainSourceId || event.sourceId === hillshadeSourceId)) {
                map.setTerrain(null);
                if (map.getLayer(hillshadeLayerId)) map.setLayoutProperty(hillshadeLayerId, 'visibility', 'none');
                setTerrainUnavailable(true);
            } else {
                setStatus('error');
            }
        }

        map.on('load', onLoad);
        map.on('error', onError);
        map.on('click', placesLayerId, onClick);
        map.on('mouseenter', placesLayerId, onEnter);
        map.on('mouseleave', placesLayerId, onLeave);
        const resizeObserver = new ResizeObserver(() => map.resize());
        resizeObserver.observe(container.current);

        return () => {
            disposed = true;
            resizeObserver.disconnect();
            map.off('load', onLoad);
            map.off('error', onError);
            map.off('click', placesLayerId, onClick);
            map.off('mouseenter', placesLayerId, onEnter);
            map.off('mouseleave', placesLayerId, onLeave);
            map.remove();
            mapRef.current = null;
            framedPlaces.current = false;
        };
    }, [container, onSelect]);

    return {status, terrainUnavailable};
}
