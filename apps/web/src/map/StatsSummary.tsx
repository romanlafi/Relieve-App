import {useEffect, useState} from 'react';
import {z} from 'zod';
import type {PersonalStats} from '@relieve/shared';
import * as styles from './MapView.css';

const count = z.number().int().nonnegative();
const statsSchema: z.ZodType<PersonalStats> = z.object({
    total: count, visited: count, pending: count, favorites: count,
    threeThousands: z.object({total: count, visited: count}),
    byType: z.array(z.object({
        type: z.enum(['peak', 'lake', 'hut', 'pass', 'viewpoint']),
        total: count,
        visited: count
    })),
    byRegion: z.array(z.object({
        id: z.uuid(), name: z.string(), slug: z.string(),
        type: z.enum(['mountain_system', 'sector', 'massif', 'valley']),
        total: count, visited: count, pending: count, favorites: count,
    })),
    byYear: z.array(z.object({year: z.number().int(), visited: count})),
    highestPeak: z.object({id: z.uuid(), name: z.string(), elevation: z.number()}).nullable(),
});
const labels = {peak: 'Picos', lake: 'Ibones', hut: 'Refugios', pass: 'Collados', viewpoint: 'Miradores'};
const regionLabels = {mountain_system: 'Sistema montañoso', sector: 'Sector', massif: 'Macizo', valley: 'Valle'};

export function StatsSummary({version}: { version: number }) {
    const [stats, setStats] = useState<PersonalStats | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        const controller = new AbortController();

        async function load() {
            try {
                const response = await fetch('/api/stats', {
                    signal: controller.signal,
                    headers: {Accept: 'application/json'}
                });
                if (!response.ok) throw new Error('Unable to load stats');
                const result = statsSchema.parse(await response.json());
                if (!controller.signal.aborted) {
                    setStats(result);
                    setStatus('ready');
                }
            } catch {
                if (!controller.signal.aborted) setStatus('error');
            }
        }

        void load();
        return () => controller.abort();
    }, [version, retry]);
    return <details className={styles.section}>
        <summary className={styles.summary}>Mi
            progreso{status === 'ready' && stats ? ` · ${stats.visited} / ${stats.total}` : ''}</summary>
        <div className={styles.stack} aria-live="polite">
            {status === 'loading' && <p className={styles.muted}>Cargando progreso…</p>}
            {status === 'error' && <p className={styles.muted}>No se ha podido actualizar el progreso.
                <button className={styles.button} type="button" onClick={() => {
                    setStatus('loading');
                    setRetry((value) => value + 1);
                }}>Reintentar</button></p>}
            {status === 'ready' && stats && <>
                <p className={styles.muted}>Sobre los {stats.total} lugares del catálogo completo, sin aplicar los
                    filtros del mapa.</p>
                {stats.byType.map((row) => <div className={styles.progressRow} key={row.type}>
                    <span>{labels[row.type]}</span><span>{row.visited} / {row.total}</span>
                    <progress className={styles.progress} aria-label={`${labels[row.type]} visitados`}
                              value={row.visited} max={Math.max(1, row.total)}/>
                </div>)}
                <p className={styles.muted}>{stats.pending} pendientes · {stats.favorites} favoritos</p>
                <p className={styles.muted}>Tresmiles con cota
                    conocida: {stats.threeThousands.visited} / {stats.threeThousands.total}</p>
                <p className={styles.muted}>{stats.highestPeak
                    ? `Pico más alto visitado: ${stats.highestPeak.name} · ${stats.highestPeak.elevation.toLocaleString('es-ES')} m`
                    : 'Todavía no has registrado un pico con altitud conocida como visitado.'}</p>
                <details>
                    <summary>Progreso por región y macizo</summary>
                    <p className={styles.muted}>Cada zona incluye sus regiones descendientes; los totales pueden solaparse.</p>
                    {stats.byRegion.map((region) => <div className={styles.progressRow} key={region.id}>
                        <span>{region.name} · {regionLabels[region.type]}</span>
                        <span>{region.visited} / {region.total}</span>
                        <progress className={styles.progress} aria-label={`${region.name}: lugares visitados`}
                                  value={region.visited} max={Math.max(1, region.total)}/>
                    </div>)}
                </details>
                <details>
                    <summary>Lugares visitados por año</summary>
                    <p className={styles.muted}>Cuenta las visitas registradas, incluidas las repetidas al mismo lugar.</p>
                    {stats.byYear.length === 0
                        ? <p className={styles.muted}>Aún no hay visitas con fecha registrada.</p>
                        : stats.byYear.map((row) => <p className={styles.muted} key={row.year}>
                            {row.year}: {row.visited} {row.visited === 1 ? 'visita' : 'visitas'}
                        </p>)}
                </details>
            </>}
        </div>
    </details>;
}
