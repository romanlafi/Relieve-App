import {useEffect, useRef, useState} from 'react';
import type {NearbyRoutePlace, RouteDetail, RouteSummary} from '@relieve/shared';
import {nearbyPlacesSchema, routeDetailSchema, routeSummarySchema} from './routeSchemas';
import {userPlaceSchema} from '../map/placeSchemas';

async function request(url: string, init?: RequestInit): Promise<unknown> {
    const response = await fetch(url, init);
    if (!response.ok) throw new Error('No se ha podido completar la operación. Vuelve a intentarlo.');
    return response.status === 204 ? null : response.json();
}
export function useRoutes(onVisitsChanged: () => void) {
    const [routes, setRoutes] = useState<RouteSummary[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detail, setDetail] = useState<RouteDetail | null>(null);
    const [nearby, setNearby] = useState<NearbyRoutePlace[]>([]);
    const [version, setVersion] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const uploadRef = useRef<XMLHttpRequest | null>(null);
    const mutationLock = useRef(false);
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; uploadRef.current?.abort(); };
    }, []);
    useEffect(() => {
        const controller = new AbortController();
        void request('/api/routes', {signal: controller.signal})
            .then((body) => { setRoutes(routeSummarySchema.array().parse(body)); setLoading(false); })
            .catch(() => { if (!controller.signal.aborted) { setMessage('No se han podido cargar las rutas.'); setLoading(false); } });
        return () => controller.abort();
    }, [version]);
    useEffect(() => {
        if (!selectedId) return;
        const controller = new AbortController();
        void Promise.all([
            request(`/api/routes/${selectedId}`, {signal: controller.signal}),
            request(`/api/routes/${selectedId}/nearby-places`, {signal: controller.signal}),
        ]).then(([route, places]) => {
            if (controller.signal.aborted) return;
            setDetail(routeDetailSchema.parse(route)); setNearby(nearbyPlacesSchema.parse(places)); setLoadingDetail(false);
        }).catch(() => { if (!controller.signal.aborted) { setMessage('No se ha podido cargar el detalle de la ruta.'); setLoadingDetail(false); } });
        return () => controller.abort();
    }, [selectedId, version]);
    function select(id: string | null) {
        setSelectedId(id); setDetail(null); setNearby([]); setMessage(''); setLoadingDetail(Boolean(id));
    }
    async function upload(file: File, name: string) {
        if (mutationLock.current) return;
        if (!/\.gpx$/i.test(file.name) || file.size > 5 * 1024 * 1024) {
            setMessage('Selecciona un GPX de hasta 5 MiB.'); return;
        }
        mutationLock.current = true;
        setBusy(true); setMessage(''); setProgress(0);
        try {
            const body = new FormData(); body.append('file', file); if (name.trim()) body.append('name', name.trim());
            const result = await new Promise<unknown>((resolve, reject) => {
                const xhr = new XMLHttpRequest(); uploadRef.current = xhr;
                xhr.open('POST', '/api/routes'); xhr.responseType = 'json'; xhr.timeout = 120000;
                xhr.upload.onprogress = (event) => { if (mounted.current && event.lengthComputable) setProgress(Math.round(event.loaded / event.total * 100)); };
                xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve(xhr.response)
                    : reject(new Error(xhr.response?.error?.message ?? 'No se ha podido importar el GPX.'));
                xhr.onerror = xhr.ontimeout = xhr.onabort = () => reject(new Error('No se ha podido importar el GPX.'));
                xhr.send(body);
            });
            if (!mounted.current) return;
            const route = routeDetailSchema.parse(result);
            select(route.id); setVersion((v) => v + 1);
        } catch (error) { if (mounted.current) setMessage(error instanceof Error ? error.message : 'GPX no válido.'); }
        finally { mutationLock.current = false; if (mounted.current) { setBusy(false); setProgress(null); } uploadRef.current = null; }
    }
    async function remove() {
        if (!selectedId || mutationLock.current) return;
        mutationLock.current = true;
        setBusy(true); setMessage('');
        try {
            await request(`/api/routes/${selectedId}`, {method: 'DELETE'});
            if (!mounted.current) return;
            select(null); setVersion((v) => v + 1); setMessage('Ruta eliminada. Tus visitas se conservan.');
        } catch { if (mounted.current) setMessage('No se ha podido eliminar la ruta.'); }
        finally { mutationLock.current = false; if (mounted.current) setBusy(false); }
    }
    async function confirm(placeIds: string[], useActivityDate: boolean): Promise<boolean> {
        if (!selectedId || mutationLock.current || !placeIds.length) return false;
        mutationLock.current = true;
        setBusy(true); setMessage('');
        try {
            userPlaceSchema.array().parse(await request(`/api/routes/${selectedId}/confirm-places`, {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({placeIds, useActivityDate}),
            }));
            if (!mounted.current) return false;
            onVisitsChanged(); setVersion((v) => v + 1);
            setMessage('Visitas guardadas. Las fechas ya registradas se han conservado.');
            return true;
        } catch { if (mounted.current) setMessage('No se han podido confirmar las visitas.'); return false; }
        finally { mutationLock.current = false; if (mounted.current) setBusy(false); }
    }
    return {routes, selectedId, detail, nearby, loading, loadingDetail, busy, progress, message, select, upload, remove, confirm,
        retry: () => { setMessage(''); setLoading(true); setVersion((v) => v + 1); }};
}
