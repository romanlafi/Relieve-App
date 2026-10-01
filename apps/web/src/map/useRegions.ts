import {useEffect, useState} from 'react';
import {z} from 'zod';
import type {Region} from '@relieve/shared';

const regionsSchema: z.ZodType<Region[]> = z.array(z.object({
    id: z.uuid(), name: z.string().min(1), slug: z.string().min(1),
    type: z.enum(['mountain_system', 'sector', 'massif', 'valley']), parentId: z.uuid().nullable(),
}));

export function useRegions() {
    const [regions, setRegions] = useState<Region[]>([]);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [version, setVersion] = useState(0);
    useEffect(() => {
        const controller = new AbortController();

        async function load() {
            try {
                const response = await fetch('/api/regions', {
                    signal: controller.signal,
                    headers: {Accept: 'application/json'}
                });
                if (!response.ok) throw new Error('Unable to load regions');
                const body = regionsSchema.parse(await response.json());
                if (!controller.signal.aborted) {
                    setRegions(body);
                    setStatus('ready');
                }
            } catch {
                if (!controller.signal.aborted) setStatus('error');
            }
        }

        void load();
        return () => controller.abort();
    }, [version]);

    function retry() {
        setStatus('loading');
        setVersion((current) => current + 1);
    }

    return {regions, status, retry};
}
