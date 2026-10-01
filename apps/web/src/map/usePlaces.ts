import {useEffect, useState} from 'react';
import {z} from 'zod';
import type {Place} from '@relieve/shared';

const placesSchema: z.ZodType<Place[]> = z.array(z.object({
    id: z.uuid(),
    name: z.string().min(1),
    slug: z.string().min(1),
    type: z.enum(['peak', 'lake', 'hut', 'pass', 'viewpoint']),
    elevation: z.number().finite().nullable(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
}));

type PlacesState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'success'; places: Place[] };

export function usePlaces() {
    const [state, setState] = useState<PlacesState>({status: 'loading'});
    const [requestVersion, setRequestVersion] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        async function load() {
            try {
                const response = await fetch('/api/places', {
                    signal: controller.signal,
                    headers: {Accept: 'application/json'},
                });
                if (!response.ok) throw new Error('No se han podido cargar los lugares. Comprueba la API y vuelve a intentarlo.');
                const body: unknown = await response.json();
                const parsed = placesSchema.safeParse(body);
                if (!parsed.success) {
                    if (active) setState({status: 'error', message: 'La API ha devuelto datos de lugares no válidos.'});
                    return;
                }
                if (active) setState({status: 'success', places: parsed.data});
            } catch {
                if (active && !controller.signal.aborted) {
                    setState({
                        status: 'error',
                        message: 'No se han podido cargar los lugares. Comprueba la API y vuelve a intentarlo.'
                    });
                }
            }
        }

        void load();
        return () => {
            active = false;
            controller.abort();
        };
    }, [requestVersion]);

    function retry() {
        setState({status: 'loading'});
        setRequestVersion((version) => version + 1);
    }

    return {state, retry};
}
