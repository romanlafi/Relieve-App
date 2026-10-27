import {useState} from 'react';
import type {useRoutes} from './useRoutes';
import * as styles from '../map/MapView.css';
import * as routeStyles from './RoutesPanel.css';
import {Icon} from '../ui/Icon';

export function RoutesPanel({state}: {state: ReturnType<typeof useRoutes>}) {
    const [file, setFile] = useState<File | null>(null);
    const [name, setName] = useState('');
    const [selected, setSelected] = useState<string[]>([]);
    const [useDate, setUseDate] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState(false);
    const route = state.detail;
    const meters = (value: number | null) => value === null ? 'Sin datos' : `${Math.round(value).toLocaleString('es-ES')} m`;
    return <section className={styles.section} aria-label="Rutas GPX">
        <h2 className={routeStyles.heading}>Rutas</h2>
        <details open={!route}>
            <summary className={styles.summary}><Icon name="upload" size={17}/>Importar GPX</summary>
        <form className={styles.stack} onSubmit={(event) => { event.preventDefault(); if (file) void state.upload(file, name); }}>
            <label htmlFor="gpx-file">Importar un recorrido GPX</label>
            <input className={styles.select} id="gpx-file" type="file" accept=".gpx" disabled={state.busy}
                   onChange={(event) => setFile(event.target.files?.[0] ?? null)}/>
            <p className={styles.muted}>Hasta 5 MiB y 50.000 puntos.</p>
            <label htmlFor="route-name">Nombre opcional</label>
            <input className={styles.select} id="route-name" maxLength={200} value={name} disabled={state.busy}
                   onChange={(event) => setName(event.target.value)}/>
            <button className={styles.primaryButton} disabled={!file || state.busy}><Icon name="upload" size={16}/>Importar GPX</button>
        </form>
        </details>
        {state.progress !== null && <div className={styles.stack} role="status">
            <progress max={100} value={state.progress} aria-label="Subida de GPX"/>
            <span>{state.progress < 100 ? `Subiendo: ${state.progress}%` : 'Procesando GPX…'}</span>
        </div>}
        {state.message && <p role="status">{state.message}</p>}
        {state.loading ? <p role="status">Cargando rutas…</p> : <div className={styles.stack}>
            <label htmlFor="route-picker">{state.routes.length} rutas importadas</label>
            <select className={styles.select} id="route-picker" value={state.selectedId ?? ''} disabled={state.busy}
                    onChange={(event) => { state.select(event.target.value || null); setSelected([]); setUseDate(false); setDeleteConfirmation(false); }}>
                <option value="">Selecciona una ruta</option>
                {state.routes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
        </div>}
        <button className={styles.button} type="button" disabled={state.busy} onClick={state.retry}><Icon name="refresh" size={16}/>Actualizar rutas</button>
        {state.loadingDetail && <p role="status">Cargando recorrido y lugares…</p>}
        {route && <div className={styles.stack}>
            <h3 className={routeStyles.heading}>{route.name}</h3>
            <dl className={styles.metadata}>
                <dt>Distancia</dt><dd>{(route.distanceMeters / 1000).toLocaleString('es-ES', {maximumFractionDigits: 2})} km</dd>
                <dt>Desnivel + / −</dt><dd>{meters(route.elevationGainMeters)} / {meters(route.elevationLossMeters)}</dd>
                <dt>Altitud mín. / máx.</dt><dd>{meters(route.minElevationMeters)} / {meters(route.maxElevationMeters)}</dd>
                <dt>Fecha (UTC)</dt><dd>{route.activityDate ?? 'Sin datos'}</dd>
                <dt>Duración total</dt><dd>{route.durationSeconds === null ? 'Sin datos' : `${Math.floor(route.durationSeconds / 3600)} h ${Math.floor(route.durationSeconds % 3600 / 60)} min`}</dd>
            </dl>
            <h3 className={routeStyles.heading}>Lugares detectados en esta ruta</h3>
            <p className={styles.muted}>A menos de 100 m. Pasar cerca no garantiza haber visitado el lugar: selecciona solo los que reconozcas.</p>
            <div className={routeStyles.detected}>
                {state.nearby.map((item) => <label className={routeStyles.place} key={item.place.id}>
                    <input id={`route-place-${item.place.id}`} type="checkbox" disabled={state.busy || item.userState?.status === 'visited'}
                           checked={selected.includes(item.place.id) || item.userState?.status === 'visited'}
                           onChange={(event) => setSelected((ids) => event.target.checked ? [...ids, item.place.id] : ids.filter((id) => id !== item.place.id))}/>
                    <span>{item.place.name}{item.userState?.status === 'visited' && ' · Visitado'}</span>
                    <span>{Math.round(item.distanceFromRoute)} m</span>
                </label>)}
            </div>
            {!state.nearby.length && <p className={styles.muted}>No hay lugares del catálogo a menos de 100 m.</p>}
            {route.activityDate && <label className={routeStyles.place}>
                <input id="route-use-date" type="checkbox" checked={useDate} disabled={state.busy} onChange={(event) => setUseDate(event.target.checked)}/>
                <span>Usar {route.activityDate} como fecha de visita (UTC)</span>
            </label>}
            <p className={styles.muted}>Las visitas existentes conservarán su fecha.</p>
            <button className={styles.button} type="button" disabled={state.busy || !selected.length}
                    onClick={() => { void state.confirm(selected, useDate).then((saved) => { if (saved) setSelected([]); }); }}>Marcar seleccionados como visitados</button>
            {deleteConfirmation ? <div className={styles.stack}>
                <p>¿Eliminar esta ruta? Tus visitas se conservarán.</p>
                <button className={styles.button} type="button" disabled={state.busy} onClick={() => { void state.remove(); setDeleteConfirmation(false); }}>Confirmar eliminación</button>
                <button className={styles.button} type="button" disabled={state.busy} onClick={() => setDeleteConfirmation(false)}>Cancelar</button>
            </div> : <button className={styles.button} type="button" disabled={state.busy} onClick={() => setDeleteConfirmation(true)}>Eliminar ruta</button>}
        </div>}
    </section>;
}
