import {useEffect, useState} from 'react';
import type {FormEvent} from 'react';
import type {PlaceVisit} from '@relieve/shared';
import {placeVisitSchema, placeVisitsSchema} from './placeSchemas';
import * as styles from './PlacePersonalForm.css';

interface Props {
    placeId: string;
    onChanged: () => void;
}

export function PlaceVisitHistory({placeId, onChanged}: Props) {
    const [visits, setVisits] = useState<PlaceVisit[]>([]);
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        let active = true;
        setLoading(true);
        setLoadError(false);
        void fetch(`/api/user/places/${encodeURIComponent(placeId)}/visits`, {
            signal: controller.signal,
            headers: {Accept: 'application/json'},
        }).then(async (response) => {
            if (!response.ok) throw new Error('Unable to load visit history');
            const result = placeVisitsSchema.safeParse(await response.json());
            if (!result.success) throw new Error('Invalid visit history');
            if (active) setVisits(result.data);
        }).catch(() => {
            if (active && !controller.signal.aborted) setLoadError(true);
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => {
            active = false;
            controller.abort();
        };
    }, [placeId, retry]);

    async function addVisit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!date || busy) return;
        setBusy(true);
        setError(false);
        try {
            const response = await fetch(`/api/user/places/${encodeURIComponent(placeId)}/visits`, {
                method: 'POST',
                headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
                body: JSON.stringify({visitedAt: date}),
            });
            if (!response.ok) throw new Error('Unable to add visit');
            const visit = placeVisitSchema.parse(await response.json());
            if (visit.placeId !== placeId) throw new Error('Unexpected place ID');
            setVisits((current) => [visit, ...current.filter((item) => item.id !== visit.id)]
                .sort((left, right) => right.visitedAt.localeCompare(left.visitedAt)));
            setDate('');
            onChanged();
        } catch {
            setError(true);
        } finally {
            setBusy(false);
        }
    }

    async function removeVisit(visitId: string) {
        if (busy) return;
        setBusy(true);
        setError(false);
        try {
            const response = await fetch(`/api/user/places/${encodeURIComponent(placeId)}/visits/${encodeURIComponent(visitId)}`, {
                method: 'DELETE',
                headers: {Accept: 'application/json'},
            });
            if (!response.ok) throw new Error('Unable to delete visit');
            setVisits((current) => current.filter((visit) => visit.id !== visitId));
            onChanged();
        } catch {
            setError(true);
        } finally {
            setBusy(false);
        }
    }

    return <section className={styles.visitHistory} aria-labelledby="visit-history-heading">
        <h3 id="visit-history-heading" className={styles.visitHeading}>Historial de visitas</h3>
        {loading ? <p className={styles.message}>Cargando visitas…</p> : loadError
            ? <p className={styles.message} role="alert">No se ha podido cargar el historial.
                <button className={styles.button} type="button" onClick={() => setRetry((value) => value + 1)}>
                    Reintentar
                </button>
            </p> : visits.length === 0
                ? <p className={styles.message}>Aún no hay visitas con fecha.</p>
            : <ul className={styles.visitList}>
                {visits.map((visit) => <li className={styles.visitItem} key={visit.id}>
                    <span>{new Date(`${visit.visitedAt}T12:00:00`).toLocaleDateString('es-ES', {dateStyle: 'long'})}</span>
                    <button className={styles.button} type="button" disabled={busy}
                            aria-label={`Eliminar visita del ${visit.visitedAt}`}
                            onClick={() => void removeVisit(visit.id)}>Eliminar</button>
                </li>)}
            </ul>}
        <form className={styles.visitItem} onSubmit={(event) => void addVisit(event)}>
            <label className={`${styles.field} ${styles.visitDateField}`}>Añadir fecha
                <input className={styles.control} type="date" value={date} required disabled={busy || loading}
                       onChange={(event) => setDate(event.target.value)}/>
            </label>
            <button className={styles.button} type="submit" disabled={busy || loading || !date}>Añadir visita</button>
        </form>
        {error && <p className={styles.message} role="alert">No se ha podido actualizar el historial. Inténtalo de nuevo.</p>}
    </section>;
}
